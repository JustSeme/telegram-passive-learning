import { z } from 'zod';

export const TextInputQuestionSchema = z.object({
  questionText: z.string()
    .min(10, 'Question text must be at least 10 characters')
    .max(500, 'Question text must not exceed 500 characters'),
  correctAnswer: z.string()
    .min(1, 'Correct answer cannot be empty')
    .max(200, 'Correct answer must not exceed 200 characters'),
  explanation: z.string()
    .min(10, 'Explanation must be at least 10 characters')
    .max(1000, 'Explanation must not exceed 1000 characters'),
});

export type TextInputQuestion = z.infer<typeof TextInputQuestionSchema>;
