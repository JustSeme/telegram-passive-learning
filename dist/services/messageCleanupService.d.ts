interface Bot {
    telegram: {
        deleteMessage: (chatId: string, messageId: number) => Promise<any>;
    };
}
declare function createMessageChain(telegramId: string, questionId: number, messageIds: number[], scheduledDeleteAt?: Date): Promise<void>;
declare function cleanupExpiredMessages(bot: Bot): Promise<void>;
declare function cleanupOldQuestions(): Promise<void>;
export { createMessageChain, cleanupExpiredMessages, cleanupOldQuestions };
//# sourceMappingURL=messageCleanupService.d.ts.map