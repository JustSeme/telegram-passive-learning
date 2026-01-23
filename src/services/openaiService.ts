import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { QuestionType, QuestionData } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OpenAIQuestionData {
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
}

async function generateQuestion(field: string, difficulty: string = 'medium'): Promise<QuestionData> {
  try {
    const questionType = getRandomQuestionType();
    
    const prompt = createPrompt(field, questionType, difficulty);
    
    logger.debug(`Generating ${questionType} question for field: ${field}`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Ты - эксперт в создании образовательных вопросов. Создавай вопросы, которые проверяют теоретические знания. Отвечай только в формате JSON без дополнительных комментариев.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const questionData: OpenAIQuestionData = JSON.parse(content);

    // Validate and format the question data
    return formatQuestionData(questionData, questionType, field);
  } catch (error) {
    logger.error(`Error generating question for field ${field}:`, error);
    
    // Fallback question if OpenAI fails
    logger.warn(`Using fallback question for field: ${field}`);
    return getFallbackQuestion(field);
  }
}

function getRandomQuestionType(): QuestionType {
  const types = Object.values(QuestionType);
  return types[Math.floor(Math.random() * types.length)] as QuestionType;
}

function createPrompt(field: string, questionType: QuestionType, difficulty: string): string {
  const basePrompt = `Создай вопрос по теме "${field}" среднего уровня сложности. `;
  
  switch (questionType) {
    case QuestionType.SINGLE_CHOICE:
      return basePrompt + `
Вопрос должен быть в формате JSON:
{
  "question": "текст вопроса",
  "options": ["вариант1", "вариант2", "вариант3", "вариант4"],
  "correctAnswer": "правильный вариант ответа",
  "explanation": "объяснение, почему этот ответ правильный"
}

Убедись, что только один вариант ответа является правильным.`;

    case QuestionType.MULTI_CHOICE:
      return basePrompt + `
Вопрос должен быть в формате JSON:
{
  "question": "текст вопроса",
  "options": ["вариант1", "вариант2", "вариант3", "вариант4"],
  "correctAnswer": ["правильный1", "правильный2"],
  "explanation": "объяснение, почему эти ответы правильные"
}

Убедись, что 2-3 варианта ответа являются правильными.`;

    case QuestionType.TEXT_INPUT:
      return basePrompt + `
Вопрос должен быть в формате JSON:
{
  "question": "текст вопроса",
  "correctAnswer": "точный ответ",
  "explanation": "объяснение, почему этот ответ правильный"
}

Ответ должен быть коротким и однозначным (1-3 слова).`;

    default:
      return createPrompt(field, QuestionType.SINGLE_CHOICE, difficulty);
  }
}

function formatQuestionData(data: OpenAIQuestionData, type: QuestionType, field: string): QuestionData {
  const question: QuestionData = {
    type,
    question: data.question,
    field,
    explanation: data.explanation,
    correctAnswer: typeof data.correctAnswer === 'string' 
      ? data.correctAnswer 
      : JSON.stringify(data.correctAnswer)
  };

  if (type !== QuestionType.TEXT_INPUT) {
    question.options = JSON.stringify(data.options);
  }

  return question;
}

function getFallbackQuestion(field: string): QuestionData {
  const fallbackQuestions: Record<string, QuestionData> = {
    'Node.js Backend': {
      type: QuestionType.SINGLE_CHOICE,
      question: 'Что такое middleware в Express.js?',
      options: JSON.stringify(['Функция для работы с базой данных', 'Функция, которая обрабатывает запросы', 'Функция для рендеринга шаблонов', 'Функция для аутентификации']),
      correctAnswer: 'Функция, которая обрабатывает запросы',
      explanation: 'Middleware в Express.js - это функция, которая имеет доступ к объекту запроса (req), объекту ответа (res) и следующей функции в цикле запрос-ответ.',
      field: 'Node.js Backend'
    },
    'Психология': {
      type: QuestionType.SINGLE_CHOICE,
      question: 'Кто считается отцом психоанализа?',
      options: JSON.stringify(['Карл Юнг', 'Зигмунд Фрейд', 'Альфред Адлер', 'Вильгельм Вундт']),
      correctAnswer: 'Зигмунд Фрейд',
      explanation: 'Зигмунд Фрейд считается отцом психоанализа, так как он разработал основную теорию и методологию этого направления в психологии.',
      field: 'Психология'
    },
    'JavaScript': {
      type: QuestionType.SINGLE_CHOICE,
      question: 'Что такое замыкание (closure) в JavaScript?',
      options: JSON.stringify(['Способ создания объектов', 'Функция внутри функции с доступом к внешним переменным', 'Метод массива', 'Тип данных']),
      correctAnswer: 'Функция внутри функции с доступом к внешним переменным',
      explanation: 'Замыкание - это функция, которая имеет доступ к переменным из внешней области видимости даже после того, как внешняя функция завершила выполнение.',
      field: 'JavaScript'
    }
  };

  return fallbackQuestions[field] || fallbackQuestions['JavaScript'];
}

async function validateQuestion(questionData: QuestionData): Promise<boolean> {
  try {
    // Basic validation
    if (!questionData.question || !questionData.correctAnswer || !questionData.explanation) {
      logger.warn('Question validation failed: missing required fields');
      return false;
    }

    if (questionData.type !== QuestionType.TEXT_INPUT && !questionData.options) {
      logger.warn('Question validation failed: missing options for non-text question');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error validating question:', error);
    return false;
  }
}

export {
  generateQuestion,
  validateQuestion
};
