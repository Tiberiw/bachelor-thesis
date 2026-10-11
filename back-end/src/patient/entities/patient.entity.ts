import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('patients')
@Index(['doctorId'])
export class Patient {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  doctorId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  dob: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  gender: string;

  @Column()
  lastVisit: Date;
}
