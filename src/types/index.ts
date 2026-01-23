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

export interface TelegramContext {
  from: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  message?: {
    text: string;
    message_id: number;
  };
  callbackQuery?: {
    data: string;
  };
  session?: {
    currentQuestionId?: number;
    multiAnswers?: number[];
  };
  reply: (text: string, options?: any) => Promise<any>;
  editMessageReplyMarkup?: (options?: any) => Promise<any>;
  answerCbQuery?: () => Promise<any>;
  db: any;
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
