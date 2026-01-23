import { TelegramContext, Question } from '../types';
declare function handleGetQuestion(ctx: TelegramContext): Promise<void>;
declare function sendQuestion(ctx: TelegramContext, question: Question): Promise<void>;
declare function handleAnswer(ctx: TelegramContext): Promise<void>;
declare function handleTextAnswer(ctx: TelegramContext): Promise<void>;
declare function handleGetExplanation(ctx: TelegramContext): Promise<void>;
declare const _default: {
    handleGetQuestion: typeof handleGetQuestion;
    handleAnswer: typeof handleAnswer;
    handleTextAnswer: typeof handleTextAnswer;
    handleGetExplanation: typeof handleGetExplanation;
    sendQuestion: typeof sendQuestion;
};
export default _default;
//# sourceMappingURL=questionHandlers.d.ts.map