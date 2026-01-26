import { Module } from '@nestjs/common';
import { Question } from './entities/question.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramUpdate } from './telegram.update';
import { TelegramController } from './telegram.controller';
import { MessageModule } from 'src/message/message.module';
import { UserModule } from 'src/user/user.module';
import { TopicScene } from './scenes/topic.scene';
import { ProfileScene } from './scenes/profile.scene';
import { QuestionScene } from './scenes/question.scene';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question]),
    MessageModule,
    UserModule,
  ],
  providers: [TelegramUpdate, TopicScene, ProfileScene, QuestionScene],
  controllers: [TelegramController],
  exports: [UserModule]
})
export class TelegramModule {}
