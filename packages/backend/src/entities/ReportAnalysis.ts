import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Transaction } from './Transaction';
import { User } from './User';

@Entity('reportanalysis')
export class ReportAnalysis {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column({ type: 'date' })
  report_date!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_income!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_expenses!: number;

  @ManyToOne(() => User, user => user.reportAnalyses)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Transaction, transaction => transaction.reportAnalysis)
  transactions!: Transaction[];
}
