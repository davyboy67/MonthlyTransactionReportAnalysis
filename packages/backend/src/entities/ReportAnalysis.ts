import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Transaction } from "./Transaction";
import { Users } from "./Users";
import { Budget } from "./Budget";

@Entity("reportanalysis")
export class ReportAnalysis {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer" })
  user_id!: number;

  @Column({ type: "date" })
  report_date!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_income!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_expenses!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_savings!: number | null;

  @Column({ type: "integer", nullable: true })
  budget_id!: number | null;

  @ManyToOne(() => Users, (user) => user.reportAnalyses)
  @JoinColumn({ name: "user_id" })
  user!: Users;

  @ManyToOne(() => Budget, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "budget_id" })
  budget!: Budget | null;

  @OneToMany(() => Transaction, (transaction) => transaction.reportAnalysis)
  transactions!: Transaction[];
}
