import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Question } from '../entities/question.entity';
import { Context } from 'telegraf';
import { Message } from 'src/entities/message.entity';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined');
    }
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    await this.setupBot();
    await this.bot.launch();
    console.log('Telegram bot started successfully');
  }

  private async setupBot() {
    this.bot.start(async (ctx: Context) => {
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
          name: telegramUser.first_name + ' ' + telegramUser.last_name,
        });
        await this.userRepository.save(user);
      }

      
    });

    this.bot.on('message', async (ctx: Context) => {
      await ctx.reply(
        'I\'m here to help you learn passively! Use /help to see available commands.',
      );
    });

    this.bot.catch((err, ctx) => {
      console.error(`Error for ${ctx.updateType}:`, err);
      ctx.reply('Sorry, something went wrong. Please try again.');
    });
  }

  async onModuleDestroy() {
    this.bot.stop('Stopping bot...');
  }
}
