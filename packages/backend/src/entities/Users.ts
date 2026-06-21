import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { ReportAnalysis } from "./ReportAnalysis";
import { Transaction } from "./Transaction";
import { Budget } from "./Budget";

@Entity("users")
export class Users {
  @PrimaryGeneratedColumn({ name: "user_id" })
  user_id!: number;

  @Column({ type: "varchar", length: 256 })
  first_name!: string;

  @Column({ type: "varchar", length: 256 })
  last_name!: string;

  @Column({ type: "varchar", length: 256 })
  email!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  password_hash!: string | null;

  @OneToMany(() => ReportAnalysis, (reportAnalysis) => reportAnalysis.user)
  reportAnalyses!: ReportAnalysis[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions!: Transaction[];

  @OneToMany(() => Budget, (budget) => budget.user)
  budgets!: Budget[];
}
