import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, On, Ctx, Message, SceneLeave } from 'nestjs-telegraf';
import { BotContext } from '../interfaces/context.interface';
import { MessageService } from 'src/message/message.service';
import { TelegramUpdate } from '../telegram.update';

// Сцена профиля пользователя
@Scene('profile')
@Injectable()
export class ProfileScene {
  constructor(
    private messageService: MessageService,
    private telegramUpdate: TelegramUpdate
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: BotContext) {
    const user = ctx.session.user;
    
    if (!user) {
      const text = await this.messageService.getMessage('userNotFound');
      await this.messageService.editOrSendAndSave(ctx, text);
      return;
    }

    const createdAt = new Date(user.createdAt).toLocaleDateString('ru-RU');
    const learningTopic = user.learningTopic || 'Не выбрана';

    const text = await this.messageService.getMessage('profileInfo', {
      name: user.name,
      telegramId: user.telegramId,
      learningTopic,
      createdAt
    });

    const keyboard = await this.messageService.getButton('profile');

    await this.messageService.editOrSendAndSave(ctx, text, keyboard);
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: BotContext) {
    const callbackData = (ctx.callbackQuery as any)?.data;

    switch(callbackData) {
      case 'back_to_menu':
        await ctx.scene.leave();
        break;
      case 'update_learning_topic':
        await ctx.scene.enter('topic')
        break;
    }
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: BotContext) {
    await this.telegramUpdate.startCommand(ctx);
  }
}
