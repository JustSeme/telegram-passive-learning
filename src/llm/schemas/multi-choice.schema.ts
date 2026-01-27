import { z } from 'zod';

export const MultiChoiceQuestionSchema = z.object({
  questionText: z.string()
    .min(10, 'Question text must be at least 10 characters')
    .max(500, 'Question text must not exceed 500 characters'),
  options: z.array(z.string()
    .min(1, 'Option cannot be empty')
    .max(200, 'Option must not exceed 200 characters')
  ).min(2, 'At least 2 options required')
   .max(6, 'Maximum 6 options allowed'),
  correctAnswers: z.array(z.string()
    .min(1, 'Correct answer cannot be empty')
    .max(200, 'Correct answer must not exceed 200 characters')
  ).min(1, 'At least 1 correct answer required')
   .max(3, 'Maximum 3 correct answers allowed'),
  explanation: z.string()
    .min(10, 'Explanation must be at least 10 characters')
    .max(1000, 'Explanation must not exceed 1000 characters'),
}).refine((data) => {
  return data.correctAnswers.every(answer => data.options.includes(answer));
}, {
  message: 'All correct answers must be in the options array',
  path: ['correctAnswers'],
}).refine((data) => {
  const uniqueAnswers = new Set(data.correctAnswers);
  return uniqueAnswers.size === data.correctAnswers.length;
}, {
  message: 'Correct answers must be unique',
  path: ['correctAnswers'],
});

export type MultiChoiceQuestion = z.infer<typeof MultiChoiceQuestionSchema>;
