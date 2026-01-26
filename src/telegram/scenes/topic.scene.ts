import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, Ctx, On, Message } from 'nestjs-telegraf';
import { BotContext } from '../interfaces/context.interface';
import { MessageService } from 'src/message/message.service';
import { UserService } from 'src/user/user.service';

// Сцена запроса и записи темы обучения
@Scene('topic')
@Injectable()
export class TopicScene {
  constructor(
    private messageService: MessageService,
    private userService: UserService,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: BotContext) {
    let text = '';

    if(ctx.session.user?.learningTopic) {
      text = await this.messageService.getMessage('hasTopic', {
        topic: ctx.session.user.learningTopic
      });
    } else {
      text = await this.messageService.getMessage('noTopic');
    }
      
    await this.messageService.sendAndSave(ctx, text);
  }

  @On('message')
  async onMessage(@Ctx() ctx: BotContext, @Message('text') text: string) {
    const telegramUserId = ctx.from.id

    const topic = text.trim();
    
    if (topic.length <= 2 || topic.length >= 50) {
      const text = await this.messageService.getMessage('topicLengthError');
      await this.messageService.sendAndSave(ctx, text);
      return;
    }

    try {
      const user = ctx.session.user;

      if (user) {
        user.learningTopic = topic;
        await this.userService.updateUser(user);
        ctx.session.user = user; // Обновляем в сессии
        
        const text = await this.messageService.getMessage('topicSaved', { topic });
        await this.messageService.sendAndSave(ctx, text);
        
        return;
      } else {
        const text = await this.messageService.getMessage('userNotFound');
        await this.messageService.sendAndSave(ctx, text);
        return;
      }
    } catch (error) {
      console.error('Error saving learning topic:', error);
      const text = await this.messageService.getMessage('topicSaveError');
      await this.messageService.sendAndSave(ctx, text);
      return;
    }
  }
}
