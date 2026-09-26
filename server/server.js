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

const cookieParser = require('cookie-parser');
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
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5090'];
if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Trust proxy configuration for production reverse proxy environments
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// CSRF Defense-in-depth: For state-mutating requests utilizing cookie authentication, verify origin
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (req.cookies && req.cookies.contenthub_token) {
      const origin = req.headers['origin'] || req.headers['referer'];
      if (origin) {
        try {
          const originHost = new URL(origin).origin;
          if (!allowedOrigins.includes(originHost)) {
            return res.status(403).json({ error: 'Forbidden: Cross-site request rejected.' });
          }
        } catch (e) {
          return res.status(403).json({ error: 'Forbidden: Invalid request origin.' });
        }
      }
    }
  }
  next();
});

// Centralized Rate Limiters
const {
  resetRateLimits,
  apiRateLimiter,
  loginIpRateLimiter,
  loginAccountRateLimiter,
  registerRateLimiter,
  publicSiteRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter
} = require('./middleware/rateLimiters');

// Apply Rate Limiters before expensive authentication and database operations
app.use('/api', apiRateLimiter);
app.use('/api/auth/login', loginIpRateLimiter, loginAccountRateLimiter);
app.use('/api/auth/register', registerRateLimiter);
app.use('/api/auth/forgot-password', passwordResetRateLimiter);
app.use('/api/auth/reset-password', passwordResetRateLimiter);
app.use('/api/auth/verify-email', emailVerificationRateLimiter);
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

// Test/Development Helper: Programmatic reset of rate limit stores for automated test suites
if (!isProduction) {
  app.post('/api/test/reset-rate-limits', async (req, res) => {
    await resetRateLimits();
    res.json({ message: 'Rate limit stores successfully reset.' });
  });
}

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
