import { Context, Scenes } from 'telegraf';

export interface BotContext extends Context, Scenes.SceneContext {
  user?: any;
}
