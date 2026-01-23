import dotenv from 'dotenv';
import { Telegraf, Context } from 'telegraf';
import prisma from './database';
import { logger } from './utils/logger';
import userHandlers from './handlers/userHandlers';
import questionHandlers from './handlers/questionHandlers';
import { setupCronJobs } from './services/cronService';
import { cleanupExpiredMessages } from './services/messageCleanupService';
import { TelegramContext } from './types';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Middleware
bot.use(async (ctx: TelegramContext, next: any) => {
  await next();
});

// Start command
bot.start(async (ctx: TelegramContext) => {
  logger.info(`User ${ctx.from?.id} started the bot`);
  await userHandlers.handleStart(ctx);
});

// Help command
bot.help((ctx: TelegramContext) => {
  ctx.reply(
    '📚 *Бот для поддержания знаний*\\n\\n' +
    'Доступные команды:\\n' +
    '/start - Начать работу с ботом\\n' +
    '/profile - Настроить профиль\\n' +
    '/question - Получить новый вопрос\\n' +
    '/history - История ответов\\n' +
    '/help - Показать это сообщение',
    { parse_mode: 'MarkdownV2' }
  );
});

// Profile command
bot.command('profile', async (ctx: TelegramContext) => {
  logger.info(`User ${ctx.from?.id} requested profile`);
  await userHandlers.handleProfile(ctx);
});

// Question command
bot.command('question', async (ctx: TelegramContext) => {
  logger.info(`User ${ctx.from?.id} requested a question`);
  await questionHandlers.handleGetQuestion(ctx);
});

// History command
bot.command('history', async (ctx: TelegramContext) => {
  logger.info(`User ${ctx.from?.id} requested history`);
  await userHandlers.handleHistory(ctx);
});

// Callback query handlers
bot.on('callback_query', async (ctx: TelegramContext) => {
  const callbackData = ctx.callbackQuery?.data;
  logger.debug(`User ${ctx.from?.id} pressed callback: ${callbackData}`);
  
  if (callbackData?.startsWith('field_')) {
    await userHandlers.handleFieldSelection(ctx);
  } else if (callbackData?.startsWith('frequency_')) {
    await userHandlers.handleFrequencySelection(ctx);
  } else if (callbackData?.startsWith('answer_')) {
    await questionHandlers.handleAnswer(ctx);
  } else if (callbackData === 'get_explanation') {
    await questionHandlers.handleGetExplanation(ctx);
  } else if (callbackData?.startsWith('get_explanation_')) {
    await questionHandlers.handleGetExplanation(ctx);
  } else if (callbackData === 'back_to_profile') {
    await userHandlers.handleProfile(ctx);
  } else if (callbackData?.startsWith('edit_field')) {
    await userHandlers.handleEditField(ctx);
  } else if (callbackData?.startsWith('edit_frequency')) {
    await userHandlers.handleEditFrequency(ctx);
  }
  
  await ctx.answerCbQuery?.();
});

// Text message handlers
bot.on('text', async (ctx: TelegramContext) => {
  logger.debug(`User ${ctx.from?.id} sent text: ${ctx.message?.text?.substring(0, 50)}`);
  await questionHandlers.handleTextAnswer(ctx);
});

// Error handling
bot.catch((err: any, ctx: Context) => {
  logger.error(`Bot error for user ${ctx.from?.id}:`, err);
  ctx.reply('Произошла ошибка. Попробуйте позже.');
});

// Start the bot
async function startBot(): Promise<void> {
  try {
    // Setup cron jobs
    setupCronJobs(bot);
    
    // Start message cleanup
    setInterval(() => cleanupExpiredMessages(bot), 60000); // Every minute
    
    logger.info('Bot started successfully');
    await bot.launch();
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  bot.stop('SIGTERM');
});

startBot();
