import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, Ctx, On, Message, SceneLeave } from 'nestjs-telegraf';
import { BotContext } from '../interfaces/context.interface';
import { MessageService } from 'src/message/message.service';
import { UserService } from 'src/user/user.service';
import { TelegramUpdate } from '../telegram.update';

// Сцена запроса и записи темы обучения
@Scene('topic')
@Injectable()
export class TopicScene {
  constructor(
    private messageService: MessageService,
    private userService: UserService,
    private telegramUpdate: TelegramUpdate,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: BotContext) {
    let text = '';
    let keyboard = null;

    if(ctx.session.user?.learningTopic) {
      text = await this.messageService.getMessage('hasTopic', {
        topic: ctx.session.user.learningTopic
      });
      keyboard = await this.messageService.getButton('backToMenu')
    } else {
      text = await this.messageService.getMessage('noTopic');
      keyboard = await this.messageService.getButton('backToMenu')
    }
      
    await this.messageService.editOrSendAndSave(ctx, text, keyboard);
  }

  @On('message')
  async onMessage(@Ctx() ctx: BotContext, @Message('text') text: string) {
    const topic = text.trim();
    
    if (topic.length <= 2 || topic.length >= 50) {
      const text = await this.messageService.getMessage('topicLengthError');
      await this.messageService.editOrSendAndSave(ctx, text);
      return;
    }

    try {
      const user = ctx.session.user;

      if (user) {
        user.learningTopic = topic;
        await this.userService.updateUser(user);
        ctx.session.user = user;
        
        const text = await this.messageService.getMessage('topicSaved', { topic });
        await this.messageService.editOrSendAndSave(ctx, text);
        
        return;
      } else {
        const text = await this.messageService.getMessage('userNotFound');
        await this.messageService.editOrSendAndSave(ctx, text);
        return;
      }
    } catch (error) {
      console.error('Error saving learning topic:', error);
      const text = await this.messageService.getMessage('topicSaveError');
      await this.messageService.editOrSendAndSave(ctx, text);
      return;
    }
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
