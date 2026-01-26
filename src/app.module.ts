import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './telegram/telegram.module';
import { Question } from './telegram/entities/question.entity';
import { Message } from './message/entities/message.entity';
import { MessageModule } from './message/message.module';
import { session } from 'telegraf';
import { User } from './user/entities/user.entity';
import { userMiddleware } from './telegram/middlewares/user.middleware';
import { UserService } from './user/user.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_DATABASE || './data/bot.db',
      entities: [User, Question, Message],
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true',
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule, TelegramModule],
      useFactory: (configService: ConfigService, userService: UserService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
        middlewares: [
          session(),
          userMiddleware(userService),
        ],
      }),
      inject: [ConfigService, UserService],
    }),
    TelegramModule,
    MessageModule,
  ],
  controllers: [],
})
export class AppModule {}
