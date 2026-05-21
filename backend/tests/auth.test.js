const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { startMemoryMongo, stopMemoryMongo, clearCollections } = require('./helpers/mongo');

beforeAll(startMemoryMongo);
afterAll(stopMemoryMongo);
afterEach(clearCollections);

const validSignup = {
  username: 'Test User',
  email: 'test@example.com',
  phone: '0712345678',
  password: 'CorrectHorse9'
};

describe('POST /api/auth/signup', () => {
  test('creates a customer account with valid input', async () => {
    const res = await request(app).post('/api/auth/signup').send(validSignup);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/customer/i);

    const user = await User.findOne({ email: validSignup.email });
    expect(user).toBeTruthy();
    expect(user.password).not.toBe(validSignup.password); // must be hashed
  });

  test('rejects passwords shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validSignup, password: 'short1' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 8/i);
  });

  test('rejects malformed phone number', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validSignup, phone: '12345' });
    expect(res.status).toBe(400);
  });

  test('rejects duplicate username', async () => {
    await request(app).post('/api/auth/signup').send(validSignup);
    const res = await request(app).post('/api/auth/signup').send({
      ...validSignup,
      email: 'other@example.com',
      phone: '0798765432'
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('cannot self-elevate to admin', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validSignup, role: 'admin' });
    expect(res.status).toBe(201);
    const user = await User.findOne({ email: validSignup.email });
    expect(user.role).toBe('customer'); // silently downgraded
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(validSignup);
  });

  test('returns a JWT on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignup.email, password: validSignup.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.role).toBe('customer');
  });

  test('rejects wrong password without revealing which field was wrong', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignup.email, password: 'WrongPassword1' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid credentials');
  });

  test('rejects unknown email with the same generic message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: validSignup.password });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid credentials');
  });
});

describe('POST /api/auth/forgot-password', () => {
  test('returns the same generic response whether the email exists or not', async () => {
    const r1 = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    const r2 = await request(app).post('/api/auth/forgot-password').send({ email: validSignup.email });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.message).toBe(r2.body.message);
  });
});
