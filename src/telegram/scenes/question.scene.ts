import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, On, Ctx, SceneLeave } from 'nestjs-telegraf';
import { BotContext } from '../interfaces/context.interface';
import { MessageService } from 'src/message/message.service';
import { TelegramUpdate } from '../telegram.update';
import { OpenAIService } from 'src/llm/openai.service';

@Scene('question')
@Injectable()
export class QuestionScene {
  constructor(
    private messageService: MessageService,
    private telegramUpdate: TelegramUpdate,
    private openAIService: OpenAIService,
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

    const question = await this.openAIService.generateQuestion(user.learningTopic);
    
    const questionKeyboard = await this.messageService.getButton('backToMenu');

    await this.messageService.editOrSendAndSave(ctx, question, questionKeyboard);
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

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: BotContext) {
    await this.telegramUpdate.startCommand(ctx);
  }
}
