import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { Runnable } from '@langchain/core/runnables';
import { SingleChoiceQuestionSchema, SingleChoiceQuestion } from './schemas/single-choice.schema';
import { MultiChoiceQuestionSchema, MultiChoiceQuestion } from './schemas/multi-choice.schema';
import { TextInputQuestionSchema, TextInputQuestion } from './schemas/text-input-question.schema';
import { OnModuleInit } from '@nestjs/common';
import { QuestionType } from 'src/telegram/entities/question.entity';

@Injectable()
export class OpenAIService implements OnModuleInit {
  private chatModel: ChatOpenAI;
  private singleChoiseModel: Runnable<string, SingleChoiceQuestion>;
  private multiChoiseModel: Runnable<string, MultiChoiceQuestion>;
  private textInputModel: Runnable<string, TextInputQuestion>;

  constructor() {}

  async onModuleInit() {
    this.chatModel = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      configuration: {
        baseURL: process.env.OPENROUTER_BASE_URL
      }
    });

    this.singleChoiseModel = this.chatModel.withStructuredOutput(SingleChoiceQuestionSchema)
    this.multiChoiseModel = this.chatModel.withStructuredOutput(MultiChoiceQuestionSchema)
    this.textInputModel = this.chatModel.withStructuredOutput(TextInputQuestionSchema)
  }

  private getRandomQuestionType(): QuestionType {
    const questionTypes = Object.values(QuestionType);
    const randomQuestionIndex = Math.floor(Math.random() * (questionTypes.length - 0 + 1)) + 0;
    return questionTypes.at(randomQuestionIndex);
  }

  public async generateQuestion(learningTopic: string, language: string = 'ru'): Promise<(MultiChoiceQuestion | SingleChoiceQuestion | TextInputQuestion) & { type: QuestionType }> {
    const questionType = this.getRandomQuestionType();
    
    const systemPrompt = `You are a highly experienced specialist in the field of "${learningTopic}". After many years of work, you have become a professor at a reputable university in the field of "${learningTopic}". You communicate with your students with great enthusiasm and motivate them.`
    const userPrompt = `Come up with a question on the topic "${learningTopic}" to test your students. It should be a ${questionType} question. Ask in ${language} language`

    let response = null;
    switch(questionType) {
      case('single_choice'): {
        response = await this.singleChoiseModel.invoke(systemPrompt + '\n\n' + userPrompt)
        break;
      }
      case('multiple_choice'): {
        response = await this.multiChoiseModel.invoke(systemPrompt + '\n\n' + userPrompt)
        break;
      }
      case('text_input'): {
        response = await this.multiChoiseModel.invoke(systemPrompt + '\n\n' + userPrompt) // TODO заглушка
        break;
      }
    }

    // TODO Проверять, что вообще в response и, если там пусто - делать повторный запрос
    
    return { ...response, type: questionType };
  }
}
