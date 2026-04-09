import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Budget } from "./Budget";

@Entity("budget_category")
export class BudgetCategory {
  @PrimaryGeneratedColumn()
  category_id!: number;

  @Column()
  budget_id!: number;

  @Column("varchar", { length: 255 })
  category_name!: string;

  @Column("numeric", { precision: 10, scale: 2 })
  amount!: number;

  @ManyToOne(() => Budget, (budget) => budget.categories, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "budget_id" })
  budget!: Budget;
}
