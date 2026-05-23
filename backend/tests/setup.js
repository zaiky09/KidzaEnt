// Globals for tests: set env vars before any module reads them.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.MONGO_URI = 'mongodb://localhost:27017/unused-tests-use-memory-server';
process.env.GEMINI_API_KEY = 'test-key';
process.env.EMAIL_USER = 'test@example.com';
process.env.RESEND_API_KEY = 're_test_key';

// Mock the Resend SDK so tests don't actually call the network.
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'mock-resend-id' }, error: null })
    }
  }))
}));
