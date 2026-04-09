import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ReportAnalysis } from "./ReportAnalysis";
import { Users } from "./Users";

@Entity("transaction")
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer" })
  report_analysis_id!: number;

  @Column({ type: "integer" })
  user_id!: number; //TODO: redundant - remove

  @Column({ type: "date" })
  date!: Date;

  @Column({ type: "varchar" })
  description!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: "varchar" })
  category!: string;

  @Column({ type: "varchar" })
  merchant!: string;

  @Column({ type: "varchar" })
  type!: string;

  @ManyToOne(
    () => ReportAnalysis,
    (reportAnalysis) => reportAnalysis.transactions,
  )
  @JoinColumn({ name: "report_analysis_id" })
  reportAnalysis!: ReportAnalysis;

  @ManyToOne(() => Users, (user) => user.transactions)
  @JoinColumn({ name: "user_id" })
  user!: Users;
}
