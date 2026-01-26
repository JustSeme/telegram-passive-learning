import { Middleware } from 'telegraf';
import { BotContext } from '../interfaces/context.interface';
import { UserService } from '../../user/user.service';

export const userMiddleware = (userService: UserService): Middleware<BotContext> => {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    if (ctx.session?.user) {
      return next();
    }

    const telegramUser = ctx.from;
    if (!telegramUser) {
      return next();
    }

    try {
      let user = await userService.findUserByTelegramId(telegramUser.id);

      if (!user) {
        user = await userService.createUser({
          telegramId: telegramUser.id,
          username: telegramUser.username,
          name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
        });
      }

      ctx.session = ctx.session || {};
      ctx.session.user = user;
    } catch (error) {
      console.error('Error in user middleware:', error);
    }

    return next();
  };
};
