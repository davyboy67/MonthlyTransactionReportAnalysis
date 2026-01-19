import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ReportAnalysis } from './ReportAnalysis';

@Entity('transaction')
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  report_analysis_id!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column()
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column()
  category!: string;

  @Column()
  merchant!: string;

  @ManyToOne(() => ReportAnalysis, reportAnalysis => reportAnalysis.transactions)
  @JoinColumn({ name: 'report_analysis_id' })
  reportAnalysis!: ReportAnalysis;
}
