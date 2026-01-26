import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './telegram/telegram.module';
import { User } from './telegram/entities/user.entity';
import { Question } from './telegram/entities/question.entity';
import { Message } from './message/entities/message.entity';
import { MessageModule } from './message/message.module';
import { session } from 'telegraf';

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
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
        middlewares: [
          session(),
        ],
      }),
      inject: [ConfigService],
    }),
    TelegramModule,
    MessageModule,
  ],
  controllers: [],
})
export class AppModule {}
