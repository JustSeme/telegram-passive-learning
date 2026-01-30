import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, On, Ctx, SceneLeave } from 'nestjs-telegraf';
import { BotContext } from '../interfaces/context.interface';
import { MessageService } from 'src/message/message.service';
import { TelegramUpdate } from '../telegram.update';
import { OpenAIService } from 'src/llm/openai.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Question, QuestionType } from '../entities/question.entity';
import { Repository } from 'typeorm';

@Scene('question')
@Injectable()
export class QuestionScene {
  constructor(
    private messageService: MessageService,
    private telegramUpdate: TelegramUpdate,
    private openAIService: OpenAIService,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: BotContext) {
    const user = ctx.session.user;
    
    if (!user) {
      const text = await this.messageService.getMessage('userNotFound');
      await this.messageService.editOrSendAndSave(ctx, text);
      return;
    }

    if (!user.learningTopic) {
      await ctx.scene.enter('topic');
      return;
    }

    const generatedQuestion = await this.openAIService.generateQuestion(user.learningTopic);
    console.log(generatedQuestion);
    
    await this.questionRepository.save({
      userId: user.id,
      type: generatedQuestion.type,
      topic: user.learningTopic,
      content: generatedQuestion.questionText,
      correctAnswers: generatedQuestion.correctAnswers.join(';'),
      explanation: generatedQuestion.explanation
    })

    let keyboard = null;
    let answerButtons = null;
    if(generatedQuestion.type !== QuestionType.TEXT_INPUT) {
      keyboard = await this.messageService.getButton('backToMenu');
      answerButtons = await this.messageService.getAnswerButtons((generatedQuestion as any).options);
      keyboard.reply_markup.inline_keyboard.push(...answerButtons);
    }

    await this.messageService.editOrSendAndSave(ctx, generatedQuestion.questionText, keyboard);
  }

  private async checkAnswer(ctx: BotContext, answerIndex: number) {
    const question = await this.questionRepository.findOne({ where: { userId: ctx.session.user.id } });
    
    if (!question) {
      const text = await this.messageService.getMessage('questionNotFound');
      await this.messageService.editOrSendAndSave(ctx, text);
      return;
    }

    question.answered += 
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: BotContext) {
    const callbackData = (ctx.callbackQuery as any)?.data;

    let answerIndex = null;
    switch(callbackData) {
      case 'back_to_menu':
        await ctx.scene.leave();
        break;
      case '0':
        answerIndex = 0;
        break;
      case '1':
        answerIndex = 1;
        break;
      case '2':
        answerIndex = 2;
        break;
      case '3':
        answerIndex = 3;
        break;
      case '4':
        answerIndex = 4;
        break;
      case '5':
        answerIndex = 5;
        break;
    }

    await this.checkAnswer(ctx, answerIndex);
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: BotContext) {
    await this.telegramUpdate.startCommand(ctx);
  }
}
