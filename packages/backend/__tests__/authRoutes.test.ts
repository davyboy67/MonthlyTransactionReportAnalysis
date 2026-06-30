import request from 'supertest';
import express from 'express';
import { createAuthRouter } from '../src/routes/authRoutes';
import { AuthService, InvalidCredentialsError } from '../src/services/AuthService';

describe('Auth API Routes', () => {
  let app: express.Application;
  let mockAuthService: jest.Mocked<Pick<AuthService, 'login'>>;

  beforeEach(() => {
    mockAuthService = { login: jest.fn() };
    app = express();
    app.use(express.json());
    app.use('/api/v1', createAuthRouter(mockAuthService as unknown as AuthService));
  });

  describe('POST /Login', () => {
    it('should return 200 with the token and user on success', async () => {
      mockAuthService.login.mockResolvedValue({
        token: 'signed.jwt',
        user: { userId: 2, firstName: 'Demo' },
      });

      const response = await request(app)
        .post('/api/v1/Login')
        .send({ email: 'admin', password: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('signed.jwt');
      expect(response.body.user).toEqual({ userId: 2, firstName: 'Demo' });
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
});
