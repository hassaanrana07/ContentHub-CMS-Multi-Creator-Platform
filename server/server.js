const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting for Auth & Public Form Submissions
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication attempts
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 contact messages
  message: { error: 'Too many contact messages submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply Rate Limiters
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/public/site/:username/contact', contactRateLimiter);

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
