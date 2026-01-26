import { Module } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Question } from './entities/question.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramUpdate } from './telegram.update';
import { TelegramController } from './telegram.controller';
import { MessageModule } from 'src/message/message.module';
import { TopicScene } from './scenes/topic.scene';

@Module({
  imports: [TypeOrmModule.forFeature([User, Question]), MessageModule],
  providers: [TelegramUpdate, TopicScene],
  controllers: [TelegramController],
})
export class TelegramModule {}
