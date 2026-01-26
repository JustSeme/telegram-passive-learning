import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, On, Ctx, SceneLeave } from 'nestjs-telegraf';
import { BotContext } from '../interfaces/context.interface';
import { MessageService } from 'src/message/message.service';
import { TelegramUpdate } from '../telegram.update';

@Scene('question')
@Injectable()
export class QuestionScene {
  constructor(
    private messageService: MessageService,
    private telegramUpdate: TelegramUpdate
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: BotContext) {
    const user = ctx.session.user;
    
    if (!user) {
      const text = await this.messageService.getMessage('userNotFound');
      await this.messageService.sendAndSave(ctx, text);
      return;
    }

    if (!user.learningTopic) {
      await ctx.scene.enter('topic');
      return;
    }

    const questionText = await this.generateQuestion(user.learningTopic);
    
    const questionKeyboard = await this.messageService.getButton('backToMenu');

    await this.messageService.sendAndSave(ctx, questionText, questionKeyboard);
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: BotContext) {
    const callbackData = (ctx.callbackQuery as any)?.data;

    switch(callbackData) {
      case 'back_to_menu':
        await ctx.scene.leave();
        break;
    }
  }

  private async generateQuestion(topic: string): Promise<string> {
    const questions = {
      'История': '📜 *Вопрос по истории:* В каком году началась Вторая мировая война?',
      'Программирование': '💻 *Вопрос по программированию:* Что такое инкапсуляция в ООП?',
      'Биология': '🧬 *Вопрос по биологии:* Какая клеточная структура отвечает за производство энергии?',
      'Физика': '⚛️ *Вопрос по физике:* Что такое первый закон термодинамики?',
      'default': `🤔 *Вопрос по теме "${topic}":* Расскажите о ключевых концепциях в этой области.`
    };

    return questions[topic] || questions.default;
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: BotContext) {
    await this.telegramUpdate.startCommand(ctx);
  }
}
