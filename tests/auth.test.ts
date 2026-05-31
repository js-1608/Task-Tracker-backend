// tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';
import { User } from '../src/models/User';

const TEST_ORG = 'Test Corp ' + Date.now();
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123';

let accessToken: string;
let refreshToken: string;

describe('Auth Flow', () => {
  afterAll(async () => {
    // Cleanup test data
    await User.deleteMany({ email: TEST_EMAIL });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new org and admin user', async () => {
      const res = await request(app).post('/api/auth/register').send({
        orgName: TEST_ORG,
        name: 'Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.role).toBe('ADMIN');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        orgName: 'Another Org',
        name: 'Dup User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    it('should validate weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        orgName: 'Org',
        name: 'User',
        email: 'weak@example.com',
        password: 'weak',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: TEST_EMAIL,
        password: 'WrongPass999',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@nowhere.com',
        password: 'SomePass123',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should rotate refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      // Old token should be invalidated
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should reject already-used refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });
});
