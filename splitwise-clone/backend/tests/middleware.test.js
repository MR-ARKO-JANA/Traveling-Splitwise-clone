/**
 * Middleware Tests
 * Tests: auth middleware, error handler, rate limiter, validate
 */
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { connectTestDB, disconnectTestDB, clearTestDB, createTestUser } = require('./setup');

let app;

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Auth Middleware', () => {
  let authApp;

  beforeEach(() => {
    authApp = express();
    authApp.use(express.json());
    authApp.use(cookieParser());

    const auth = require('../middleware/auth');

    // Protected test route
    authApp.get('/protected', auth, (req, res) => {
      res.json({ userId: req.user.id, message: 'Access granted' });
    });
  });

  test('should allow access with valid Bearer token', async () => {
    const { token } = await createTestUser();

    const res = await request(authApp).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Access granted');
    expect(res.body.userId).toBeDefined();
  });

  test('should allow access with valid cookie token', async () => {
    const { token } = await createTestUser();

    const res = await request(authApp).get('/protected').set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Access granted');
  });

  test('should reject request without token', async () => {
    const res = await request(authApp).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  test('should reject request with invalid token', async () => {
    const res = await request(authApp)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/not valid/i);
  });

  test('should reject expired token', async () => {
    const expiredToken = jwt.sign({ user: { id: 'someid' } }, process.env.JWT_SECRET, {
      expiresIn: '0s',
    });

    // Wait a tiny bit to ensure expiry
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await request(authApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });
});

describe('Error Handler Middleware', () => {
  let errApp;

  beforeEach(() => {
    errApp = express();
    errApp.use(express.json());

    // Route that throws an error
    errApp.get('/error', (req, res, next) => {
      const err = new Error('Something went wrong');
      err.statusCode = 500;
      next(err);
    });

    errApp.get('/validation-error', (req, res, next) => {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = { name: { message: 'Name is required' } };
      next(err);
    });

    errApp.get('/cast-error', (req, res, next) => {
      const err = new Error('Invalid ID');
      err.name = 'CastError';
      next(err);
    });

    errApp.get('/duplicate-error', (req, res, next) => {
      const err = new Error('Duplicate');
      err.code = 11000;
      next(err);
    });

    const errorHandler = require('../middleware/errorHandler');
    errApp.use(errorHandler);
  });

  test('should handle generic errors', async () => {
    const res = await request(errApp).get('/error');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('should handle validation errors', async () => {
    const res = await request(errApp).get('/validation-error');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  test('should handle CastError (bad ObjectId)', async () => {
    const res = await request(errApp).get('/cast-error');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('should handle duplicate key errors', async () => {
    const res = await request(errApp).get('/duplicate-error');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/duplicate/i);
  });
});

describe('Validate Middleware', () => {
  let valApp;

  beforeEach(() => {
    const Joi = require('joi');
    const validate = require('../middleware/validate');

    valApp = express();
    valApp.use(express.json());

    const schema = Joi.object({
      name: Joi.string().required().min(2),
      email: Joi.string().email().required(),
    });

    valApp.post('/validate', validate(schema), (req, res) => {
      res.json({ success: true, data: req.body });
    });
  });

  test('should pass valid data', async () => {
    const res = await request(valApp)
      .post('/validate')
      .send({ name: 'John', email: 'john@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should reject invalid data', async () => {
    const res = await request(valApp).post('/validate').send({ name: 'J' }); // Name too short, email missing

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('should reject empty body', async () => {
    const res = await request(valApp).post('/validate').send({});

    expect(res.status).toBe(400);
  });
});
