const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'contenthub_super_secret_jwt_key_2026_prod_key';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from DB to ensure account is active and fresh
    const userRes = await db.query(
      `SELECT id, name, email, role, status FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    const user = userRes.rows[0];

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact platform support.' });
    }

    req.user = user;

    // If user is a creator, fetch creator profile for creator_id scoping
    if (user.role === 'CREATOR') {
      const creatorRes = await db.query(
        `SELECT id, username, display_name, bio, profile_image FROM creator_profiles WHERE user_id = $1`,
        [user.id]
      );
      if (creatorRes.rowCount > 0) {
        req.creator = creatorRes.rows[0];
      }
    }

    next();
  } catch (err) {
    console.error('JWT Authentication error:', err.message);
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
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET,
};
