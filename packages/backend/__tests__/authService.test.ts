import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService, InvalidCredentialsError } from '../src/services/AuthService';
import { Users } from '../src/entities/Users';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersRepo: { findOne: jest.Mock };
  const ORIGINAL_SECRET = process.env.JWT_SECRET;

  const sampleUser: Partial<Users> = {
    user_id: 2,
    first_name: 'Demo',
    email: 'admin',
    password_hash: 'hashed-admin',
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    mockUsersRepo = { findOne: jest.fn() };
    const mockDataSource = { getRepository: jest.fn(() => mockUsersRepo) } as any;
    service = new AuthService(mockDataSource);
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  });

  describe('login (success)', () => {
    it('should return a signed token and the user identity on valid credentials', async () => {
      mockUsersRepo.findOne.mockResolvedValue(sampleUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedJwt.sign as jest.Mock).mockReturnValue('signed.jwt.token');

      const result = await service.login('admin', 'admin');

      expect(result.token).toBe('signed.jwt.token');
      expect(result.user).toEqual({ userId: 2, firstName: 'Demo' });
    });

    it('should look the user up by email', async () => {
      mockUsersRepo.findOne.mockResolvedValue(sampleUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedJwt.sign as jest.Mock).mockReturnValue('t');

      await service.login('admin', 'admin');

      expect(mockUsersRepo.findOne).toHaveBeenCalledWith({ where: { email: 'admin' } });
    });

    it('should compare the supplied password against the stored hash', async () => {
      mockUsersRepo.findOne.mockResolvedValue(sampleUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedJwt.sign as jest.Mock).mockReturnValue('t');

      await service.login('admin', 'plaintext-pw');

      expect(mockedBcrypt.compare).toHaveBeenCalledWith('plaintext-pw', 'hashed-admin');
    });

    it('should sign the token with the userId payload and a 7-day expiry', async () => {
      mockUsersRepo.findOne.mockResolvedValue(sampleUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedJwt.sign as jest.Mock).mockReturnValue('t');

      await service.login('admin', 'admin');

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId: 2 },
        'test-secret',
        { expiresIn: '7d' }
      );
    });
  });

  describe('login (failure)', () => {
    it('should throw InvalidCredentialsError when no user matches the email', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);

      await expect(service.login('nobody', 'pw')).rejects.toThrow(InvalidCredentialsError);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsError when the user has no password hash', async () => {
      mockUsersRepo.findOne.mockResolvedValue({ ...sampleUser, password_hash: null });

      await expect(service.login('admin', 'pw')).rejects.toThrow(InvalidCredentialsError);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsError when the password does not match', async () => {
      mockUsersRepo.findOne.mockResolvedValue(sampleUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('admin', 'wrong')).rejects.toThrow(InvalidCredentialsError);
      expect(mockedJwt.sign).not.toHaveBeenCalled();
    });

    it('should not leak whether it was the email or the password that was wrong', async () => {
      // both the "no user" and "bad password" paths surface the same message
      mockUsersRepo.findOne.mockResolvedValue(null);
      const noUser = await service.login('x', 'y').catch(e => e.message);

      mockUsersRepo.findOne.mockResolvedValue(sampleUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);
      const badPw = await service.login('admin', 'y').catch(e => e.message);

      expect(noUser).toBe(badPw);
      expect(noUser).toBe('Invalid email or password');
    });

    it('should throw a configuration error when JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET;

      await expect(service.login('admin', 'admin')).rejects.toThrow('JWT_SECRET is not configured');
    });
  });
});
