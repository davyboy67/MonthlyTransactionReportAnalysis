import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Users } from './Users';
import { BudgetCategory } from './BudgetCategory';

@Entity('budget')
export class Budget {
  @PrimaryGeneratedColumn()
  budget_id!: number;

  @Column({ type: 'integer' })
  user_id!: number;

  @Column('date')
  budget_month!: Date;

  @Column('varchar', { length: 255, nullable: true })
  notes!: string | null;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column('timestamp', { nullable: true })
  updated_at!: Date | null;

  @ManyToOne(() => Users, user => user.budgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Users;

  @OneToMany(() => BudgetCategory, category => category.budget)
  categories!: BudgetCategory[];
}
