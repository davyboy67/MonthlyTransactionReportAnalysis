import { Repository, DataSource } from 'typeorm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Users } from '../entities/Users';

// password hash generation
// node -e "console.log(require('bcryptjs').hashSync('admin', 10))"

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export interface UserProfile {
  userId: number;
  firstName: string;
  lastName: string;
  payDay: number;
  isOwner: boolean;
}

export interface LoginResult {
  token: string;
  user: UserProfile;
}

export class UserNotFoundError extends Error {
  constructor() {
    super('User not found');
    this.name = 'UserNotFoundError';
  }
}

const TOKEN_EXPIRY = '7d';

// Creating invites is restricted to this user. A single owner is the whole access model, so
// there is no role column -- see requireOwner middleware.
export const OWNER_USER_ID = 1;

export function signToken(userId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId }, secret, { expiresIn: TOKEN_EXPIRY });
}

export class AuthService {
  private usersRepository: Repository<Users>;

  constructor(dataSource: DataSource) {
    this.usersRepository = dataSource.getRepository(Users);
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user || !user.password_hash) {
      throw new InvalidCredentialsError();
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      throw new InvalidCredentialsError();
    }

    return {
      token: signToken(user.user_id),
      user: {
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        payDay: user.pay_day,
        isOwner: user.user_id === OWNER_USER_ID,
      },
    };
  }

  async getProfile(userId: number): Promise<UserProfile> {
    const user = await this.usersRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      userId: user.user_id,
      firstName: user.first_name.trim(),
      lastName: user.last_name.trim(),
      payDay: user.pay_day,
      isOwner: user.user_id === OWNER_USER_ID,
    };
  }

  async updatePayDay(userId: number, payDay: number): Promise<UserProfile> {
    const result = await this.usersRepository.update({ user_id: userId }, { pay_day: payDay });
    if (result.affected === 0) {
      throw new UserNotFoundError();
    }
    return this.getProfile(userId);
  }
}
