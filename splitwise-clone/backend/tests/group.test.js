/**
 * Group API Tests
 * Tests: create, get (with pagination), add member, delete
 */
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
  createTestUser,
  createTestGroup,
} = require('./setup');

let app;

beforeAll(async () => {
  await connectTestDB();

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/groups', require('../routes/groupRoutes'));

  const errorHandler = require('../middleware/errorHandler');
  app.use(errorHandler);
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('POST /api/groups', () => {
  test('should create a group successfully', async () => {
    const { token, user } = await createTestUser({ email: 'creator@test.com' });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Trip to Goa',
        description: 'Beach vacation',
        emails: ['friend1@test.com', 'friend2@test.com'],
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Trip to Goa');
    expect(res.body.members).toContain('creator@test.com');
    expect(res.body.members).toContain('friend1@test.com');
  });

  test('should auto-include creator email in members', async () => {
    const { token, user } = await createTestUser({ email: 'auto@test.com' });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Auto Include Test',
        emails: ['other@test.com'],
      });

    expect(res.status).toBe(201);
    expect(res.body.members).toContain('auto@test.com');
  });

  test('should fail without a name', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ emails: ['test@test.com'] });

    expect(res.status).toBe(400);
  });

  test('should fail without auth token', async () => {
    const res = await request(app).post('/api/groups').send({ name: 'No Auth Group' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/groups', () => {
  test('should return paginated groups', async () => {
    const { token, user } = await createTestUser({ email: 'group@test.com' });

    // Create 3 groups
    for (let i = 0; i < 3; i++) {
      await createTestGroup({
        creatorId: user._id,
        name: `Group ${i}`,
        members: ['group@test.com'],
      });
    }

    const res = await request(app)
      .get('/api/groups?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.page).toBe(1);
  });

  test('should return page 2', async () => {
    const { token, user } = await createTestUser({ email: 'page2@test.com' });

    for (let i = 0; i < 3; i++) {
      await createTestGroup({
        creatorId: user._id,
        name: `Group ${i}`,
        members: ['page2@test.com'],
      });
    }

    const res = await request(app)
      .get('/api/groups?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('should return empty for user with no groups', async () => {
    const { token } = await createTestUser({ email: 'lonely@test.com' });

    const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });
});

describe('POST /api/groups/add-member', () => {
  test('should add a member to a group', async () => {
    const { token, user } = await createTestUser({ email: 'owner@test.com' });
    const group = await createTestGroup({
      creatorId: user._id,
      name: 'Add Member Group',
      members: ['owner@test.com'],
    });

    const res = await request(app)
      .post('/api/groups/add-member')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId: group._id.toString(),
        email: 'newmember@test.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.members).toContain('newmember@test.com');
  });

  test('should reject duplicate member', async () => {
    const { token, user } = await createTestUser({ email: 'dup@test.com' });
    const group = await createTestGroup({
      creatorId: user._id,
      name: 'Dup Group',
      members: ['dup@test.com', 'existing@test.com'],
    });

    const res = await request(app)
      .post('/api/groups/add-member')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId: group._id.toString(),
        email: 'existing@test.com',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already in group/i);
  });

  test('should return 404 for non-existent group', async () => {
    const { token } = await createTestUser();
    const mongoose = require('mongoose');

    const res = await request(app)
      .post('/api/groups/add-member')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId: new mongoose.Types.ObjectId().toString(),
        email: 'test@test.com',
      });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/groups/:id', () => {
  test('should delete own group', async () => {
    const { token, user } = await createTestUser({ email: 'delowner@test.com' });
    const group = await createTestGroup({
      creatorId: user._id,
      name: 'Delete Me',
      members: ['delowner@test.com'],
    });

    const res = await request(app)
      .delete(`/api/groups/${group._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });

  test("should not delete someone else's group", async () => {
    const { user: owner } = await createTestUser({ email: 'realowner@test.com' });
    const { token: otherToken } = await createTestUser({ email: 'other@test.com' });

    const group = await createTestGroup({
      creatorId: owner._id,
      name: 'Not Mine',
      members: ['realowner@test.com', 'other@test.com'],
    });

    const res = await request(app)
      .delete(`/api/groups/${group._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(401);
  });

  test('should return 404 for non-existent group', async () => {
    const { token } = await createTestUser();
    const mongoose = require('mongoose');

    const res = await request(app)
      .delete(`/api/groups/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
