import { Context, Scenes } from 'telegraf';
import { User } from '../../user/entities/user.entity';

export interface BotSession extends Scenes.SceneSession {
  user?: User;
}

export interface BotContext extends Context, Scenes.SceneContext {
  session: BotSession;
}
