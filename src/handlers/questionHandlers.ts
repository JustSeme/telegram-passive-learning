import prisma from '../database';
import { generateQuestion } from '../services/openaiService';
import { createMessageChain } from '../services/messageCleanupService';
import { logger } from '../utils/logger';
import { TelegramContext, Question, QuestionType } from '../types';

async function handleGetQuestion(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user || !user.field) {
      logger.warn(`User ${telegramId} tried to get question but profile not complete`);
      await ctx.reply(
        '❌ *Сначала настройте профиль*\\n\\n' +
        'Используйте /start для начала работы с ботом.',
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    // Generate new question
    logger.info(`Generating question for user ${telegramId} in field: ${user.field}`);
    const questionData = await generateQuestion(user.field);
    
    // Save question to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const question = await prisma.question.create({
      data: {
        telegramId,
        type: questionData.type,
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        field: questionData.field,
        expiresAt
      }
    });

    logger.info(`Question ${question.id} created for user ${telegramId}`);
    // Send question to user
    await sendQuestion(ctx, question);
  } catch (error) {
    logger.error(`Error in handleGetQuestion for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка при генерации вопроса. Попробуйте позже.');
  }
}

async function sendQuestion(ctx: TelegramContext, question: Question): Promise<void> {
  const telegramId = ctx.from.id.toString();
  let messageText = `❓ *Вопрос:*\\n\\n${question.question}`;
  let replyMarkup: any = {};

  try {
    switch (question.type) {
      case QuestionType.SINGLE_CHOICE:
        const options = JSON.parse(question.options!);
        const keyboard = options.map((option: string, index: number) => [{
          text: option,
          callback_data: `answer_${question.id}_${index}`
        }]);

        replyMarkup = {
          inline_keyboard: [
            ...keyboard,
            [{ text: '💡 Показать объяснение', callback_data: `get_explanation_${question.id}` }]
          ]
        };
        break;

      case QuestionType.MULTI_CHOICE:
        const multiOptions = JSON.parse(question.options!);
        const multiKeyboard = multiOptions.map((option: string, index: number) => [{
          text: option,
          callback_data: `answer_multi_${question.id}_${index}`
        }]);

        replyMarkup = {
          inline_keyboard: [
            ...multiKeyboard,
            [{ text: '✅ Готово', callback_data: `submit_multi_${question.id}` }],
            [{ text: '💡 Показать объяснение', callback_data: `get_explanation_${question.id}` }]
          ]
        };
        break;

      case QuestionType.TEXT_INPUT:
        messageText += '\\n\\n💬 *Напишите ваш ответ текстом:*';
        replyMarkup = {
          inline_keyboard: [
            [{ text: '💡 Показать объяснение', callback_data: `get_explanation_${question.id}` }]
          ]
        };
        break;
    }

    const sentMessage = await ctx.reply(messageText, {
      parse_mode: 'MarkdownV2',
      reply_markup: replyMarkup
    });

    // Store message for cleanup
    await createMessageChain(telegramId, question.id, [sentMessage.message_id]);
    
    // Store current question in session for text answers
    if (question.type === QuestionType.TEXT_INPUT) {
      ctx.session = ctx.session || {};
      ctx.session.currentQuestionId = question.id;
    }
  } catch (error) {
    logger.error(`Error sending question ${question.id} to user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка при отправке вопроса.');
  }
}

async function handleAnswer(ctx: TelegramContext): Promise<void> {
  const callbackData = ctx.callbackQuery?.data;
  const telegramId = ctx.from.id.toString();

  try {
    if (callbackData?.startsWith('answer_multi_')) {
      await handleMultiChoiceAnswer(ctx);
    } else if (callbackData?.startsWith('submit_multi_')) {
      await submitMultiChoiceAnswer(ctx);
    } else {
      await handleSingleChoiceAnswer(ctx);
    }
  } catch (error) {
    logger.error(`Error in handleAnswer for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка при обработке ответа.');
  }
}

async function handleSingleChoiceAnswer(ctx: TelegramContext): Promise<void> {
  const callbackData = ctx.callbackQuery!.data;
  const telegramId = ctx.from.id.toString();
  const [, questionId, answerIndex] = callbackData.split('_');

  const question = await prisma.question.findUnique({
    where: { id: parseInt(questionId) }
  });

  if (!question) {
    logger.warn(`Question ${questionId} not found for user ${telegramId}`);
    await ctx.reply('Вопрос не найден.');
    return;
  }

  const options = JSON.parse(question.options!);
  const userAnswer = options[parseInt(answerIndex)];
  const isCorrect = userAnswer === question.correctAnswer;

  // Save answer
  await prisma.answer.create({
    data: {
      telegramId,
      questionId: parseInt(questionId),
      userAnswer: JSON.stringify(userAnswer),
      isCorrect
    }
  });

  logger.info(`User ${telegramId} answered question ${questionId}. Correct: ${isCorrect}`);

  // Send result
  const resultText = isCorrect 
    ? '✅ *Правильно!*\\n\\nОтличный ответ!'
    : `❌ *Неправильно*\\n\\nПравильный ответ: ${question.correctAnswer}`;

  const resultMessage = await ctx.reply(resultText, {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💡 Показать объяснение', callback_data: `get_explanation_${questionId}` }]
      ]
    }
  });

  // Schedule message cleanup
  await scheduleMessageCleanup(telegramId, parseInt(questionId), [resultMessage.message_id]);
}

async function handleMultiChoiceAnswer(ctx: TelegramContext): Promise<void> {
  const callbackData = ctx.callbackQuery!.data;
  const [, questionId, answerIndex] = callbackData.split('_');

  ctx.session = ctx.session || {};
  ctx.session.multiAnswers = ctx.session.multiAnswers || [];
  ctx.session.currentQuestionId = parseInt(questionId);

  const answerIndexInt = parseInt(answerIndex);
  const answerIndexPos = ctx.session.multiAnswers.indexOf(answerIndexInt);

  if (answerIndexPos > -1) {
    ctx.session.multiAnswers.splice(answerIndexPos, 1);
  } else {
    ctx.session.multiAnswers.push(answerIndexInt);
  }

  // Update keyboard to show selected answers
  const question = await prisma.question.findUnique({
    where: { id: parseInt(questionId) }
  });

  if (!question) return;

  const options = JSON.parse(question.options!);
  const keyboard = options.map((option: string, index: number) => {
    const isSelected = ctx.session!.multiAnswers!.includes(index);
    return [{
      text: `${isSelected ? '✅ ' : ''}${option}`,
      callback_data: `answer_multi_${questionId}_${index}`
    }];
  });

  await ctx.editMessageReplyMarkup?.({
    inline_keyboard: [
      ...keyboard,
      [{ text: '✅ Готово', callback_data: `submit_multi_${questionId}` }],
      [{ text: '💡 Показать объяснение', callback_data: `get_explanation_${questionId}` }]
    ]
  });
}

async function submitMultiChoiceAnswer(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();
  const questionId = ctx.session!.currentQuestionId;
  const selectedIndexes = ctx.session!.multiAnswers || [];

  const question = await prisma.question.findUnique({
    where: { id: questionId }
  });

  if (!question) {
    logger.warn(`Question ${questionId} not found for user ${telegramId}`);
    await ctx.reply('Вопрос не найден.');
    return;
  }

  const options = JSON.parse(question.options!);
  const correctAnswers = JSON.parse(question.correctAnswer);
  
  const userAnswers = selectedIndexes.map(index => options[index]);
  const isCorrect = arraysEqual(userAnswers.sort(), correctAnswers.sort());

  // Save answer
  await prisma.answer.create({
    data: {
      telegramId,
      questionId,
      userAnswer: JSON.stringify(userAnswers),
      isCorrect
    }
  });

  logger.info(`User ${telegramId} submitted multi-choice answer for question ${questionId}. Correct: ${isCorrect}`);

  // Send result
  const resultText = isCorrect 
    ? '✅ *Правильно!*\\n\\nОтличный ответ!'
    : `❌ *Неправильно*\\n\\nПравильные ответы: ${correctAnswers.join(', ')}`;

  const resultMessage = await ctx.reply(resultText, {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💡 Показать объяснение', callback_data: `get_explanation_${questionId}` }]
      ]
    }
  });

  // Clear session
  ctx.session!.multiAnswers = [];
  ctx.session!.currentQuestionId = undefined;

  // Schedule message cleanup
  await scheduleMessageCleanup(telegramId, questionId, [resultMessage.message_id]);
}

async function handleTextAnswer(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();
  const userAnswer = ctx.message?.text;

  if (!ctx.session || !ctx.session.currentQuestionId) {
    return; // Not expecting a text answer
  }

  const questionId = ctx.session.currentQuestionId;

  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      logger.warn(`Question ${questionId} not found for user ${telegramId}`);
      await ctx.reply('Вопрос не найден.');
      return;
    }

    const isCorrect = userAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

    // Save answer
    await prisma.answer.create({
      data: {
        telegramId,
        questionId,
        userAnswer: JSON.stringify(userAnswer),
        isCorrect: isCorrect || false
      }
    });

    logger.info(`User ${telegramId} answered text question ${questionId}. Correct: ${isCorrect}`);

    // Send result
    const resultText = isCorrect 
      ? '✅ *Правильно!*\\n\\nОтличный ответ!'
      : `❌ *Неправильно*\\n\\nПравильный ответ: ${question.correctAnswer}`;

    const resultMessage = await ctx.reply(resultText, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💡 Показать объяснение', callback_data: `get_explanation_${questionId}` }]
        ]
      }
    });

    // Clear session
    ctx.session.currentQuestionId = undefined;

    // Schedule message cleanup
    await scheduleMessageCleanup(telegramId, questionId, [resultMessage.message_id]);
  } catch (error) {
    logger.error(`Error in handleTextAnswer for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка при обработке ответа.');
  }
}

async function handleGetExplanation(ctx: TelegramContext): Promise<void> {
  const callbackData = ctx.callbackQuery?.data;
  
  if (!callbackData) return;

  let questionId: string;
  
  if (callbackData === 'get_explanation') {
    // This is a generic explanation request, we need to get the current question from session
    questionId = ctx.session?.currentQuestionId?.toString() || '';
  } else {
    [, questionId] = callbackData.split('_');
  }

  try {
    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) }
    });

    if (!question) {
      logger.warn(`Question ${questionId} not found for explanation`);
      await ctx.reply('Вопрос не найден.');
      return;
    }

    const explanationText = `💡 *Объяснение:*\\n\\n${question.explanation}`;
    
    logger.info(`User ${ctx.from.id} requested explanation for question ${questionId}`);
    await ctx.reply(explanationText, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logger.error(`Error in handleGetExplanation for user ${ctx.from.id}:`, error);
    ctx.reply('Произошла ошибка при загрузке объяснения.');
  }
}

async function scheduleMessageCleanup(telegramId: string, questionId: number, messageIds: number[]): Promise<void> {
  const scheduledDeleteAt = new Date();
  scheduledDeleteAt.setSeconds(scheduledDeleteAt.getSeconds() + 20);

  await createMessageChain(telegramId, questionId, messageIds, scheduledDeleteAt);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export default {
  handleGetQuestion,
  handleAnswer,
  handleTextAnswer,
  handleGetExplanation,
  sendQuestion
};
