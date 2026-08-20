import { Repository, DataSource } from "typeorm";
import { UserInvite } from "../entities/UserInvite";
import { Users } from "../entities/Users";

export interface NewInvite {
  tokenHash: string;
  email: string;
  firstName: string;
  lastName: string;
  createdBy: number;
  expiresAt: Date;
}

export interface InviteRecord {
  email: string;
  firstName: string;
  expiresAt: Date;
  redeemedAt: Date | null;
}

export interface CreatedUser {
  userId: number;
  firstName: string;
  lastName: string;
  payDay: number;
}

export interface IUserInviteRepository {
  emailInUse(email: string): Promise<boolean>;
  expireOutstandingForEmail(email: string): Promise<void>;
  create(invite: NewInvite): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<InviteRecord | null>;
  claimAndCreateUser(tokenHash: string, passwordHash: string): Promise<CreatedUser | null>;
}

export class UserInviteRepository implements IUserInviteRepository {
  private inviteRepository: Repository<UserInvite>;
  private usersRepository: Repository<Users>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.inviteRepository = dataSource.getRepository(UserInvite);
    this.usersRepository = dataSource.getRepository(Users);
  }

  async emailInUse(email: string): Promise<boolean> {
    const count = await this.usersRepository.count({ where: { email } });
    return count > 0;
  }

  async expireOutstandingForEmail(email: string): Promise<void> {
    try {
      await this.dataSource.query(
        `UPDATE user_invites SET expires_at = NOW()
          WHERE email = $1 AND redeemed_at IS NULL AND expires_at > NOW()`,
        [email]
      );
    } catch (error) {
      throw new Error(`Error expiring outstanding invites: ${error}`);
    }
  }

  async create(invite: NewInvite): Promise<void> {
    try {
      await this.inviteRepository.insert({
        token_hash: invite.tokenHash,
        email: invite.email,
        first_name: invite.firstName,
        last_name: invite.lastName,
        created_by: invite.createdBy,
        expires_at: invite.expiresAt,
      });
    } catch (error) {
      throw new Error(`Error creating invite: ${error}`);
    }
  }

  async findByTokenHash(tokenHash: string): Promise<InviteRecord | null> {
    const invite = await this.inviteRepository.findOne({
      where: { token_hash: tokenHash },
    });

    if (!invite) {
      return null;
    }

    return {
      email: invite.email,
      firstName: invite.first_name.trim(),
      expiresAt: invite.expires_at,
      redeemedAt: invite.redeemed_at,
    };
  }

  // One statement, therefore atomic. On a concurrent redeem the loser re-evaluates the WHERE
  // against the committed row, matches zero, sources zero rows into the INSERT, and returns [].
  // A failed INSERT (duplicate email) rolls the burn back too, so the invite survives to retry.
  async claimAndCreateUser(tokenHash: string, passwordHash: string): Promise<CreatedUser | null> {
    const rows = await this.dataSource.query(
      `WITH claimed AS (
         UPDATE user_invites
            SET redeemed_at = NOW()
          WHERE token_hash = $1 AND redeemed_at IS NULL AND expires_at > NOW()
         RETURNING email, first_name, last_name
       )
       INSERT INTO users (first_name, last_name, email, password_hash)
       SELECT first_name, last_name, email, $2 FROM claimed
       RETURNING user_id, first_name, last_name, pay_day`,
      [tokenHash, passwordHash]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return {
      userId: Number(rows[0].user_id),
      firstName: rows[0].first_name.trim(),
      lastName: rows[0].last_name.trim(),
      payDay: Number(rows[0].pay_day),
    };
  }
}
