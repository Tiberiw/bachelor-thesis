import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('consultations')
@Index(['doctorId', 'date'])
@Index(['doctorId', 'createdAt'])
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  transcription: string;

  @Column('timestamp with time zone')
  date: Date;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column('uuid')
  @Index()
  doctorId: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
