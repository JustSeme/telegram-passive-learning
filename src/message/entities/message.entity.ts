import { User } from "src/user/entities/user.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: number;

  @Column()
  chatId: number;

  @Column()
  userId: number;

  @Column({ type: 'integer' })
  sentAt: number;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;
}