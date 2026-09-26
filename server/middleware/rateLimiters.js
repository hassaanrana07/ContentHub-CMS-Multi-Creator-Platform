const { rateLimit, ipKeyGenerator, MemoryStore } = require('express-rate-limit');

/**
 * Extracts normalized target identifier (email or username) from request body.
 */
const getTargetIdentifier = (req) => {
  const raw = req.body?.identifier || req.body?.email || req.body?.username || '';
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
};

// Explicit in-memory stores to allow programmatic reset in automated test suites
const apiStore = new MemoryStore();
const loginIpStore = new MemoryStore();
const loginAccountStore = new MemoryStore();
const registerStore = new MemoryStore();
const adminActionStore = new MemoryStore();
const passwordChangeStore = new MemoryStore();
const passwordResetStore = new MemoryStore();
const emailVerificationStore = new MemoryStore();
const contactStore = new MemoryStore();
const publicSiteStore = new MemoryStore();

const allStores = [
  apiStore,
  loginIpStore,
  loginAccountStore,
  registerStore,
  adminActionStore,
  passwordChangeStore,
  passwordResetStore,
  emailVerificationStore,
  contactStore,
  publicSiteStore
];

/**
 * Resets all rate limit tracking stores.
 * Used exclusively for automated test suite isolation.
 */
const resetRateLimits = async () => {
  await Promise.all(allStores.map((store) => store.resetAll()));
};

/**
 * 1. General API Volumetric Protection
 * Guards against basic HTTP request flooding across all /api routes.
 * Limit: 1000 requests per 15 minutes per IP.
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  store: apiStore,
  message: { error: 'Too many requests to the platform API. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 2A. Login IP-Level Brute-Force Protection
 * Prevents rapid password guessing from a single IP address.
 * Only failed requests count against the quota; successful logins are skipped.
 * Limit: 30 failed attempts per 15 minutes per IP.
 */
const loginIpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  store: loginIpStore,
  skipSuccessfulRequests: true,
  message: { error: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 2B. Login Account-Targeted Brute-Force Protection (Composite Key: IP + Target Account)
 * Prevents an attacker from hammering a specific target account from an IP,
 * while preventing account-targeted DoS (attacker on IP A cannot lock out victim on IP B).
 * Subnet-aware IPv6 keying via ipKeyGenerator prevents IPv6 rotation bypasses.
 * Limit: 10 failed attempts per 15 minutes per IP + account composite key.
 */
const loginAccountRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: loginAccountStore,
  keyGenerator: (req) => {
    const id = getTargetIdentifier(req);
    const clientIp = ipKeyGenerator(req.ip);
    return `${clientIp}_${id || 'anon'}`;
  },
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 3. Dedicated Registration Rate Limiter
 * Protects against bot account creation and registration spam.
 * Limit: 10 account registration attempts per 15 minutes per IP.
 */
const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: registerStore,
  message: { error: 'Too many account registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 4. Sensitive Admin Action Rate Limiter
 * Limits destructive operations (creator deletion/suspension, global post/category removal).
 * Keyed by authenticated admin ID (or fallback to IP).
 * Limit: 40 operations per 15 minutes per admin.
 */
const adminActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  store: adminActionStore,
  keyGenerator: (req) => {
    return req.user?.id ? `admin_${req.user.id}` : ipKeyGenerator(req.ip);
  },
  message: { error: 'Too many administrative operations performed. Please slow down and try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 5. Password Change Rate Limiter
 * Protects authenticated password update endpoint from credential probing.
 * Limit: 5 attempts per 15 minutes per user.
 */
const passwordChangeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: passwordChangeStore,
  keyGenerator: (req) => {
    return req.user?.id ? `pwd_${req.user.id}` : ipKeyGenerator(req.ip);
  },
  message: { error: 'Too many password change attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 6. Password Reset Rate Limiter
 * Limits forgot-password and reset-password submissions to prevent inbox bombing and enumeration.
 * Limit: 5 requests per 15 minutes.
 */
const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: passwordResetStore,
  keyGenerator: (req) => {
    const id = getTargetIdentifier(req);
    const clientIp = ipKeyGenerator(req.ip);
    return `${clientIp}_${id || 'anon'}`;
  },
  message: { error: 'Too many password reset requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 7. Email Verification Rate Limiter
 * Limits verification code submission and resend requests.
 * Limit: 5 requests per 15 minutes.
 */
const emailVerificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: emailVerificationStore,
  message: { error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 8. Public Contact Form Rate Limiter
 * Guards creator inbox contact endpoints against spam bots.
 * Limit: 20 contact messages per 15 minutes per IP.
 */
const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: contactStore,
  message: { error: 'Too many contact messages submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 9. Public Site Read Rate Limiter
 * Prevents DB connection pool exhaustion on heavy multi-query public pages.
 * Limit: 250 reads per 15 minutes per IP.
 */
const publicSiteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  store: publicSiteStore,
  message: { error: 'Too many requests to creator website. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  resetRateLimits,
  apiRateLimiter,
  loginIpRateLimiter,
  loginAccountRateLimiter,
  registerRateLimiter,
  adminActionRateLimiter,
  passwordChangeRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  contactRateLimiter,
  publicSiteRateLimiter
};
