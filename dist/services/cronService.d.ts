interface Bot {
    telegram: {
        sendMessage: (chatId: string, text: string, options?: any) => Promise<any>;
    };
}
declare function setupCronJobs(bot: Bot): void;
declare function sendScheduledQuestions(bot: Bot, frequency: string): Promise<void>;
declare function shouldSendQuestion(user: any): Promise<boolean>;
export { setupCronJobs, sendScheduledQuestions, shouldSendQuestion };
//# sourceMappingURL=cronService.d.ts.map