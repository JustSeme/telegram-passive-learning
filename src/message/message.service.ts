import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { Repository } from "typeorm";
import * as fs from 'fs';
import * as path from 'path';
import { TemplateParams } from "./interfaces/template-params.interface";
import { BotContext } from "src/telegram/interfaces/context.interface";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";

@Injectable()
export class MessageService {
    private messagesData: any;
    private buttonsData: any;

    constructor(
        @InjectRepository(Message)
        private messageRepository: Repository<Message>
    ) {
        this.loadMessages();
        this.loadButtons();
    }

    private loadMessages(): void {
        const messagesPath = path.join(process.cwd(), 'src', 'assets', 'messages.json');
        this.messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
    }

    private loadButtons(): void {
        const buttonsPath = path.join(process.cwd(), 'src', 'assets', 'buttons.json');
        this.buttonsData = JSON.parse(fs.readFileSync(buttonsPath, 'utf8'));
    }

    public async getMessage(messageId: string, params: TemplateParams = {}, language: string = 'ru') {
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

     public async getButton(buttonId: string, params: TemplateParams = {}, language: string = 'ru') {
        const button = this.buttonsData[buttonId];
        if (!button) {
            throw new Error(`Button with id "${buttonId}" not found`);
        }
        
        let localizedButton = button[language];
        if (!localizedButton) {
            throw new Error(`Button "${buttonId}" not available for language: ${language}`);
        }
        
        for (const [key, value] of Object.entries(params)) {
            const placeholder = `{${key}}`;
            if (localizedButton.includes(placeholder)) {
                localizedButton = localizedButton.replace(new RegExp(`{${key}}`, 'g'), String(value));
            }
        }
        
        return localizedButton;
    }

    public async sendAndSave(ctx: BotContext, text: string, extra: ExtraReplyMessage = {}) {
        try {
            const message = await ctx.reply(text, { parse_mode: 'Markdown', ...JSON.parse(JSON.stringify(extra)) });

            await this.messageRepository.save({
                chatId: ctx.chat.id,
                messageId: message.message_id,
                userId: ctx.session.user.id,
                sentAt: Date.now()
            });
        } catch (err) {
            console.error('Error sending and save message: ', err);
            throw err;
        }
        return
    }
}
