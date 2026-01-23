"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const telegraf_1 = require("telegraf");
const logger_1 = require("./utils/logger");
const userHandlers_1 = __importDefault(require("./handlers/userHandlers"));
const questionHandlers_1 = __importDefault(require("./handlers/questionHandlers"));
const cronService_1 = require("./services/cronService");
const messageCleanupService_1 = require("./services/messageCleanupService");
dotenv_1.default.config();
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
bot.use(async (ctx, next) => {
    await next();
});
bot.start(async (ctx) => {
    logger_1.logger.info(`User ${ctx.from?.id} started the bot`);
    await userHandlers_1.default.handleStart(ctx);
});
bot.help((ctx) => {
    ctx.reply('📚 *Бот для поддержания знаний*\\n\\n' +
        'Доступные команды:\\n' +
        '/start - Начать работу с ботом\\n' +
        '/profile - Настроить профиль\\n' +
        '/question - Получить новый вопрос\\n' +
        '/history - История ответов\\n' +
        '/help - Показать это сообщение', { parse_mode: 'MarkdownV2' });
});
bot.command('profile', async (ctx) => {
    logger_1.logger.info(`User ${ctx.from?.id} requested profile`);
    await userHandlers_1.default.handleProfile(ctx);
});
bot.command('question', async (ctx) => {
    logger_1.logger.info(`User ${ctx.from?.id} requested a question`);
    await questionHandlers_1.default.handleGetQuestion(ctx);
});
bot.command('history', async (ctx) => {
    logger_1.logger.info(`User ${ctx.from?.id} requested history`);
    await userHandlers_1.default.handleHistory(ctx);
});
bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery?.data;
    logger_1.logger.debug(`User ${ctx.from?.id} pressed callback: ${callbackData}`);
    if (callbackData?.startsWith('field_')) {
        await userHandlers_1.default.handleFieldSelection(ctx);
    }
    else if (callbackData?.startsWith('frequency_')) {
        await userHandlers_1.default.handleFrequencySelection(ctx);
    }
    else if (callbackData?.startsWith('answer_')) {
        await questionHandlers_1.default.handleAnswer(ctx);
    }
    else if (callbackData === 'get_explanation') {
        await questionHandlers_1.default.handleGetExplanation(ctx);
    }
    else if (callbackData?.startsWith('get_explanation_')) {
        await questionHandlers_1.default.handleGetExplanation(ctx);
    }
    else if (callbackData === 'back_to_profile') {
        await userHandlers_1.default.handleProfile(ctx);
    }
    else if (callbackData?.startsWith('edit_field')) {
        await userHandlers_1.default.handleEditField(ctx);
    }
    else if (callbackData?.startsWith('edit_frequency')) {
        await userHandlers_1.default.handleEditFrequency(ctx);
    }
    await ctx.answerCbQuery?.();
});
bot.on('text', async (ctx) => {
    logger_1.logger.debug(`User ${ctx.from?.id} sent text: ${ctx.message?.text?.substring(0, 50)}`);
    await questionHandlers_1.default.handleTextAnswer(ctx);
});
bot.catch((err, ctx) => {
    logger_1.logger.error(`Bot error for user ${ctx.from?.id}:`, err);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
});
async function startBot() {
    try {
        (0, cronService_1.setupCronJobs)(bot);
        setInterval(() => (0, messageCleanupService_1.cleanupExpiredMessages)(bot), 60000);
        logger_1.logger.info('Bot started successfully');
        await bot.launch();
    }
    catch (error) {
        logger_1.logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}
process.once('SIGINT', () => {
    logger_1.logger.info('SIGINT received. Shutting down gracefully...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received. Shutting down gracefully...');
    bot.stop('SIGTERM');
});
startBot();
//# sourceMappingURL=index.js.map