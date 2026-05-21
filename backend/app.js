// The Express app, separated from server startup so tests can import it
// without binding to a port.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security headers (XSS, clickjacking, mime sniffing, etc.).
// CSP is configured to allow Leaflet tiles, user-supplied catalog images,
// inline styles Leaflet injects at runtime, and WebSocket upgrade connections.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://placehold.co', 'https://ui-avatars.com', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
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

app.get('/', (req, res) => res.send('Welcome to the Marketplace API!'));

module.exports = app;
