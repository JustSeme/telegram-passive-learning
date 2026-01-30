import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { In, Repository } from "typeorm";
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

    public async getAnswerButtons(options: string[]) {
        return options.map((o, i) => [{text: o, callback_data: i}])
    }

    private async sendAndSave(ctx: BotContext, text: string, extra: ExtraReplyMessage = {}) {
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

    public findUserMessages(chatId: number, userId: number): Promise<Message[] | []> {
        return this.messageRepository.find({
            where: { chatId, userId },
            order: { sentAt: 'DESC' }
        });
    }

    public async editOrSendAndSave(ctx: BotContext, text: string, extra: ExtraReplyMessage = {}): Promise<void> {
        try {
            const user = ctx.session.user;
            if (!user) {
                await this.sendAndSave(ctx, text, extra);
                return;
            }

            const userMessages = await this.findUserMessages(ctx.chat.id, user.id);
            const lastMessage = userMessages.at(0)
            userMessages.shift();
            
            // Delete old messages
            await this.messageRepository.delete({ id: In(userMessages.map((m: Message) => m.id)) });
            await Promise.all(userMessages.map((um: Message) => ctx.telegram.deleteMessage(ctx.chat.id, um.messageId)));
            
            if (lastMessage) {
                try {
                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        lastMessage.messageId,
                        undefined,
                        text,
                        { parse_mode: 'Markdown', ...JSON.parse(JSON.stringify(extra)) }
                    );
                } catch (editError) {
                    console.warn('Failed to edit message, sending new one:', editError);
                    await this.sendAndSave(ctx, text, extra);
                }
            } else {
                await this.sendAndSave(ctx, text, extra);
            }
        } catch (err) {
            console.error('Error in editOrSend:', err);
            throw err;
        }
    }
}
