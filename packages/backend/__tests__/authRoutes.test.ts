import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createAuthRouter } from '../src/routes/authRoutes';
import {
  AuthService,
  InvalidCredentialsError,
  UserNotFoundError,
} from '../src/services/AuthService';

const TEST_SECRET = 'test-secret';

describe('Auth API Routes', () => {
  let app: express.Application;
  let mockAuthService: jest.Mocked<Pick<AuthService, 'login' | 'getProfile'>>;
  const ORIGINAL_SECRET = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    mockAuthService = { login: jest.fn(), getProfile: jest.fn() };
    app = express();
    app.use(express.json());
    app.use('/api/v1', createAuthRouter(mockAuthService as unknown as AuthService));
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  });

  describe('POST /Login', () => {
    it('should return 200 with the token and user on success', async () => {
      mockAuthService.login.mockResolvedValue({
        token: 'signed.jwt',
        user: { userId: 2, firstName: 'Demo', lastName: 'User' },
      });

      const response = await request(app)
        .post('/api/v1/Login')
        .send({ email: 'admin', password: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('signed.jwt');
      expect(response.body.user).toEqual({ userId: 2, firstName: 'Demo', lastName: 'User' });
      expect(mockAuthService.login).toHaveBeenCalledWith('admin', 'admin');
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app).post('/api/v1/Login').send({ password: 'admin' });

      expect(response.status).toBe(400);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app).post('/api/v1/Login').send({ email: 'admin' });

      expect(response.status).toBe(400);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 401 on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new InvalidCredentialsError());

      const response = await request(app)
        .post('/api/v1/Login')
        .send({ email: 'admin', password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 500 on an unexpected error', async () => {
      mockAuthService.login.mockRejectedValue(new Error('JWT_SECRET is not configured'));

      const response = await request(app)
        .post('/api/v1/Login')
        .send({ email: 'admin', password: 'admin' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /Me', () => {
    const token = () => jwt.sign({ userId: 2 }, TEST_SECRET, { expiresIn: '7d' });

    it('should return 401 without an Authorization header', async () => {
      const response = await request(app).get('/api/v1/Me');

      expect(response.status).toBe(401);
      expect(mockAuthService.getProfile).not.toHaveBeenCalled();
    });

    it('should return 200 with the current user profile for a valid token', async () => {
      mockAuthService.getProfile.mockResolvedValue({
        userId: 2,
        firstName: 'Demo',
        lastName: 'User',
      });

      const response = await request(app)
        .get('/api/v1/Me')
        .set('Authorization', `Bearer ${token()}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({ userId: 2, firstName: 'Demo', lastName: 'User' });
      expect(mockAuthService.getProfile).toHaveBeenCalledWith(2);
    });

    it('should return 404 when the user no longer exists', async () => {
      mockAuthService.getProfile.mockRejectedValue(new UserNotFoundError());

      const response = await request(app)
        .get('/api/v1/Me')
        .set('Authorization', `Bearer ${token()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});
