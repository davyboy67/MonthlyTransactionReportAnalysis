import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Transaction } from './Transaction';

@Entity('reportanalysis')
export class ReportAnalysis {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  report_date!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_income!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_expenses!: number;

  @OneToMany(() => Transaction, transaction => transaction.reportAnalysis)
  transactions!: Transaction[];
}
