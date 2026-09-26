const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL CONFIGURATION: JWT_SECRET environment variable is missing.');
}

/**
 * Server-side in-memory token revocation blocklist.
 * Maps revoked token string -> expiration timestamp (in milliseconds).
 *
 * Architecture Note:
 * This in-memory blocklist provides immediate, zero-database-overhead token revocation
 * for the current single-instance Express application. For clustered, distributed, or
 * horizontally autoscaled deployments, this blocklist must be backed by a shared distributed
 * cache (such as Redis) or a persisted revoked_tokens database table.
 */
const tokenRevocationBlocklist = new Map();

function revokeToken(token) {
  if (!token || typeof token !== 'string') return;
  try {
    const decoded = jwt.decode(token);
    const expMs = decoded && decoded.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
    tokenRevocationBlocklist.set(token, expMs);
  } catch (e) {
    tokenRevocationBlocklist.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}

function isTokenRevoked(token) {
  if (!token) return false;
  return tokenRevocationBlocklist.has(token);
}

// Periodic cleanup of expired revoked tokens every 10 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [token, expMs] of tokenRevocationBlocklist.entries()) {
    if (now >= expMs) {
      tokenRevocationBlocklist.delete(token);
    }
  }
}, 10 * 60 * 1000);

if (cleanupInterval.unref) {
  cleanupInterval.unref(); // Do not block process termination in tests or scripts
}

const authenticateToken = async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies.contenthub_token) {
    token = req.cookies.contenthub_token;
  } else if (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
    token = req.headers['authorization'].split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  // Check if token has been explicitly revoked server-side upon logout
  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Authentication token has been revoked. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user and creator profile in a single joined query to eliminate redundant database roundtrips
    const userRes = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.status,
              p.id as creator_id, p.username as creator_username,
              p.display_name as creator_display_name, p.bio as creator_bio,
              p.profile_image as creator_profile_image
       FROM users u
       LEFT JOIN creator_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    const row = userRes.rows[0];

    if (row.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Your account is not active. Please contact platform support.' });
    }

    req.user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status
    };

    // If user is a creator, populate creator profile for creator_id scoping
    if (row.role === 'CREATOR' && row.creator_id) {
      req.creator = {
        id: row.creator_id,
        username: row.creator_username,
        display_name: row.creator_display_name,
        bio: row.creator_bio,
        profile_image: row.creator_profile_image
      };
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. Requires ${role} role privileges.` });
    }
    if (role === 'CREATOR' && (!req.creator || !req.creator.id)) {
      return res.status(403).json({ error: 'Access denied. Creator profile not initialized.' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  revokeToken,
  isTokenRevoked,
  JWT_SECRET,
};
