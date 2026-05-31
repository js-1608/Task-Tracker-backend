// tests/users.test.ts
import request from 'supertest';
import app from '../src/app';
import { User } from '../src/models/User';
import { signAccessToken } from '../src/utils/jwt';

const ADMIN_EMAIL = `admin_${Date.now()}@test.com`;
const MEMBER_EMAIL = `member_${Date.now()}@test.com`;
const NEW_MEMBER_EMAIL = `new_member_${Date.now()}@test.com`;
const NEW_MANAGER_EMAIL = `new_manager_${Date.now()}@test.com`;
const PASSWORD = 'TestPass123';

let adminToken: string;
let memberToken: string;
let orgId: string;
let adminId: string;
let memberId: string;

describe('Users Administration', () => {
  beforeAll(async () => {
    // Register admin + org
    const adminRes = await request(app).post('/api/auth/register').send({
      orgName: `UserTestOrg_${Date.now()}`,
      name: 'Admin User',
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    adminToken = adminRes.body.data.accessToken;
    orgId = adminRes.body.data.user.orgId;
    adminId = adminRes.body.data.user.id;

    // Register a member (creates temp org first)
    const memberRegRes = await request(app).post('/api/auth/register').send({
      orgName: `MemberOrg_${Date.now()}`,
      name: 'Member User',
      email: MEMBER_EMAIL,
      password: PASSWORD,
    });
    memberId = memberRegRes.body.data.user.id;

    // Update member user in database to belong to admin's org and have role MEMBER
    await User.findByIdAndUpdate(memberId, { orgId, role: 'MEMBER' });

    // Generate accessToken for member matching the admin's org
    memberToken = signAccessToken({ userId: memberId, orgId, role: 'MEMBER' });
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          ADMIN_EMAIL,
          MEMBER_EMAIL,
          NEW_MEMBER_EMAIL,
          NEW_MANAGER_EMAIL,
          'badpass@test.com'
        ]
      }
    });
  });

  describe('POST /api/users', () => {
    it('should allow ADMIN to create a new MEMBER user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Member',
          email: NEW_MEMBER_EMAIL,
          password: 'NewUserPass123',
          role: 'MEMBER',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('New Member');
      expect(res.body.data.email).toBe(NEW_MEMBER_EMAIL);
      expect(res.body.data.role).toBe('MEMBER');
      expect(res.body.data.orgId).toBe(orgId);
      expect(res.body.data).not.toHaveProperty('passwordHash');

      // Verify user exists in the DB
      const dbUser = await User.findById(res.body.data.id);
      expect(dbUser).toBeDefined();
      expect(dbUser!.role).toBe('MEMBER');
      expect(dbUser!.orgId.toString()).toBe(orgId);
    });

    it('should allow ADMIN to create a new MANAGER user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Manager',
          email: NEW_MANAGER_EMAIL,
          password: 'NewUserPass123',
          role: 'MANAGER',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('MANAGER');
    });

    it('should reject creation if email already exists', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Email',
          email: NEW_MEMBER_EMAIL,
          password: 'NewUserPass123',
          role: 'MEMBER',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    it('should reject creation if requester is a MEMBER', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Unauthorized',
          email: 'unauth@test.com',
          password: 'NewUserPass123',
          role: 'MEMBER',
        });

      expect(res.status).toBe(403);
    });

    it('should reject creation if validation fails (weak password)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Pass User',
          email: 'badpass@test.com',
          password: 'weak',
          role: 'MEMBER',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should allow newly created user to login successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: NEW_MEMBER_EMAIL,
          password: 'NewUserPass123',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(NEW_MEMBER_EMAIL);
      expect(res.body.data.user.role).toBe('MEMBER');
      expect(res.body.data.user.orgId).toBe(orgId);
    });
  });
});
