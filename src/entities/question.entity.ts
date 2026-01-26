import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';


export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SINGLE_CHOICE = 'single_choice',
  TEXT_INPUT = 'text_input',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.questions)
  user: User;

  @Column({ type: 'enum', enum: QuestionType, nullable: false })
  type: QuestionType;

  @Column({ nullable: false })
  topic: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ nullable: true })
  answer: string;

  @Column({ nullable: false })
  correctAnswer: string;

  @Column({ nullable: false, type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ type: 'text', nullable: false })
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
