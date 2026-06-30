import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../src/middleware/authenticate';

jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('authenticate middleware', () => {
  const ORIGINAL_SECRET = process.env.JWT_SECRET;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    res = { status: statusMock as any, json: jsonMock as any };
    next = jest.fn();
    req = { header: jest.fn() };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  });

  it('should set req.userId and call next for a valid token', () => {
    (req.header as jest.Mock).mockReturnValue('Bearer good.token');
    (mockedJwt.verify as jest.Mock).mockReturnValue({ userId: 5 });

    authenticate(req as Request, res as Response, next);

    expect(req.userId).toBe(5);
    expect(next).toHaveBeenCalledTimes(1);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should verify the token against JWT_SECRET', () => {
    (req.header as jest.Mock).mockReturnValue('Bearer good.token');
    (mockedJwt.verify as jest.Mock).mockReturnValue({ userId: 5 });

    authenticate(req as Request, res as Response, next);

    expect(mockedJwt.verify).toHaveBeenCalledWith('good.token', 'test-secret');
  });

  it('should return 500 when JWT_SECRET is not configured', () => {
    delete process.env.JWT_SECRET;

    authenticate(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Server auth misconfigured' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when the Authorization header is missing', () => {
    (req.header as jest.Mock).mockReturnValue(undefined);

    authenticate(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when the header is not a Bearer token', () => {
    (req.header as jest.Mock).mockReturnValue('Basic abc123');

    authenticate(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when the token payload has a non-numeric userId', () => {
    (req.header as jest.Mock).mockReturnValue('Bearer weird.token');
    (mockedJwt.verify as jest.Mock).mockReturnValue({ userId: 'not-a-number' });

    authenticate(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token verification throws (invalid/expired)', () => {
    (req.header as jest.Mock).mockReturnValue('Bearer expired.token');
    (mockedJwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    authenticate(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});
