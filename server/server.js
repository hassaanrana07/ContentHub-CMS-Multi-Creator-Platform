const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Startup Security Fail-Safe: Enforce cryptographically sound JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
const INSECURE_JWT_SECRETS = [
  'contenthub_super_secret_jwt_key_2026_prod_key',
  'secret',
  'jwt_secret',
  'your_jwt_secret',
  'changeme',
  'password'
];

if (!JWT_SECRET || INSECURE_JWT_SECRETS.includes(JWT_SECRET) || JWT_SECRET.trim().length < 32) {
  console.error('FATAL CONFIGURATION ERROR: A strong, unique JWT_SECRET environment variable (minimum 32 characters) must be configured.');
  console.error('The application will not start with a missing, default, or insecure JWT secret.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const creatorRoutes = require('./routes/creator');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5090;
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Permits external media assets (e.g., Unsplash)
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Production-ready CORS configuration
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5090']
  : '*';

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Trust proxy configuration for production reverse proxy environments
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 1. General API abuse guard against volumetric flooding
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 API requests per 15 minutes
  message: { error: 'Too many requests to the platform API. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Authentication Login Rate Limiter (Brute-force protection)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 failed login attempts per window
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Do not penalize successful authentications
});

// 3. Dedicated Registration Rate Limiter (Anti-account spam)
const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 account registrations per window
  message: { error: 'Too many account registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. Public Contact Form Rate Limiter (Spam protection)
const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 contact messages per window
  message: { error: 'Too many contact messages submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. Public Site Read Rate Limiter (Prevents connection pool exhaustion on heavy multi-query reads)
const publicSiteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250, // Limit each IP to 250 public portfolio/article queries per 15 minutes
  message: { error: 'Too many requests to creator website. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply Rate Limiters
app.use('/api', apiRateLimiter);
app.use('/api/auth/login', loginRateLimiter);
app.use('/api/auth/register', registerRateLimiter);
app.use('/api/public/site/:username/contact', contactRateLimiter);
app.use('/api/public/site', (req, res, next) => {
  if (req.method === 'GET') {
    return publicSiteRateLimiter(req, res, next);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// Backend Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ContentHub CMS Backend API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Serve Client Build Assets in Unified Production Mode
const clientDistPath = path.join(__dirname, '../client/dist');
if (isProduction && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 API Route Handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found.` });
});

// Centralized Secure Error Handling
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  const message = (isProduction && status === 500)
    ? 'An unexpected internal server error occurred.'
    : err.message || 'Server error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 ContentHub CMS Backend Server running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
