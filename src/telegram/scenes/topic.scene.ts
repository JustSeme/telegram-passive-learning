import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, Ctx, On, Message } from 'nestjs-telegraf';
import { BotContext } from '../interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { MessageService } from 'src/message/message.service';

// Сцена запроса и записи темы обучения
@Scene('topic')
@Injectable()
export class TopicScene {
  constructor(
    private messageService: MessageService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: BotContext) {
    let text = '';

    if(ctx.user?.learningTopic) {
      text = await this.messageService.getMessage('hasTopic', {
        topic: ctx.user.learningTopic
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
      // Находим и обновляем пользователя
      const user = await this.userRepository.findOne({
        where: { telegramId: telegramUserId },
      });

      if (user) {
        ctx.user = user;
        user.learningTopic = topic;
        await this.userRepository.save(user);
        
        const text = await this.messageService.getMessage('topicSaved', { topic });
        await this.messageService.sendAndSave(ctx, text);
        
        // Выход из сцены произойдет автоматически после успешного выполнения
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
