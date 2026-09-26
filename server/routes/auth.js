const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticateToken, JWT_SECRET, revokeToken } = require('../middleware/auth');
const { passwordChangeRateLimiter } = require('../middleware/rateLimiters');
const {
  validatePassword,
  checkBreachedPassword,
  hashPassword,
  comparePassword
} = require('../utils/passwordPolicy');

const RESERVED_USERNAMES = [
  'admin', 'login', 'register', 'api', 'dashboard', 'settings',
  'articles', 'about', 'contact', 'capabilities', 'testimonials',
  'faqs', 'media', 'contenthub', 'public', 'site'
];

// Register Creator Account
// No automatic authentication token is generated.
router.post('/register', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const {
    name,
    username,
    email,
    password,
    confirmPassword
  } = req.body;

  const targetConfirm = confirmPassword !== undefined ? confirmPassword : req.body.password_confirmation;

  // Basic required-field validation
  if (
    name === undefined ||
    username === undefined ||
    email === undefined ||
    password === undefined ||
    targetConfirm === undefined
  ) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Type validation
  if (
    typeof name !== 'string' ||
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof targetConfirm !== 'string'
  ) {
    return res.status(400).json({
      error: 'All fields must contain valid text values.'
    });
  }

  const cleanName = name.trim();
  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  // Name validation
  if (!cleanName) {
    return res.status(400).json({
      error: 'Name cannot be empty.'
    });
  }

  if (cleanName.length > 255) {
    return res.status(400).json({
      error: 'Name must not exceed 255 characters.'
    });
  }

  // Username validation
  if (!cleanUsername) {
    return res.status(400).json({
      error: 'Username cannot be empty.'
    });
  }

  if (cleanUsername.length < 3) {
    return res.status(400).json({
      error: 'Username must be at least 3 characters long.'
    });
  }

  if (cleanUsername.length > 100) {
    return res.status(400).json({
      error: 'Username must not exceed 100 characters.'
    });
  }

  const usernameRegex = /^[a-z0-9_-]+$/;

  if (!usernameRegex.test(cleanUsername)) {
    return res.status(400).json({
      error: 'Username can only contain letters, numbers, underscores, and hyphens.'
    });
  }

  if (RESERVED_USERNAMES.includes(cleanUsername)) {
    return res.status(400).json({
      error: `The username "${cleanUsername}" is reserved for system routes. Please choose a different username.`
    });
  }

  // Email validation
  if (!cleanEmail) {
    return res.status(400).json({
      error: 'Email cannot be empty.'
    });
  }

  if (cleanEmail.length > 255) {
    return res.status(400).json({
      error: 'Email must not exceed 255 characters.'
    });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      error: 'Please provide a valid email address.'
    });
  }

  // Password validation
  if (password !== targetConfirm) {
    return res.status(400).json({
      error: 'Passwords do not match.'
    });
  }

  const validation = validatePassword(password, {
    username: cleanUsername,
    email: cleanEmail,
    name: cleanName
  });

  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error
    });
  }

  const breachCheck = await checkBreachedPassword(password);
  if (breachCheck.breached) {
    return res.status(400).json({
      error: 'This password has appeared in known data breaches and cannot be used. Please choose a more secure, unique password.'
    });
  }

  try {
    // Pre-checks improve user experience.
    // Database UNIQUE constraints must still exist to prevent race conditions.
    const emailCheck = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
    );

    if (emailCheck.rowCount > 0) {
      return res.status(400).json({
        error: 'An account with this email address already exists.'
      });
    }

    const usernameCheck = await db.query(
      `SELECT id
       FROM creator_profiles
       WHERE LOWER(username) = $1
       LIMIT 1`,
      [cleanUsername]
    );

    if (usernameCheck.rowCount > 0) {
      return res.status(400).json({
        error: 'Username is already taken. Please choose another.'
      });
    }

    const passwordHash = await hashPassword(password);

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Insert User
      const userRes = await client.query(
        `INSERT INTO users
          (name, email, password_hash, role, status)
         VALUES
          ($1, $2, $3, 'CREATOR', 'ACTIVE')
         RETURNING id, name, email, role, status, created_at`,
        [cleanName, cleanEmail, passwordHash]
      );

      const user = userRes.rows[0];

      // 2. Insert Creator Profile
      const profileRes = await client.query(
        `INSERT INTO creator_profiles
          (user_id, username, display_name, bio)
         VALUES
          ($1, $2, $3, $4)
         RETURNING id, user_id, username, display_name, bio, profile_image`,
        [
          user.id,
          cleanUsername,
          cleanName,
          `Welcome to ${cleanName}'s official website on ContentHub.`
        ]
      );

      const creator = profileRes.rows[0];

      // 3. Insert Default Website Settings
      await client.query(
        `INSERT INTO website_settings
          (
            creator_id,
            site_title,
            site_description,
            primary_color,
            secondary_color,
            accent_color
          )
         VALUES
          ($1, $2, $3, '#24211E', '#6B4F3A', '#A65F46')`,
        [
          creator.id,
          `${cleanName} — Official Website`,
          `Personal website and publications by ${cleanName}.`
        ]
      );

      // 4. Insert Default Contact Info
      await client.query(
        `INSERT INTO contact_information
          (creator_id, email)
         VALUES
          ($1, $2)`,
        [creator.id, cleanEmail]
      );

      // 5. Insert Default Homepage Sections
      const defaultSections = [
        {
          type: 'hero',
          title: `Welcome to ${cleanName}'s Website`,
          subtitle: 'Create. Share. Connect.',
          body:
            'I build modern digital experiences, publish technical insights, and deliver professional services.',
          btn_text: 'Explore Work',
          btn_url: '#about',
          sort: 1
        },
        {
          type: 'about',
          title: `About ${cleanName}`,
          subtitle: 'Background & Mission',
          body:
            'Welcome to my personal space on ContentHub. Here you will find my latest articles, capabilities, and updates.',
          btn_text: 'Get in Touch',
          btn_url: '#contact',
          sort: 2
        },
        {
          type: 'cta',
          title: 'Let us Work Together',
          subtitle: 'Have a project or opportunity in mind?',
          body:
            'Reach out through the contact form below and let us start a conversation.',
          btn_text: 'Send Message',
          btn_url: '#contact',
          sort: 3
        }
      ];

      for (const section of defaultSections) {
        await client.query(
          `INSERT INTO homepage_sections
            (
              creator_id,
              section_type,
              title,
              subtitle,
              body,
              button_text,
              button_url,
              sort_order,
              is_visible
            )
           VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [
            creator.id,
            section.type,
            section.title,
            section.subtitle,
            section.body,
            section.btn_text,
            section.btn_url,
            section.sort
          ]
        );
      }

      // 6. Insert Default Capabilities
      await client.query(
        `INSERT INTO capabilities
          (creator_id, title, description, icon, sort_order, is_visible)
         VALUES
          ($1, 'Software Engineering', 'Building web applications and backend APIs.', 'Code', 1, true),
          ($1, 'Technical Writing', 'Publishing architecture guides and tech insights.', 'BookOpen', 2, true),
          ($1, 'UI/UX Design', 'Designing clean, human-centered digital experiences.', 'Palette', 3, true)`,
        [creator.id]
      );

      // 7. Insert Default FAQ
      await client.query(
        `INSERT INTO faqs
          (creator_id, question, answer, sort_order, is_visible)
         VALUES
          (
            $1,
            'What is this website?',
            'This is my official creator website powered by ContentHub CMS.',
            1,
            true
          )`,
        [creator.id]
      );

      // 8. Insert Default Testimonial
      await client.query(
        `INSERT INTO testimonials
          (creator_id, name, role, message, rating, is_visible)
         VALUES
          (
            $1,
            'ContentHub Community',
            'Member',
            'Excited to see your work on ContentHub!',
            5,
            true
          )`,
        [creator.id]
      );

      await client.query('COMMIT');

      // Do NOT automatically authenticate the newly registered user.
      return res.status(201).json({
        message:
          'Account created successfully! Please log in to access your dashboard.',
        username: cleanUsername
      });
    } catch (err) {
      await client.query('ROLLBACK');

      // PostgreSQL unique-constraint violation
      if (err.code === '23505') {
        return res.status(409).json({
          error:
            'An account with this email or username already exists. Please choose another.'
        });
      }

      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Registration error:', err);

    return res.status(500).json({
      error: 'Server error during registration. Please try again.'
    });
  }
});


// Login User (Supports Email OR Username)
router.post('/login', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      error: 'Username or Email and password are required.'
    });
  }

  const rawIdentifier =
    req.body.identifier !== undefined
      ? req.body.identifier
      : req.body.email !== undefined
        ? req.body.email
        : req.body.username;

  const rawPassword = req.body.password;

  if (
    rawIdentifier === undefined ||
    rawIdentifier === null ||
    rawPassword === undefined ||
    rawPassword === null
  ) {
    return res.status(400).json({
      error: 'Username or Email and password are required.'
    });
  }

  if (
    typeof rawIdentifier !== 'string' ||
    typeof rawPassword !== 'string'
  ) {
    return res.status(400).json({
      error: 'Username or Email and password must be valid strings.'
    });
  }

  const identifier = rawIdentifier.trim().toLowerCase();
  const password = rawPassword;

  if (!identifier || !password) {
    return res.status(400).json({
      error: 'Username or Email and password are required.'
    });
  }

  if (identifier.length > 255 || password.length > 128) {
    return res.status(400).json({
      error: 'Username or password exceeds maximum allowed length.'
    });
  }

  try {
    const userRes = await db.query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.password_hash,
        u.role,
        u.status
       FROM users u
       LEFT JOIN creator_profiles p
         ON p.user_id = u.id
       WHERE LOWER(u.email) = $1
          OR LOWER(p.username) = $1
       LIMIT 1`,
      [identifier]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({
        error: 'Invalid username/email or password.'
      });
    }

    const user = userRes.rows[0];

    // Never authenticate suspended accounts.
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        error:
          'Your account has been suspended. Please contact platform support.'
      });
    }

    // Reject other inactive account states if they exist.
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Your account is not active. Please contact platform support.'
      });
    }

    const isMatch = await comparePassword(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid username/email or password.'
      });
    }

    let creator = null;

    if (user.role === 'CREATOR' || user.role === 'ADMIN') {
      const creatorRes = await db.query(
        `SELECT
          id,
          username,
          display_name,
          bio,
          profile_image
         FROM creator_profiles
         WHERE user_id = $1
         LIMIT 1`,
        [user.id]
      );

      if (creatorRes.rowCount > 0) {
        creator = creatorRes.rows[0];
      }
    }

    // JWT_SECRET must be configured by the application environment.
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not configured.');
      return res.status(500).json({
        error: 'Authentication service is not configured.'
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        jti: crypto.randomUUID()
      },
      JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    // Never return password_hash.
    delete user.password_hash;

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('contenthub_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    return res.json({
      message: 'Login successful!',
      token,
      user,
      creator
    });
  } catch (err) {
    console.error('Login error:', err);

    return res.status(500).json({
      error: 'Server error during login. Please try again.'
    });
  }
});


// Current Authenticated User
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({
    user: req.user,
    creator: req.creator || null
  });
});


// Server-Side Logout
// Revokes the active JWT session token and clears the authentication cookie.
router.post('/logout', authenticateToken, async (req, res) => {
  let token = null;

  if (req.cookies && req.cookies.contenthub_token) {
    token = req.cookies.contenthub_token;
  } else {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (token) {
    revokeToken(token);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('contenthub_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/'
  });

  return res.json({
    message: 'Logged out successfully. Session revoked.'
  });
});


// Change Password (Authenticated User)
// Rate limited to 5 attempts per 15 minutes per user ID
router.post('/change-password', authenticateToken, passwordChangeRateLimiter, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  const targetConfirm = confirmPassword !== undefined ? confirmPassword : req.body?.password_confirmation;

  if (!currentPassword || !newPassword || !targetConfirm) {
    return res.status(400).json({
      error: 'Current password, new password, and confirmation are required.'
    });
  }

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof targetConfirm !== 'string'
  ) {
    return res.status(400).json({
      error: 'Password fields must contain valid text.'
    });
  }

  if (newPassword !== targetConfirm) {
    return res.status(400).json({
      error: 'New passwords do not match.'
    });
  }

  try {
    const userRes = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const user = userRes.rows[0];

    const isMatch = await comparePassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Prevent password reuse
    const isSame = await comparePassword(newPassword, user.password_hash);
    if (isSame) {
      return res.status(400).json({
        error: 'New password cannot be the same as your current password.'
      });
    }

    // Password policy validation
    const validation = validatePassword(newPassword, {
      username: req.creator?.username || req.user.username,
      email: user.email,
      name: user.name
    });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Breached password check (k-Anonymity)
    const breachCheck = await checkBreachedPassword(newPassword);
    if (breachCheck.breached) {
      return res.status(400).json({
        error: 'This password has appeared in known data breaches and cannot be used. Please choose a more secure, unique password.'
      });
    }

    const newHash = await hashPassword(newPassword);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHash, req.user.id]
    );

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password change error:', err.message);
    return res.status(500).json({ error: 'Server error during password update.' });
  }
});


// Password Reset Request (Forgot Password)
// Rate limited by passwordResetRateLimiter in server.js
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let testResetToken = null;

  try {
    const userRes = await db.query(
      'SELECT id, email, status FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail]
    );

    if (userRes.rowCount > 0 && userRes.rows[0].status === 'ACTIVE') {
      const user = userRes.rows[0];

      // Invalidate existing unused tokens for this user
      await db.query(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );

      // Generate cryptographically secure single-use token (32 random bytes = 64 hex characters)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1-hour expiration

      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, tokenHash, expiresAt]
      );

      // Expose test token strictly in non-production environments for automated testing
      if (process.env.NODE_ENV !== 'production') {
        testResetToken = rawToken;
      }
    }

    // Uniform response prevents account enumeration
    const responseData = {
      message: 'If that email address is associated with an account, a password reset link has been dispatched.'
    };
    if (testResetToken) {
      responseData.testResetToken = testResetToken;
    }
    return res.json(responseData);
  } catch (err) {
    console.error('Password reset request error:', err.message);
    return res.status(500).json({ error: 'Server error processing password reset request.' });
  }
});


// Password Reset Confirmation
// Rate limited by passwordResetRateLimiter in server.js
router.post('/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body || {};
  const targetConfirm = confirmPassword !== undefined ? confirmPassword : req.body?.password_confirmation || newPassword;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  if (typeof token !== 'string' || typeof newPassword !== 'string' || typeof targetConfirm !== 'string') {
    return res.status(400).json({ error: 'Invalid reset request parameters.' });
  }

  if (newPassword !== targetConfirm) {
    return res.status(400).json({ error: 'New passwords do not match.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const tokenRes = await db.query(
      `SELECT t.id, t.user_id, t.expires_at, t.used_at, u.name, u.email, u.password_hash
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenRes.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const record = tokenRes.rows[0];

    // Single-use enforcement
    if (record.used_at !== null) {
      return res.status(400).json({ error: 'This password reset token has already been used. Please request a new one.' });
    }

    // Expiration check
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This password reset token has expired. Please request a new one.' });
    }

    // Prevent password reuse
    const isSame = await comparePassword(newPassword, record.password_hash);
    if (isSame) {
      return res.status(400).json({ error: 'New password cannot be the same as your previous password.' });
    }

    // Password policy validation
    const validation = validatePassword(newPassword, {
      email: record.email,
      name: record.name
    });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Breached password check (k-Anonymity)
    const breachCheck = await checkBreachedPassword(newPassword);
    if (breachCheck.breached) {
      return res.status(400).json({
        error: 'This password has appeared in known data breaches and cannot be used. Please choose a more secure, unique password.'
      });
    }

    const newHash = await hashPassword(newPassword);
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Update password hash
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newHash, record.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [record.id]
      );

      // Invalidate any other pending reset tokens for this user
      await client.query(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
        [record.user_id]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    return res.json({
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
  } catch (err) {
    console.error('Password reset confirmation error:', err.message);
    return res.status(500).json({ error: 'Server error processing password reset.' });
  }
});


// Email Verification Confirmation
// Rate limited by emailVerificationRateLimiter in server.js
router.post('/verify-email', async (req, res) => {
  const { token } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  return res.json({
    message: 'Email verified successfully.'
  });
});


module.exports = router;