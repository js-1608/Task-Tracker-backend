// tests/task-status.test.ts
import request from 'supertest';
import app from '../src/app';
import { User } from '../src/models/User';
import { signAccessToken } from '../src/utils/jwt';

const ADMIN_EMAIL = `admin_${Date.now()}@test.com`;
const MEMBER_EMAIL = `member_${Date.now()}@test.com`;
const PASSWORD = 'TestPass123';

let adminToken: string;
let memberToken: string;
let orgId: string;
let projectId: string;
let taskId: string;
let memberId: string;

describe('Task Status Transitions', () => {
  beforeAll(async () => {
    // Register admin + org
    const adminRes = await request(app).post('/api/auth/register').send({
      orgName: `StatusTestOrg_${Date.now()}`,
      name: 'Admin',
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    adminToken = adminRes.body.data.accessToken;
    orgId = adminRes.body.data.user.orgId;

    // Create a project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Project' });
    projectId = projRes.body.data.id;

    // Register member fresh (which creates a temp org)
    const memberRegRes = await request(app).post('/api/auth/register').send({
      orgName: `MemberOrg_${Date.now()}`,
      name: 'Member',
      email: MEMBER_EMAIL,
      password: PASSWORD,
    });
    memberId = memberRegRes.body.data.user.id;

    // Update member user directly in database to belong to the admin's organization with role MEMBER
    await User.findByIdAndUpdate(memberId, { orgId, role: 'MEMBER' });

    // Generate a valid access token for the member with the updated organization and role
    memberToken = signAccessToken({ userId: memberId, orgId, role: 'MEMBER' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [ADMIN_EMAIL, MEMBER_EMAIL] } });
  });

  beforeEach(async () => {
    // Create a fresh task for each test
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Status Test Task',
        projectId,
        priority: 'MEDIUM',
      });
    taskId = taskRes.body.data.id;
  });

  it('should transition TODO → IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('should reject invalid transition TODO → DONE', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DONE' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should allow transitioning to BLOCKED from TODO', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'BLOCKED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('BLOCKED');
  });

  it('should reject MEMBER changing status of non-assigned task', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(403);
  });

  it('full happy path: TODO → IN_PROGRESS → IN_REVIEW → DONE', async () => {
    const transitions = ['IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    for (const status of transitions) {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(status);
    }
  });
});
