"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessageChain = createMessageChain;
exports.cleanupExpiredMessages = cleanupExpiredMessages;
exports.cleanupOldQuestions = cleanupOldQuestions;
const database_1 = __importDefault(require("../database"));
const logger_1 = require("../utils/logger");
async function createMessageChain(telegramId, questionId, messageIds, scheduledDeleteAt) {
    try {
        if (!scheduledDeleteAt) {
            scheduledDeleteAt = new Date();
            scheduledDeleteAt.setSeconds(scheduledDeleteAt.getSeconds() + 20);
        }
        await database_1.default.messageChain.create({
            data: {
                telegramId,
                questionId,
                messageIds: JSON.stringify(messageIds),
                scheduledDeleteAt
            }
        });
        logger_1.logger.debug(`Message chain created for user ${telegramId}, question ${questionId}`);
    }
    catch (error) {
        logger_1.logger.error('Error creating message chain:', error);
    }
}
async function cleanupExpiredMessages(bot) {
    try {
        const expiredChains = await database_1.default.messageChain.findMany({
            where: {
                scheduledDeleteAt: {
                    lte: new Date()
                }
            }
        });
        if (expiredChains.length === 0) {
            return;
        }
        logger_1.logger.info(`Cleaning up ${expiredChains.length} expired message chains`);
        for (const chain of expiredChains) {
            try {
                const messageIds = JSON.parse(chain.messageIds);
                for (const messageId of messageIds) {
                    try {
                        await bot.telegram.deleteMessage(chain.telegramId, messageId);
                        logger_1.logger.debug(`Deleted message ${messageId} for user ${chain.telegramId}`);
                    }
                    catch (deleteError) {
                        logger_1.logger.debug(`Could not delete message ${messageId}: ${deleteError.message}`);
                    }
                }
                await database_1.default.messageChain.delete({
                    where: { id: chain.id }
                });
                logger_1.logger.debug(`Message chain ${chain.id} deleted successfully`);
            }
            catch (chainError) {
                logger_1.logger.error(`Error processing message chain ${chain.id}:`, chainError);
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in cleanupExpiredMessages:', error);
    }
}
async function cleanupOldQuestions() {
    try {
        const now = new Date();
        const result = await database_1.default.question.deleteMany({
            where: {
                expiresAt: {
                    lte: now
                }
            }
        });
        if (result.count > 0) {
            logger_1.logger.info(`Cleaned up ${result.count} expired questions`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error in cleanupOldQuestions:', error);
    }
}
//# sourceMappingURL=messageCleanupService.js.map