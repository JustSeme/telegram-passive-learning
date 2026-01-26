import { Injectable } from '@nestjs/common';
import { Update, Start, On, Ctx } from 'nestjs-telegraf';
import { BotContext } from './interfaces/context.interface';
import { MessageService } from '../message/message.service';

@Update()
@Injectable()
export class TelegramUpdate {
  constructor(
    private messageService: MessageService,
  ) {}

  @Start()
  async startCommand(@Ctx() ctx: BotContext) {
    const user = ctx.session.user;
    if (!user) return;

    const text = await this.messageService.getMessage('welcome', {
      name: user.name
    });

    const keyboard = await this.messageService.getButton('welcome')

    await this.messageService.sendAndSave(ctx, text, keyboard);
  } 

  @On('message')
  async onMessage(@Ctx() ctx: BotContext) {
    await this.startCommand(ctx);
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: BotContext) {
    const callbackData = (ctx.callbackQuery as any)?.data;

    switch(callbackData) {
      case('profile'):
        await ctx.scene.enter('profile');
        break;
      case('request_question'):
        await ctx.scene.enter('question');
        break;
    }
  }
}
