import prisma from '../database';
import { logger } from '../utils/logger';

interface Bot {
  telegram: {
    deleteMessage: (chatId: string, messageId: number) => Promise<any>;
  };
}

async function createMessageChain(
  telegramId: string, 
  questionId: number, 
  messageIds: number[], 
  scheduledDeleteAt?: Date
): Promise<void> {
  try {
    if (!scheduledDeleteAt) {
      scheduledDeleteAt = new Date();
      scheduledDeleteAt.setSeconds(scheduledDeleteAt.getSeconds() + 20);
    }

    await prisma.messageChain.create({
      data: {
        telegramId,
        questionId,
        messageIds: JSON.stringify(messageIds),
        scheduledDeleteAt
      }
    });

    logger.debug(`Message chain created for user ${telegramId}, question ${questionId}`);
  } catch (error) {
    logger.error('Error creating message chain:', error);
  }
}

async function cleanupExpiredMessages(bot: Bot): Promise<void> {
  try {
    const expiredChains = await prisma.messageChain.findMany({
      where: {
        scheduledDeleteAt: {
          lte: new Date()
        }
      }
    });

    if (expiredChains.length === 0) {
      return;
    }

    logger.info(`Cleaning up ${expiredChains.length} expired message chains`);

    for (const chain of expiredChains) {
      try {
        const messageIds = JSON.parse(chain.messageIds) as number[];
        
        for (const messageId of messageIds) {
          try {
            await bot.telegram.deleteMessage(chain.telegramId, messageId);
            logger.debug(`Deleted message ${messageId} for user ${chain.telegramId}`);
          } catch (deleteError: any) {
            // Message might already be deleted or user blocked the bot
            logger.debug(`Could not delete message ${messageId}: ${deleteError.message}`);
          }
        }

        // Delete the chain record
        await prisma.messageChain.delete({
          where: { id: chain.id }
        });

        logger.debug(`Message chain ${chain.id} deleted successfully`);
      } catch (chainError) {
        logger.error(`Error processing message chain ${chain.id}:`, chainError);
      }
    }
  } catch (error) {
    logger.error('Error in cleanupExpiredMessages:', error);
  }
}

async function cleanupOldQuestions(): Promise<void> {
  try {
    const now = new Date();
    
    const result = await prisma.question.deleteMany({
      where: {
        expiresAt: {
          lte: now
        }
      }
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired questions`);
    }
  } catch (error) {
    logger.error('Error in cleanupOldQuestions:', error);
  }
}

export {
  createMessageChain,
  cleanupExpiredMessages,
  cleanupOldQuestions
};
