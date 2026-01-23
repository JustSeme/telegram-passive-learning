import prisma from '../database';
import { logger } from '../utils/logger';
import { TelegramContext, User, FieldOption, FrequencyOption } from '../types';

const FIELDS = [
  'Node.js Backend',
  'Психология',
  'Слесарные работы',
  'JavaScript',
  'Python',
  'Математика',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'Литература',
  'Экономика',
  'Маркетинг',
  'Дизайн',
  'Другое'
];

const FREQUENCIES: FrequencyOption[] = [
  { label: 'Раз в день', value: '1 день' },
  { label: 'Раз в 2 дня', value: '2 дня' },
  { label: 'Раз в 4 дня', value: '4 дня' },
  { label: 'Раз в неделю', value: 'неделя' },
  { label: 'Отключить', value: 'disabled' }
];

async function handleStart(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();
  const { username, first_name, last_name } = ctx.from;

  try {
    let user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      logger.info(`New user registered: ${telegramId} (${username})`);
      user = await prisma.user.create({
        data: {
          telegramId,
          username,
          firstName: first_name,
          lastName: last_name,
          field: '',
          frequency: '1 день',
          isActive: true
        }
      });

      await sendFieldSelection(ctx, user);
    } else {
      logger.info(`Existing user returned: ${telegramId} (${username})`);
      await ctx.reply(
        `👋 С возвращением, ${first_name}!\\n\\n` +
        'Ваш профиль уже настроен. Используйте /profile для изменений.',
        { parse_mode: 'MarkdownV2' }
      );
    }
  } catch (error) {
    logger.error(`Error in handleStart for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

async function sendFieldSelection(ctx: TelegramContext, user: User): Promise<void> {
  const keyboard = FIELDS.map((field, index) => [{
    text: field,
    callback_data: `field_${index}`
  }]);

  await ctx.reply(
    '🎯 *Выберите вашу сферу деятельности:*\\n\\n' +
    'Это поможет мне подбирать для вас релевантные вопросы.',
    {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );
}

async function handleFieldSelection(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();
  const fieldIndex = parseInt(ctx.callbackQuery!.data.split('_')[1]);
  const selectedField = FIELDS[fieldIndex];

  try {
    await prisma.user.update({
      where: { telegramId },
      data: { field: selectedField }
    });

    logger.info(`User ${telegramId} selected field: ${selectedField}`);
    await sendFrequencySelection(ctx);
  } catch (error) {
    logger.error(`Error in handleFieldSelection for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

async function sendFrequencySelection(ctx: TelegramContext): Promise<void> {
  const keyboard = FREQUENCIES.map(freq => [{
    text: freq.label,
    callback_data: `frequency_${freq.value}`
  }]);

  await ctx.reply(
    '⏰ *Как часто вы хотите получать вопросы?*\\n\\n' +
    'Вы можете изменить это в любой момент в профиле.',
    {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );
}

async function handleFrequencySelection(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();
  const frequency = ctx.callbackQuery!.data.replace('frequency_', '');

  try {
    const isActive = frequency !== 'disabled';
    
    await prisma.user.update({
      where: { telegramId },
      data: { 
        frequency,
        isActive
      }
    });

    logger.info(`User ${telegramId} set frequency: ${frequency}, active: ${isActive}`);
    await ctx.reply(
      '✅ *Настройка завершена!*\\n\\n' +
      'Теперь вы готовы к обучению!\\n\\n' +
      '🔸 /question - получить вопрос сейчас\\n' +
      '🔸 /profile - изменить настройки\\n' +
      '🔸 /history - посмотреть историю ответов',
      { parse_mode: 'MarkdownV2' }
    );
  } catch (error) {
    logger.error(`Error in handleFrequencySelection for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

async function handleProfile(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      logger.warn(`User ${telegramId} tried to access profile but not found`);
      await handleStart(ctx);
      return;
    }

    const statusText = user.isActive ? '✅ Включены' : '❌ Отключены';
    
    await ctx.reply(
      `👤 *Ваш профиль*\\n\\n` +
      `🎯 **Сфера:** ${user.field || 'Не указана'}\\n` +
      `⏰ **Частота вопросов:** ${user.frequency}\\n` +
      `📬 **Автоматические вопросы:** ${statusText}\\n\\n` +
      `*Изменить настройки:*`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🎯 Изменить сферу', callback_data: 'edit_field' },
              { text: '⏰ Изменить частоту', callback_data: 'edit_frequency' }
            ]
          ]
        }
      }
    );
  } catch (error) {
    logger.error(`Error in handleProfile for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

async function handleEditField(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();
  
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    const keyboard = FIELDS.map((field, index) => [{
      text: field,
      callback_data: `field_${index}`
    }]);

    await ctx.reply(
      `🎯 *Текущая сфера:* ${user?.field || 'Не указана'}\\n\\n` +
      '*Выберите новую сферу деятельности:*',
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            ...keyboard,
            [{ text: '⬅️ Назад', callback_data: 'back_to_profile' }]
          ]
        }
      }
    );
  } catch (error) {
    logger.error(`Error in handleEditField for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

async function handleEditFrequency(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();
  
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    const keyboard = FREQUENCIES.map(freq => [{
      text: freq.label,
      callback_data: `frequency_${freq.value}`
    }]);

    await ctx.reply(
      `⏰ *Текущая частота:* ${user?.frequency}\\n\\n` +
      '*Выберите новую частоту вопросов:*',
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            ...keyboard,
            [{ text: '⬅️ Назад', callback_data: 'back_to_profile' }]
          ]
        }
      }
    );
  } catch (error) {
    logger.error(`Error in handleEditFrequency for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

async function handleHistory(ctx: TelegramContext): Promise<void> {
  const telegramId = ctx.from.id.toString();

  try {
    const answers = await prisma.answer.findMany({
      where: { telegramId },
      include: {
        question: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (answers.length === 0) {
      logger.info(`User ${telegramId} has no answer history`);
      await ctx.reply(
        '📝 *У вас пока нет ответов*\\n\\n' +
        'Используйте /question чтобы получить первый вопрос!',
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    logger.info(`User ${telegramId} requested history, found ${answers.length} answers`);
    let message = '📝 *Ваша история ответов:*\\n\\n';
    
    for (const answer of answers) {
      const isCorrect = answer.isCorrect ? '✅' : '❌';
      const date = new Date(answer.createdAt).toLocaleDateString('ru-RU');
      
      message += `${isCorrect} *${date}*\\n`;
      message += `📋 ${answer.question.question}\\n`;
      message += `💬 Ваш ответ: ${formatAnswer(answer.userAnswer)}\\n`;
      message += `✅ Правильный ответ: ${formatAnswer(answer.question.correctAnswer)}\\n\\n`;
    }

    // Telegram message length limit
    if (message.length > 4000) {
      message = message.substring(0, 3900) + '\\n\\n...';
    }

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logger.error(`Error in handleHistory for user ${telegramId}:`, error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}

function formatAnswer(answer: string): string {
  try {
    const parsed = JSON.parse(answer);
    if (Array.isArray(parsed)) {
      return parsed.join(', ');
    }
    return parsed;
  } catch {
    return answer;
  }
}

export default {
  handleStart,
  handleFieldSelection,
  handleFrequencySelection,
  handleProfile,
  handleEditField,
  handleEditFrequency,
  handleHistory,
  FIELDS,
  FREQUENCIES
};
