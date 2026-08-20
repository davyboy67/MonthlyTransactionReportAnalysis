import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("user_invites")
export class UserInvite {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64 })
  token_hash!: string;

  @Column({ type: "varchar", length: 256 })
  email!: string;

  @Column({ type: "varchar", length: 256 })
  first_name!: string;

  @Column({ type: "varchar", length: 256 })
  last_name!: string;

  @Column({ type: "integer" })
  created_by!: number;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  created_at!: Date;

  @Column({ type: "timestamptz" })
  expires_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  redeemed_at!: Date | null;
}
