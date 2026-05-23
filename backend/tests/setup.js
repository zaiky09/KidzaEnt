// Globals for tests: set env vars before any module reads them.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.MONGO_URI = 'mongodb://localhost:27017/unused-tests-use-memory-server';
process.env.GEMINI_API_KEY = 'test-key';
process.env.EMAIL_USER = 'test@example.com';
process.env.BREVO_API_KEY = 'xkeysib-test-key';

// Stub global fetch so the Brevo HTTPS calls in utils/mailer.js never
// touch the network during tests. Returns a Brevo-shaped success body.
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 201,
  json: async () => ({ messageId: '<mock-brevo-id@brevo.com>' }),
  text: async () => '{"messageId":"<mock-brevo-id@brevo.com>"}'
});
