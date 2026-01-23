import * as cron from 'node-cron';
import prisma from '../database';
import { generateQuestion } from './openaiService';
import { sendQuestion } from '../handlers/questionHandlers';
import { cleanupOldQuestions } from './messageCleanupService';
import { logger } from '../utils/logger';
import { TelegramContext } from '../types';

interface Bot {
  telegram: {
    sendMessage: (chatId: string, text: string, options?: any) => Promise<any>;
  };
}

function setupCronJobs(bot: Bot): void {
  // Send questions every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running daily question job...');
    await sendScheduledQuestions(bot, '1 день');
  });

  // Send questions every 2 days at 10:00 AM
  cron.schedule('0 10 */2 * *', async () => {
    logger.info('Running every 2 days question job...');
    await sendScheduledQuestions(bot, '2 дня');
  });

  // Send questions every 4 days at 11:00 AM
  cron.schedule('0 11 */4 * *', async () => {
    logger.info('Running every 4 days question job...');
    await sendScheduledQuestions(bot, '4 дня');
  });

  // Send questions every week on Sunday at 12:00 PM
  cron.schedule('0 12 * * 0', async () => {
    logger.info('Running weekly question job...');
    await sendScheduledQuestions(bot, 'неделя');
  });

  // Clean up old questions every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running question cleanup job...');
    await cleanupOldQuestions();
  });

  logger.info('Cron jobs scheduled successfully');
}

async function sendScheduledQuestions(bot: Bot, frequency: string): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: {
        frequency,
        isActive: true,
        field: {
          not: ''
        }
      }
    });

    logger.info(`Found ${users.length} users for frequency: ${frequency}`);

    for (const user of users) {
      try {
        // Check if user already received a question recently
        const recentQuestion = await prisma.question.findFirst({
          where: {
            telegramId: user.telegramId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        });

        if (recentQuestion) {
          logger.debug(`User ${user.telegramId} already received a question recently`);
          continue;
        }

        // Generate and send question
        logger.debug(`Generating question for user ${user.telegramId}`);
        const questionData = await generateQuestion(user.field);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const question = await prisma.question.create({
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

        // Create a minimal context for sending
        const ctx: TelegramContext = {
          from: { id: parseInt(user.telegramId) },
          reply: async (text: string, options = {}) => {
            return await bot.telegram.sendMessage(user.telegramId, text, options);
          }
        } as TelegramContext;

        await sendQuestion(ctx, question);
        
        logger.info(`Question sent to user ${user.telegramId}`);
        
        // Add delay between sending to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (userError) {
        logger.error(`Error sending question to user ${user.telegramId}:`, userError);
      }
    }
  } catch (error) {
    logger.error('Error in sendScheduledQuestions:', error);
  }
}

async function getUserLastQuestionDate(telegramId: string): Promise<Date | null> {
  try {
    const lastQuestion = await prisma.question.findFirst({
      where: { telegramId },
      orderBy: { createdAt: 'desc' }
    });

    return lastQuestion ? lastQuestion.createdAt : null;
  } catch (error) {
    logger.error('Error getting user last question date:', error);
    return null;
  }
}

async function shouldSendQuestion(user: any): Promise<boolean> {
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

export {
  setupCronJobs,
  sendScheduledQuestions,
  shouldSendQuestion
};
