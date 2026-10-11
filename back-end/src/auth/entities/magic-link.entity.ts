import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class MagicLink {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column({ default: false })
  used: boolean;

  @Column()
  expiresAt: Date;

  @Column()
  email: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}