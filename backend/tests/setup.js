// Globals for tests: set env vars before any module reads them.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.MONGO_URI = 'mongodb://localhost:27017/unused-tests-use-memory-server';
process.env.GEMINI_API_KEY = 'test-key';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'irrelevant';

// Nodemailer's transporter.verify() runs at module load and would spam
// the console — silence it.
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    verify: (cb) => cb && cb(null, true),
    sendMail: async () => ({ accepted: ['test@example.com'] })
  })
}));
