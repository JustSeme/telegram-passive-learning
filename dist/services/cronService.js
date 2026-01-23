"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCronJobs = setupCronJobs;
exports.sendScheduledQuestions = sendScheduledQuestions;
exports.shouldSendQuestion = shouldSendQuestion;
const cron = __importStar(require("node-cron"));
const database_1 = __importDefault(require("../database"));
const openaiService_1 = require("./openaiService");
const questionHandlers_1 = require("../handlers/questionHandlers");
const messageCleanupService_1 = require("./messageCleanupService");
const logger_1 = require("../utils/logger");
function setupCronJobs(bot) {
    cron.schedule('0 9 * * *', async () => {
        logger_1.logger.info('Running daily question job...');
        await sendScheduledQuestions(bot, '1 день');
    });
    cron.schedule('0 10 */2 * *', async () => {
        logger_1.logger.info('Running every 2 days question job...');
        await sendScheduledQuestions(bot, '2 дня');
    });
    cron.schedule('0 11 */4 * *', async () => {
        logger_1.logger.info('Running every 4 days question job...');
        await sendScheduledQuestions(bot, '4 дня');
    });
    cron.schedule('0 12 * * 0', async () => {
        logger_1.logger.info('Running weekly question job...');
        await sendScheduledQuestions(bot, 'неделя');
    });
    cron.schedule('0 2 * * *', async () => {
        logger_1.logger.info('Running question cleanup job...');
        await (0, messageCleanupService_1.cleanupOldQuestions)();
    });
    logger_1.logger.info('Cron jobs scheduled successfully');
}
async function sendScheduledQuestions(bot, frequency) {
    try {
        const users = await database_1.default.user.findMany({
            where: {
                frequency,
                isActive: true,
                field: {
                    not: ''
                }
            }
        });
        logger_1.logger.info(`Found ${users.length} users for frequency: ${frequency}`);
        for (const user of users) {
            try {
                const recentQuestion = await database_1.default.question.findFirst({
                    where: {
                        telegramId: user.telegramId,
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    }
                });
                if (recentQuestion) {
                    logger_1.logger.debug(`User ${user.telegramId} already received a question recently`);
                    continue;
                }
                logger_1.logger.debug(`Generating question for user ${user.telegramId}`);
                const questionData = await (0, openaiService_1.generateQuestion)(user.field);
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);
                const question = await database_1.default.question.create({
                    data: {
                        telegramId: user.telegramId,
                        type: questionData.type,
                        question: questionData.question,
                        options: questionData.options,
                        correctAnswer: questionData.correctAnswer,
                        explanation: questionData.explanation,
                        field: questionData.field,
                        expiresAt
                    }
                });
                const ctx = {
                    from: { id: parseInt(user.telegramId) },
                    reply: async (text, options = {}) => {
                        return await bot.telegram.sendMessage(user.telegramId, text, options);
                    }
                };
                await (0, questionHandlers_1.sendQuestion)(ctx, question);
                logger_1.logger.info(`Question sent to user ${user.telegramId}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (userError) {
                logger_1.logger.error(`Error sending question to user ${user.telegramId}:`, userError);
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in sendScheduledQuestions:', error);
    }
}
async function getUserLastQuestionDate(telegramId) {
    try {
        const lastQuestion = await database_1.default.question.findFirst({
            where: { telegramId },
            orderBy: { createdAt: 'desc' }
        });
        return lastQuestion ? lastQuestion.createdAt : null;
    }
    catch (error) {
        logger_1.logger.error('Error getting user last question date:', error);
        return null;
    }
}
async function shouldSendQuestion(user) {
    if (!user.isActive || !user.field || user.frequency === 'disabled') {
        return false;
    }
    const lastQuestionDate = await getUserLastQuestionDate(user.telegramId);
    if (!lastQuestionDate) {
        return true;
    }
    const now = new Date();
    const hoursSinceLastQuestion = (now.getTime() - lastQuestionDate.getTime()) / (1000 * 60 * 60);
    switch (user.frequency) {
        case '1 день':
            return hoursSinceLastQuestion >= 24;
        case '2 дня':
            return hoursSinceLastQuestion >= 48;
        case '4 дня':
            return hoursSinceLastQuestion >= 96;
        case 'неделя':
            return hoursSinceLastQuestion >= 168;
        default:
            return false;
    }
}
//# sourceMappingURL=cronService.js.map