import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createInviteRouter } from '../src/routes/inviteRoutes';
import {
  IInviteService,
  EmailAlreadyRegisteredError,
  InviteNotFoundError,
  InviteUnusableError,
} from '../src/services/InviteService';

const TEST_SECRET = 'test-secret';

describe('Invite API Routes', () => {
  let app: express.Application;
  let mockInviteService: jest.Mocked<IInviteService>;
  const ORIGINAL_SECRET = process.env.JWT_SECRET;

  const tokenFor = (userId: number) =>
    jwt.sign({ userId }, TEST_SECRET, { expiresIn: '7d' });

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    mockInviteService = {
      createInvite: jest.fn(),
      validateInvite: jest.fn(),
      redeemInvite: jest.fn(),
    };
    app = express();
    app.use(express.json());
    app.use('/api/v1', createInviteRouter(mockInviteService));
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  });

  describe('POST /CreateInvite', () => {
    const body = { email: 'bob@example.com', firstName: 'Bob', lastName: 'Smith' };

    it('should return 401 without an Authorization header', async () => {
      const response = await request(app).post('/api/v1/CreateInvite').send(body);

      expect(response.status).toBe(401);
      expect(mockInviteService.createInvite).not.toHaveBeenCalled();
    });

    it('should return 403 for a signed-in user who is not the owner', async () => {
      const response = await request(app)
        .post('/api/v1/CreateInvite')
        .set('Authorization', `Bearer ${tokenFor(2)}`)
        .send(body);

      expect(response.status).toBe(403);
      expect(mockInviteService.createInvite).not.toHaveBeenCalled();
    });

    it('should return 200 with the token for the owner', async () => {
      const expiresAt = new Date('2026-08-11T00:00:00.000Z');
      mockInviteService.createInvite.mockResolvedValue({ token: 'raw-token', expiresAt });

      const response = await request(app)
        .post('/api/v1/CreateInvite')
        .set('Authorization', `Bearer ${tokenFor(1)}`)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('raw-token');
      expect(mockInviteService.createInvite).toHaveBeenCalledWith(1, body);
    });

    it('should return 400 when a field is missing', async () => {
      const response = await request(app)
        .post('/api/v1/CreateInvite')
        .set('Authorization', `Bearer ${tokenFor(1)}`)
        .send({ email: 'bob@example.com', firstName: 'Bob' });

      expect(response.status).toBe(400);
      expect(mockInviteService.createInvite).not.toHaveBeenCalled();
    });

    it('should return 400 for a malformed email', async () => {
      const response = await request(app)
        .post('/api/v1/CreateInvite')
        .set('Authorization', `Bearer ${tokenFor(1)}`)
        .send({ ...body, email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(mockInviteService.createInvite).not.toHaveBeenCalled();
    });

    it('should return 409 when the email already has an account', async () => {
      mockInviteService.createInvite.mockRejectedValue(new EmailAlreadyRegisteredError());

      const response = await request(app)
        .post('/api/v1/CreateInvite')
        .set('Authorization', `Bearer ${tokenFor(1)}`)
        .send(body);

      expect(response.status).toBe(409);
    });
  });

  describe('POST /ValidateInvite', () => {
    it('should return 200 with the invite preview, without a token', async () => {
      mockInviteService.validateInvite.mockResolvedValue({
        email: 'bob@example.com',
        firstName: 'Bob',
      });

      const response = await request(app).post('/api/v1/ValidateInvite').send({ token: 't' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ email: 'bob@example.com', firstName: 'Bob' });
    });

    it('should return 404 for an unknown invite', async () => {
      mockInviteService.validateInvite.mockRejectedValue(new InviteNotFoundError());

      const response = await request(app).post('/api/v1/ValidateInvite').send({ token: 't' });

      expect(response.status).toBe(404);
    });

    it('should return 410, never 401, for an expired invite', async () => {
      mockInviteService.validateInvite.mockRejectedValue(
        new InviteUnusableError('This invite link has expired')
      );

      const response = await request(app).post('/api/v1/ValidateInvite').send({ token: 't' });

      expect(response.status).toBe(410);
      expect(response.body.error).toBe('This invite link has expired');
    });

    it('should return 400 when the token is missing', async () => {
      const response = await request(app).post('/api/v1/ValidateInvite').send({});

      expect(response.status).toBe(400);
      expect(mockInviteService.validateInvite).not.toHaveBeenCalled();
    });
  });

  describe('POST /RedeemInvite', () => {
    it('should return 200 with a session token and the new user', async () => {
      mockInviteService.redeemInvite.mockResolvedValue({
        token: 'signed.jwt',
        user: { userId: 5, firstName: 'Bob', lastName: 'Smith', payDay: 26, isOwner: false },
      });

      const response = await request(app)
        .post('/api/v1/RedeemInvite')
        .send({ token: 't', password: 'a-long-enough-password' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('signed.jwt');
      expect(response.body.user.userId).toBe(5);
    });

    it('should return 400 for a password below the minimum length', async () => {
      const response = await request(app)
        .post('/api/v1/RedeemInvite')
        .send({ token: 't', password: 'short' });

      expect(response.status).toBe(400);
      expect(mockInviteService.redeemInvite).not.toHaveBeenCalled();
    });

    it('should return 410 when the invite was already used', async () => {
      mockInviteService.redeemInvite.mockRejectedValue(
        new InviteUnusableError('This invite link has already been used')
      );

      const response = await request(app)
        .post('/api/v1/RedeemInvite')
        .send({ token: 't', password: 'a-long-enough-password' });

      expect(response.status).toBe(410);
    });
  });
});
