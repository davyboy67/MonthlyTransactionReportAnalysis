import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { IUserInviteRepository } from '../repositories/userInviteRepository';
import { LoginResult, signToken, OWNER_USER_ID } from './AuthService';

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('That email address already has an account');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class InviteNotFoundError extends Error {
  constructor() {
    super('This invite link is not valid');
    this.name = 'InviteNotFoundError';
  }
}

// Message is supplied per case so "expired" stays distinguishable from "already used"
// without needing a class for each.
export class InviteUnusableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InviteUnusableError';
  }
}

export interface CreateInviteInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface InvitePreview {
  email: string;
  firstName: string;
}

export interface IInviteService {
  createInvite(
    ownerUserId: number,
    input: CreateInviteInput
  ): Promise<{ token: string; expiresAt: Date }>;
  validateInvite(token: string): Promise<InvitePreview>;
  redeemInvite(token: string, password: string): Promise<LoginResult>;
}

const INVITE_TTL_HOURS = 72;
export const MIN_PASSWORD_LENGTH = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class InviteService implements IInviteService {
  constructor(private inviteRepository: IUserInviteRepository) {}

  async createInvite(
    ownerUserId: number,
    input: CreateInviteInput
  ): Promise<{ token: string; expiresAt: Date }> {
    const email = normaliseEmail(input.email);

    if (await this.inviteRepository.emailInUse(email)) {
      throw new EmailAlreadyRegisteredError();
    }

    // 32 bytes is unguessable, so the stored SHA-256 needs no salt or work factor -- there is
    // no low-entropy secret to slow an attacker down on.
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    // Re-inviting the same address supersedes the old link, so a lost message self-heals.
    await this.inviteRepository.expireOutstandingForEmail(email);

    await this.inviteRepository.create({
      tokenHash: hashToken(token),
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      createdBy: ownerUserId,
      expiresAt,
    });

    return { token, expiresAt };
  }

  // Pure read: link-preview bots and React StrictMode's double effect must not consume an
  // invite. Consumption happens in redeemInvite.
  async validateInvite(token: string): Promise<InvitePreview> {
    const invite = await this.inviteRepository.findByTokenHash(hashToken(token));

    if (!invite) {
      throw new InviteNotFoundError();
    }
    if (invite.redeemedAt) {
      throw new InviteUnusableError('This invite link has already been used');
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new InviteUnusableError('This invite link has expired');
    }

    return { email: invite.email, firstName: invite.firstName };
  }

  async redeemInvite(token: string, password: string): Promise<LoginResult> {
    const tokenHash = hashToken(token);
    const passwordHash = await bcrypt.hash(password, 10);

    let created;
    try {
      created = await this.inviteRepository.claimAndCreateUser(tokenHash, passwordHash);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }

    if (!created) {
      // The claim matched nothing. Re-read to say exactly why rather than guessing.
      const invite = await this.inviteRepository.findByTokenHash(tokenHash);
      if (!invite) {
        throw new InviteNotFoundError();
      }
      if (invite.redeemedAt) {
        throw new InviteUnusableError('This invite link has already been used');
      }
      throw new InviteUnusableError('This invite link has expired');
    }

    return {
      token: signToken(created.userId),
      user: {
        userId: created.userId,
        firstName: created.firstName,
        lastName: created.lastName,
        payDay: created.payDay,
        isOwner: created.userId === OWNER_USER_ID,
      },
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; driverError?: { code?: string } })?.code;
  const driverCode = (error as { driverError?: { code?: string } })?.driverError?.code;
  return code === '23505' || driverCode === '23505';
}
