import { Module } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Question } from './entities/question.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { MessageModule } from 'src/message/message.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Question]), MessageModule],
  providers: [TelegramService],
  controllers: [TelegramController],
})
export class TelegramModule {}
