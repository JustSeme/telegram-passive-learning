export interface User {
  id: number;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  field: string;
  frequency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: number;
  telegramId: string;
  type: QuestionType;
  question: string;
  options?: string;
  correctAnswer: string;
  explanation: string;
  field: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface Answer {
  id: number;
  telegramId: string;
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  createdAt: Date;
}

export interface MessageChain {
  id: number;
  telegramId: string;
  questionId?: number;
  messageIds: string;
  createdAt: Date;
  scheduledDeleteAt: Date;
}

import { Context } from 'telegraf';

export interface TelegramContext extends Context {
  session?: {
    currentQuestionId?: number;
    multiAnswers?: number[];
  };
}

export enum QuestionType {
  SINGLE_CHOICE = 'singleChoice',
  MULTI_CHOICE = 'multiChoice',
  TEXT_INPUT = 'textInputQuestion'
}

export interface QuestionData {
  type: QuestionType;
  question: string;
  options?: string;
  correctAnswer: string;
  explanation: string;
  field: string;
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface FrequencyOption {
  label: string;
  value: string;
}
