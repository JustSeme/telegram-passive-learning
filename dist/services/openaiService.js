"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuestion = generateQuestion;
exports.validateQuestion = validateQuestion;
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
async function generateQuestion(field, difficulty = 'medium') {
    try {
        const questionType = getRandomQuestionType();
        const prompt = createPrompt(field, questionType, difficulty);
        logger_1.logger.debug(`Generating ${questionType} question for field: ${field}`);
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
        const questionData = JSON.parse(content);
        return formatQuestionData(questionData, questionType, field);
    }
    catch (error) {
        logger_1.logger.error(`Error generating question for field ${field}:`, error);
        logger_1.logger.warn(`Using fallback question for field: ${field}`);
        return getFallbackQuestion(field);
    }
}
function getRandomQuestionType() {
    const types = Object.values(types_1.QuestionType);
    return types[Math.floor(Math.random() * types.length)];
}
function createPrompt(field, questionType, difficulty) {
    const basePrompt = `Создай вопрос по теме "${field}" среднего уровня сложности. `;
    switch (questionType) {
        case types_1.QuestionType.SINGLE_CHOICE:
            return basePrompt + `
Вопрос должен быть в формате JSON:
{
  "question": "текст вопроса",
  "options": ["вариант1", "вариант2", "вариант3", "вариант4"],
  "correctAnswer": "правильный вариант ответа",
  "explanation": "объяснение, почему этот ответ правильный"
}

Убедись, что только один вариант ответа является правильным.`;
        case types_1.QuestionType.MULTI_CHOICE:
            return basePrompt + `
Вопрос должен быть в формате JSON:
{
  "question": "текст вопроса",
  "options": ["вариант1", "вариант2", "вариант3", "вариант4"],
  "correctAnswer": ["правильный1", "правильный2"],
  "explanation": "объяснение, почему эти ответы правильные"
}

Убедись, что 2-3 варианта ответа являются правильными.`;
        case types_1.QuestionType.TEXT_INPUT:
            return basePrompt + `
Вопрос должен быть в формате JSON:
{
  "question": "текст вопроса",
  "correctAnswer": "точный ответ",
  "explanation": "объяснение, почему этот ответ правильный"
}

Ответ должен быть коротким и однозначным (1-3 слова).`;
        default:
            return createPrompt(field, types_1.QuestionType.SINGLE_CHOICE, difficulty);
    }
}
function formatQuestionData(data, type, field) {
    const question = {
        type,
        question: data.question,
        field,
        explanation: data.explanation,
        correctAnswer: typeof data.correctAnswer === 'string'
            ? data.correctAnswer
            : JSON.stringify(data.correctAnswer)
    };
    if (type !== types_1.QuestionType.TEXT_INPUT) {
        question.options = JSON.stringify(data.options);
    }
    return question;
}
function getFallbackQuestion(field) {
    const fallbackQuestions = {
        'Node.js Backend': {
            type: types_1.QuestionType.SINGLE_CHOICE,
            question: 'Что такое middleware в Express.js?',
            options: JSON.stringify(['Функция для работы с базой данных', 'Функция, которая обрабатывает запросы', 'Функция для рендеринга шаблонов', 'Функция для аутентификации']),
            correctAnswer: 'Функция, которая обрабатывает запросы',
            explanation: 'Middleware в Express.js - это функция, которая имеет доступ к объекту запроса (req), объекту ответа (res) и следующей функции в цикле запрос-ответ.',
            field: 'Node.js Backend'
        },
        'Психология': {
            type: types_1.QuestionType.SINGLE_CHOICE,
            question: 'Кто считается отцом психоанализа?',
            options: JSON.stringify(['Карл Юнг', 'Зигмунд Фрейд', 'Альфред Адлер', 'Вильгельм Вундт']),
            correctAnswer: 'Зигмунд Фрейд',
            explanation: 'Зигмунд Фрейд считается отцом психоанализа, так как он разработал основную теорию и методологию этого направления в психологии.',
            field: 'Психология'
        },
        'JavaScript': {
            type: types_1.QuestionType.SINGLE_CHOICE,
            question: 'Что такое замыкание (closure) в JavaScript?',
            options: JSON.stringify(['Способ создания объектов', 'Функция внутри функции с доступом к внешним переменным', 'Метод массива', 'Тип данных']),
            correctAnswer: 'Функция внутри функции с доступом к внешним переменным',
            explanation: 'Замыкание - это функция, которая имеет доступ к переменным из внешней области видимости даже после того, как внешняя функция завершила выполнение.',
            field: 'JavaScript'
        }
    };
    return fallbackQuestions[field] || fallbackQuestions['JavaScript'];
}
async function validateQuestion(questionData) {
    try {
        if (!questionData.question || !questionData.correctAnswer || !questionData.explanation) {
            logger_1.logger.warn('Question validation failed: missing required fields');
            return false;
        }
        if (questionData.type !== types_1.QuestionType.TEXT_INPUT && !questionData.options) {
            logger_1.logger.warn('Question validation failed: missing options for non-text question');
            return false;
        }
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error validating question:', error);
        return false;
    }
}
//# sourceMappingURL=openaiService.js.map