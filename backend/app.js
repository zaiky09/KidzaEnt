// The Express app, separated from server startup so tests can import it
// without binding to a port.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Behind Render's load balancer / proxy. Trust exactly one proxy hop so
// req.ip and X-Forwarded-For are honoured correctly — without this,
// express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and our
// rate limiting buckets everyone under the LB's address instead of the
// real client. '1' = trust the immediate upstream proxy.
app.set('trust proxy', 1);

// Security headers (XSS, clickjacking, mime sniffing, etc.).
// CSP is configured to allow Leaflet tiles, user-supplied catalog images,
// inline styles Leaflet injects at runtime, and WebSocket upgrade connections.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow Google Maps tile images + Maps Static images, plus catalog placeholders.
      imgSrc: ["'self'", 'data:', 'https://*.googleapis.com', 'https://*.gstatic.com', 'https://placehold.co', 'https://ui-avatars.com', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://*.googleapis.com'],
      // Google Maps JS API loads from maps.googleapis.com and may inline some scripts.
      scriptSrc: ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com', "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Aggressive rate limit on auth — blocks credential stuffing / brute force.
// Skipped under NODE_ENV=test so test suites don't trip the limiter.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts. Please try again later.' },
  skip: () => process.env.NODE_ENV === 'test'
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI is busy. Slow down a moment.' },
  skip: () => process.env.NODE_ENV === 'test'
});

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ai', aiLimiter, require('./routes/ai'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/settings', require('./routes/settings'));

app.get('/', (req, res) => res.send('Welcome to the Marketplace API!'));

module.exports = app;
