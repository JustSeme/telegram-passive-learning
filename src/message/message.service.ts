import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { Repository } from "typeorm";
import * as fs from 'fs';
import * as path from 'path';
import { MessageParams } from "./interfaces/message-params.interface";
import { BotContext } from "src/telegram/interfaces/context.interface";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";

@Injectable()
export class MessageService {
    private messagesData: any;

    constructor(
        @InjectRepository(Message)
        private messageRepository: Repository<Message>
    ) {
        this.loadMessages();
    }

    private loadMessages(): void {
        const messagesPath = path.join(process.cwd(), 'src', 'assets', 'messages.json');
        this.messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
    }

    public async getMessage(messageId: string, params: MessageParams = {}, language: string = 'ru') {
        const message = this.messagesData[messageId];
        if (!message) {
            throw new Error(`Message with id "${messageId}" not found`);
        }
        
        let localizedMessage = message[language];
        if (!localizedMessage) {
            throw new Error(`Message "${messageId}" not available for language: ${language}`);
        }
        
        for (const [key, value] of Object.entries(params)) {
            const placeholder = `{${key}}`;
            if (localizedMessage.includes(placeholder)) {
                localizedMessage = localizedMessage.replace(new RegExp(`{${key}}`, 'g'), String(value));
            }
        }
        
        return localizedMessage;
    }

    public async sendAndSave(ctx: BotContext, text: string, extra: ExtraReplyMessage = {}) {
        try {
            const message = await ctx.reply(text, { parse_mode: 'Markdown', ...JSON.parse(JSON.stringify(extra)) });

            await this.messageRepository.save({
                chatId: ctx.chat.id,
                messageId: message.message_id,
                userId: ctx.user.id,
                sentAt: Date.now()
            });
        } catch (err) {
            console.error('Error sending and save message: ', err);
            throw err;
        }
        return
    }
}
