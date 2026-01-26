import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    public async findUserByTelegramId(telegramId: number): Promise<User | undefined> {
        return this.userRepository.findOne({ where: { telegramId } });
    }

    public async updateUser(user: Partial<User>): Promise<User> {
        return this.userRepository.save(user);
    }

    public async createUser(user: Partial<User>): Promise<User> {
        return this.userRepository.save(user);
    }
}