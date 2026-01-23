"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../database"));
const openaiService_1 = require("../services/openaiService");
const messageCleanupService_1 = require("../services/messageCleanupService");
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
async function handleGetQuestion(ctx) {
    const telegramId = ctx.from.id.toString();
    try {
        const user = await database_1.default.user.findUnique({
            where: { telegramId }
        });
        if (!user || !user.field) {
            logger_1.logger.warn(`User ${telegramId} tried to get question but profile not complete`);
            await ctx.reply('❌ *Сначала настройте профиль*\\n\\n' +
                'Используйте /start для начала работы с ботом.', { parse_mode: 'MarkdownV2' });
            return;
        }
        logger_1.logger.info(`Generating question for user ${telegramId} in field: ${user.field}`);
        const questionData = await (0, openaiService_1.generateQuestion)(user.field);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const result = await database_1.default.question.create({
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
        const question = result;
        logger_1.logger.info(`Question ${question.id} created for user ${telegramId}`);
        await sendQuestion(ctx, question);
    }
    catch (error) {
        logger_1.logger.error(`Error in handleGetQuestion for user ${telegramId}:`, error);
        ctx.reply('Произошла ошибка при генерации вопроса. Попробуйте позже.');
    }
}
async function sendQuestion(ctx, question) {
    const telegramId = ctx.from.id.toString();
    let messageText = `❓ *Вопрос:*\\n\\n${question.question}`;
    let replyMarkup = {};
    try {
        switch (question.type) {
            case types_1.QuestionType.SINGLE_CHOICE:
                const options = JSON.parse(question.options);
                const keyboard = options.map((option, index) => [{
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
            case types_1.QuestionType.MULTI_CHOICE:
                const multiOptions = JSON.parse(question.options);
                const multiKeyboard = multiOptions.map((option, index) => [{
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
            case types_1.QuestionType.TEXT_INPUT:
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
        await (0, messageCleanupService_1.createMessageChain)(telegramId, question.id, [sentMessage.message_id]);
        if (question.type === types_1.QuestionType.TEXT_INPUT) {
            ctx.session = ctx.session || {};
            ctx.session.currentQuestionId = question.id;
        }
    }
    catch (error) {
        logger_1.logger.error(`Error sending question ${question.id} to user ${telegramId}:`, error);
        ctx.reply('Произошла ошибка при отправке вопроса.');
    }
}
async function handleAnswer(ctx) {
    const callbackData = ctx.callbackQuery?.data;
    const telegramId = ctx.from.id.toString();
    try {
        if (callbackData?.startsWith('answer_multi_')) {
            await handleMultiChoiceAnswer(ctx);
        }
        else if (callbackData?.startsWith('submit_multi_')) {
            await submitMultiChoiceAnswer(ctx);
        }
        else {
            await handleSingleChoiceAnswer(ctx);
        }
    }
    catch (error) {
        logger_1.logger.error(`Error in handleAnswer for user ${telegramId}:`, error);
        ctx.reply('Произошла ошибка при обработке ответа.');
    }
}
async function handleSingleChoiceAnswer(ctx) {
    const callbackData = ctx.callbackQuery.data;
    const telegramId = ctx.from.id.toString();
    const [, questionId, answerIndex] = callbackData.split('_');
    const question = await database_1.default.question.findUnique({
        where: { id: parseInt(questionId) }
    });
    if (!question) {
        logger_1.logger.warn(`Question ${questionId} not found for user ${telegramId}`);
        await ctx.reply('Вопрос не найден.');
        return;
    }
    const options = JSON.parse(question.options);
    const userAnswer = options[parseInt(answerIndex)];
    const isCorrect = userAnswer === question.correctAnswer;
    await database_1.default.answer.create({
        data: {
            telegramId,
            questionId: parseInt(questionId),
            userAnswer: JSON.stringify(userAnswer),
            isCorrect
        }
    });
    logger_1.logger.info(`User ${telegramId} answered question ${questionId}. Correct: ${isCorrect}`);
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
    await scheduleMessageCleanup(telegramId, parseInt(questionId), [resultMessage.message_id]);
}
async function handleMultiChoiceAnswer(ctx) {
    const callbackData = ctx.callbackQuery.data;
    const [, questionId, answerIndex] = callbackData.split('_');
    ctx.session = ctx.session || {};
    ctx.session.multiAnswers = ctx.session.multiAnswers || [];
    ctx.session.currentQuestionId = parseInt(questionId);
    const answerIndexInt = parseInt(answerIndex);
    const answerIndexPos = ctx.session.multiAnswers.indexOf(answerIndexInt);
    if (answerIndexPos > -1) {
        ctx.session.multiAnswers.splice(answerIndexPos, 1);
    }
    else {
        ctx.session.multiAnswers.push(answerIndexInt);
    }
    const question = await database_1.default.question.findUnique({
        where: { id: parseInt(questionId) }
    });
    if (!question)
        return;
    const options = JSON.parse(question.options);
    const keyboard = options.map((option, index) => {
        const isSelected = ctx.session.multiAnswers.includes(index);
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
async function submitMultiChoiceAnswer(ctx) {
    const telegramId = ctx.from.id.toString();
    const questionId = ctx.session.currentQuestionId;
    const selectedIndexes = ctx.session.multiAnswers || [];
    const question = await database_1.default.question.findUnique({
        where: { id: questionId }
    });
    if (!question) {
        logger_1.logger.warn(`Question ${questionId} not found for user ${telegramId}`);
        await ctx.reply('Вопрос не найден.');
        return;
    }
    const options = JSON.parse(question.options);
    const correctAnswers = JSON.parse(question.correctAnswer);
    const userAnswers = selectedIndexes.map(index => options[index]);
    const isCorrect = arraysEqual(userAnswers.sort(), correctAnswers.sort());
    await database_1.default.answer.create({
        data: {
            telegramId,
            questionId,
            userAnswer: JSON.stringify(userAnswers),
            isCorrect
        }
    });
    logger_1.logger.info(`User ${telegramId} submitted multi-choice answer for question ${questionId}. Correct: ${isCorrect}`);
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
    ctx.session.multiAnswers = [];
    ctx.session.currentQuestionId = undefined;
    await scheduleMessageCleanup(telegramId, questionId, [resultMessage.message_id]);
}
async function handleTextAnswer(ctx) {
    const telegramId = ctx.from.id.toString();
    const userAnswer = ctx.message?.text;
    if (!ctx.session || !ctx.session.currentQuestionId) {
        return;
    }
    const questionId = ctx.session.currentQuestionId;
    try {
        const question = await database_1.default.question.findUnique({
            where: { id: questionId }
        });
        if (!question) {
            logger_1.logger.warn(`Question ${questionId} not found for user ${telegramId}`);
            await ctx.reply('Вопрос не найден.');
            return;
        }
        const isCorrect = userAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
        await database_1.default.answer.create({
            data: {
                telegramId,
                questionId,
                userAnswer: JSON.stringify(userAnswer),
                isCorrect: isCorrect || false
            }
        });
        logger_1.logger.info(`User ${telegramId} answered text question ${questionId}. Correct: ${isCorrect}`);
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
        ctx.session.currentQuestionId = undefined;
        await scheduleMessageCleanup(telegramId, questionId, [resultMessage.message_id]);
    }
    catch (error) {
        logger_1.logger.error(`Error in handleTextAnswer for user ${telegramId}:`, error);
        ctx.reply('Произошла ошибка при обработке ответа.');
    }
}
async function handleGetExplanation(ctx) {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData)
        return;
    let questionId;
    if (callbackData === 'get_explanation') {
        questionId = ctx.session?.currentQuestionId?.toString() || '';
    }
    else {
        [, questionId] = callbackData.split('_');
    }
    try {
        const question = await database_1.default.question.findUnique({
            where: { id: parseInt(questionId) }
        });
        if (!question) {
            logger_1.logger.warn(`Question ${questionId} not found for explanation`);
            await ctx.reply('Вопрос не найден.');
            return;
        }
        const explanationText = `💡 *Объяснение:*\\n\\n${question.explanation}`;
        logger_1.logger.info(`User ${ctx.from.id} requested explanation for question ${questionId}`);
        await ctx.reply(explanationText, { parse_mode: 'MarkdownV2' });
    }
    catch (error) {
        logger_1.logger.error(`Error in handleGetExplanation for user ${ctx.from.id}:`, error);
        ctx.reply('Произошла ошибка при загрузке объяснения.');
    }
}
async function scheduleMessageCleanup(telegramId, questionId, messageIds) {
    const scheduledDeleteAt = new Date();
    scheduledDeleteAt.setSeconds(scheduledDeleteAt.getSeconds() + 20);
    await (0, messageCleanupService_1.createMessageChain)(telegramId, questionId, messageIds, scheduledDeleteAt);
}
function arraysEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
exports.default = {
    handleGetQuestion,
    handleAnswer,
    handleTextAnswer,
    handleGetExplanation,
    sendQuestion
};
//# sourceMappingURL=questionHandlers.js.map