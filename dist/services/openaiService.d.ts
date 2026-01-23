import { QuestionData } from '../types';
declare function generateQuestion(field: string, difficulty?: string): Promise<QuestionData>;
declare function validateQuestion(questionData: QuestionData): Promise<boolean>;
export { generateQuestion, validateQuestion };
//# sourceMappingURL=openaiService.d.ts.map