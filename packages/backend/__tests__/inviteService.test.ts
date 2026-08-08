import {
  InviteService,
  EmailAlreadyRegisteredError,
  InviteNotFoundError,
  InviteUnusableError,
} from '../src/services/InviteService';
import { IUserInviteRepository } from '../src/repositories/userInviteRepository';

const TEST_SECRET = 'test-secret';

describe('InviteService', () => {
  let service: InviteService;
  let mockRepository: jest.Mocked<IUserInviteRepository>;
  const ORIGINAL_SECRET = process.env.JWT_SECRET;

  const createdUser = { userId: 5, firstName: 'Bob', lastName: 'Smith', payDay: 26 };

  const futureInvite = {
    email: 'bob@example.com',
    firstName: 'Bob',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    redeemedAt: null,
  };

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    mockRepository = {
      emailInUse: jest.fn(),
      expireOutstandingForEmail: jest.fn(),
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      claimAndCreateUser: jest.fn(),
    };
    service = new InviteService(mockRepository);
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  });

  describe('createInvite', () => {
    it('should never persist the raw token, only its sha256', async () => {
      mockRepository.emailInUse.mockResolvedValue(false);

      const result = await service.createInvite(1, {
        email: 'bob@example.com',
        firstName: 'Bob',
        lastName: 'Smith',
      });

      const persisted = mockRepository.create.mock.calls[0][0];
      expect(persisted.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(persisted.tokenHash).not.toBe(result.token);
      expect(result.token.length).toBeGreaterThan(40);
    });

    it('should normalise the email to lowercase and trim it', async () => {
      mockRepository.emailInUse.mockResolvedValue(false);

      await service.createInvite(1, {
        email: '  Bob@Example.COM ',
        firstName: 'Bob',
        lastName: 'Smith',
      });

      expect(mockRepository.emailInUse).toHaveBeenCalledWith('bob@example.com');
      expect(mockRepository.create.mock.calls[0][0].email).toBe('bob@example.com');
    });

    it('should supersede outstanding invites before creating the new one', async () => {
      mockRepository.emailInUse.mockResolvedValue(false);

      await service.createInvite(1, {
        email: 'bob@example.com',
        firstName: 'Bob',
        lastName: 'Smith',
      });

      const supersedeOrder =
        mockRepository.expireOutstandingForEmail.mock.invocationCallOrder[0];
      const createOrder = mockRepository.create.mock.invocationCallOrder[0];
      expect(supersedeOrder).toBeLessThan(createOrder);
    });

    it('should record the owner who issued the invite and a future expiry', async () => {
      mockRepository.emailInUse.mockResolvedValue(false);

      const result = await service.createInvite(1, {
        email: 'bob@example.com',
        firstName: 'Bob',
        lastName: 'Smith',
      });

      expect(mockRepository.create.mock.calls[0][0].createdBy).toBe(1);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject an email that already has an account', async () => {
      mockRepository.emailInUse.mockResolvedValue(true);

      await expect(
        service.createInvite(1, { email: 'bob@example.com', firstName: 'Bob', lastName: 'Smith' })
      ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('validateInvite', () => {
    it('should return the bound email and name for a usable invite', async () => {
      mockRepository.findByTokenHash.mockResolvedValue(futureInvite);

      const preview = await service.validateInvite('some-token');

      expect(preview).toEqual({ email: 'bob@example.com', firstName: 'Bob' });
    });

    it('should not consume the invite', async () => {
      mockRepository.findByTokenHash.mockResolvedValue(futureInvite);

      await service.validateInvite('some-token');
      await service.validateInvite('some-token');

      expect(mockRepository.claimAndCreateUser).not.toHaveBeenCalled();
    });

    it('should throw InviteNotFoundError for an unknown token', async () => {
      mockRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.validateInvite('nope')).rejects.toBeInstanceOf(InviteNotFoundError);
    });

    it('should distinguish an already-used invite', async () => {
      mockRepository.findByTokenHash.mockResolvedValue({
        ...futureInvite,
        redeemedAt: new Date(),
      });

      await expect(service.validateInvite('t')).rejects.toThrow('already been used');
    });

    it('should distinguish an expired invite', async () => {
      mockRepository.findByTokenHash.mockResolvedValue({
        ...futureInvite,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.validateInvite('t')).rejects.toThrow('has expired');
    });
  });

  describe('redeemInvite', () => {
    it('should return a signed token and the new user profile', async () => {
      mockRepository.claimAndCreateUser.mockResolvedValue(createdUser);

      const result = await service.redeemInvite('some-token', 'a-long-enough-password');

      expect(result.token).toEqual(expect.any(String));
      expect(result.user).toEqual({
        userId: 5,
        firstName: 'Bob',
        lastName: 'Smith',
        payDay: 26,
        isOwner: false,
      });
    });

    it('should store a bcrypt hash, never the raw password', async () => {
      mockRepository.claimAndCreateUser.mockResolvedValue(createdUser);

      await service.redeemInvite('some-token', 'a-long-enough-password');

      const passwordHash = mockRepository.claimAndCreateUser.mock.calls[0][1];
      expect(passwordHash).not.toBe('a-long-enough-password');
      expect(passwordHash.startsWith('$2')).toBe(true);
    });

    it('should look the invite up by hash, not by the raw token', async () => {
      mockRepository.claimAndCreateUser.mockResolvedValue(createdUser);

      await service.redeemInvite('some-token', 'a-long-enough-password');

      expect(mockRepository.claimAndCreateUser.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should report an already-used invite when the claim matches nothing', async () => {
      mockRepository.claimAndCreateUser.mockResolvedValue(null);
      mockRepository.findByTokenHash.mockResolvedValue({
        ...futureInvite,
        redeemedAt: new Date(),
      });

      await expect(service.redeemInvite('t', 'a-long-enough-password')).rejects.toThrow(
        'already been used'
      );
    });

    it('should report an expired invite when the claim matches nothing', async () => {
      mockRepository.claimAndCreateUser.mockResolvedValue(null);
      mockRepository.findByTokenHash.mockResolvedValue({
        ...futureInvite,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.redeemInvite('t', 'a-long-enough-password')).rejects.toBeInstanceOf(
        InviteUnusableError
      );
    });

    it('should report an unknown token when the claim matches nothing', async () => {
      mockRepository.claimAndCreateUser.mockResolvedValue(null);
      mockRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.redeemInvite('t', 'a-long-enough-password')).rejects.toBeInstanceOf(
        InviteNotFoundError
      );
    });

    it('should translate a unique-violation into EmailAlreadyRegisteredError', async () => {
      mockRepository.claimAndCreateUser.mockRejectedValue({ code: '23505' });

      await expect(service.redeemInvite('t', 'a-long-enough-password')).rejects.toBeInstanceOf(
        EmailAlreadyRegisteredError
      );
    });
  });
});
