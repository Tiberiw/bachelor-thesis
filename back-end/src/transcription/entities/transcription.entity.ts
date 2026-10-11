import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('transcriptions')
@Index(['doctorId'])
export class Transcription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  doctorId: string;

  @Column()
  patientId: string;

  @Column({ type: 'text', nullable: true })
  transcription: string | null; // Nullable since transcription happens after creation

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: "recorded" })
  status: "recording" | "recorded" | "transcribing" | "ready" | "failed";

  @Column()
  duration: number;
}
