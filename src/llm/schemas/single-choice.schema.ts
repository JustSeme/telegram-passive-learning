import { z } from 'zod';

export const SingleChoiceQuestionSchema = z.object({
  questionText: z.string()
    .min(10, 'Question text must be at least 10 characters')
    .max(500, 'Question text must not exceed 500 characters'),
  options: z.array(z.string()
    .min(1, 'Option cannot be empty')
    .max(200, 'Option must not exceed 200 characters')
  ).min(4, 'At least 4 options required')
   .max(6, 'Maximum 6 options allowed'),
  correctAnswers: z.array(z.string()
    .min(1, 'Correct answer cannot be empty')
    .max(200, 'Correct answer must not exceed 200 characters')
  ).min(1, 'At least 1 correct answer required')
   .max(1, 'Maximum 1 correct answer allowed'),
  explanation: z.string()
    .min(10, 'Explanation must be at least 10 characters')
    .max(1000, 'Explanation must not exceed 1000 characters'),
}).refine(data => data.options.includes(data.correctAnswers.at(0)), {
  message: 'Correct answer must be one of the options',
  path: ['correctAnswer'],
});

export type SingleChoiceQuestion = z.infer<typeof SingleChoiceQuestionSchema>;
