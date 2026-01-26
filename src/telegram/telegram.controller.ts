import { Controller, Get } from '@nestjs/common';

@Controller('telegram')
export class TelegramController {
  constructor() {}

  @Get('status')
  getStatus() {
    return { status: 'Telegram bot is running' };
  }
}
