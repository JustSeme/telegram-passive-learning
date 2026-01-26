import { Injectable } from '@nestjs/common';
import { Update, Start, On, Ctx } from 'nestjs-telegraf';
import { BotContext } from './interfaces/context.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { MessageService } from '../message/message.service';

@Update()
@Injectable()
export class TelegramUpdate {
  constructor(
    private messageService: MessageService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Start()
  async startCommand(@Ctx() ctx: BotContext) {
    const telegramUser = ctx.from;
    if (!telegramUser) return;

    // Регистрация пользователя (если отсутствует)
    let user = await this.userRepository.findOne({
      where: { telegramId: telegramUser.id },
    });

    if (!user) {
      user = this.userRepository.create({
        telegramId: telegramUser.id,
        username: telegramUser.username,
        name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
      });
      await this.userRepository.save(user);
    }
    ctx.user = user;

    const text = await this.messageService.getMessage('welcome', {
      name: user.name
    });

    await this.messageService.sendAndSave(ctx, text);
    await ctx.scene.enter('topic');
  } 

  @On('message')
  async onMessage(@Ctx() ctx: BotContext) {
    await this.startCommand(ctx);
  }
}
