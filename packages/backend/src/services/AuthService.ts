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

export class AuthService {
  private usersRepository: Repository<Users>;

  constructor(dataSource: DataSource) {
    this.usersRepository = dataSource.getRepository(Users);
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

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

    const token = jwt.sign({ userId: user.user_id }, secret, {
      expiresIn: TOKEN_EXPIRY,
    });

    return {
      token,
      user: {
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
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
    };
  }
}
