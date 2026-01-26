import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { Repository } from "typeorm";
import * as fs from 'fs';
import * as path from 'path';

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

    public async getMessage(messageId: string, language: string = 'ru') {
        const message = this.messagesData[messageId];
        if (!message) {
            throw new Error(`Message with id "${messageId}" not found`);
        }
        
        const localizedMessage = message[language];
        if (!localizedMessage) {
            throw new Error(`Message "${messageId}" not available for language: ${language}`);
        }
        
        return localizedMessage;
    }
}
