import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { ReportAnalysis } from "./ReportAnalysis";

@Entity("report_log")
export class ReportLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer", nullable: true })
  report_analysis_id!: number | null;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  generated_at!: Date;

  @Column({ type: "boolean", default: false })
  email_sent!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  email_sent_at!: Date | null;

  @Column({ type: "bytea", nullable: true })
  pdf_data!: Buffer | null;

  @ManyToOne(() => ReportAnalysis, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "report_analysis_id" })
  reportAnalysis!: ReportAnalysis | null;
}
