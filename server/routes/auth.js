const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const RESERVED_USERNAMES = [
  'admin', 'login', 'register', 'api', 'dashboard', 'settings',
  'articles', 'about', 'contact', 'capabilities', 'testimonials',
  'faqs', 'media', 'contenthub', 'public', 'site'
];

// Register Creator Account (No auto-authentication token generated)
router.post('/register', async (req, res) => {
  const { name, username, email, password, confirmPassword } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  const usernameRegex = /^[a-z0-9_-]+$/;
  if (!usernameRegex.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens.' });
  }

  if (RESERVED_USERNAMES.includes(cleanUsername)) {
    return res.status(400).json({ error: `The username "${cleanUsername}" is reserved for system routes. Please choose a different username.` });
  }

  try {
    const emailCheck = await db.query(`SELECT id FROM users WHERE email = $1`, [cleanEmail]);
    if (emailCheck.rowCount > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const usernameCheck = await db.query(`SELECT id FROM creator_profiles WHERE username = $1`, [cleanUsername]);
    if (usernameCheck.rowCount > 0) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert User
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, 'CREATOR', 'ACTIVE') RETURNING id, name, email, role, status, created_at`,
        [name.trim(), cleanEmail, passwordHash]
      );
      const user = userRes.rows[0];

      // 2. Insert Creator Profile
      const profileRes = await client.query(
        `INSERT INTO creator_profiles (user_id, username, display_name, bio)
         VALUES ($1, $2, $3, $4) RETURNING id, user_id, username, display_name, bio, profile_image`,
        [user.id, cleanUsername, name.trim(), `Welcome to ${name.trim()}'s official website on ContentHub.`]
      );
      const creator = profileRes.rows[0];

      // 3. Insert Default Website Settings
      await client.query(
        `INSERT INTO website_settings (creator_id, site_title, site_description, primary_color, secondary_color, accent_color)
         VALUES ($1, $2, $3, '#24211E', '#6B4F3A', '#A65F46')`,
        [creator.id, `${name.trim()} — Official Website`, `Personal website and publications by ${name.trim()}.`]
      );

      // 4. Insert Default Contact Info
      await client.query(
        `INSERT INTO contact_information (creator_id, email)
         VALUES ($1, $2)`,
        [creator.id, cleanEmail]
      );

      // 5. Insert Default Homepage Sections
      const defaultSections = [
        {
          type: 'hero',
          title: `Welcome to ${name.trim()}'s Website`,
          subtitle: 'Create. Share. Connect.',
          body: `I build modern digital experiences, publish technical insights, and deliver professional services.`,
          btn_text: 'Explore Work',
          btn_url: '#about',
          sort: 1
        },
        {
          type: 'about',
          title: `About ${name.trim()}`,
          subtitle: 'Background & Mission',
          body: `Welcome to my personal space on ContentHub. Here you will find my latest articles, capabilities, and updates.`,
          btn_text: 'Get in Touch',
          btn_url: '#contact',
          sort: 2
        },
        {
          type: 'cta',
          title: 'Let us Work Together',
          subtitle: 'Have a project or opportunity in mind?',
          body: 'Reach out through the contact form below and let us start a conversation.',
          btn_text: 'Send Message',
          btn_url: '#contact',
          sort: 3
        }
      ];

      for (const s of defaultSections) {
        await client.query(
          `INSERT INTO homepage_sections (creator_id, section_type, title, subtitle, body, button_text, button_url, sort_order, is_visible)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [creator.id, s.type, s.title, s.subtitle, s.body, s.btn_text, s.btn_url, s.sort]
        );
      }

      // 6. Insert Default Capabilities
      await client.query(
        `INSERT INTO capabilities (creator_id, title, description, icon, sort_order, is_visible)
         VALUES
         ($1, 'Software Engineering', 'Building web applications and backend APIs.', 'Code', 1, true),
         ($1, 'Technical Writing', 'Publishing architecture guides and tech insights.', 'BookOpen', 2, true),
         ($1, 'UI/UX Design', 'Designing clean, human-centered digital experiences.', 'Palette', 3, true)`,
        [creator.id]
      );

      // 7. Insert Default FAQ & Testimonial
      await client.query(
        `INSERT INTO faqs (creator_id, question, answer, sort_order, is_visible)
         VALUES ($1, 'What is this website?', 'This is my official creator website powered by ContentHub CMS.', 1, true)`,
        [creator.id]
      );

      await client.query(
        `INSERT INTO testimonials (creator_id, name, role, message, rating, is_visible)
         VALUES ($1, 'ContentHub Community', 'Member', 'Excited to see your work on ContentHub!', 5, true)`,
        [creator.id]
      );

      await client.query('COMMIT');

      // DO NOT RETURN JWT TOKEN! Account is created, user must log in explicitly.
      return res.status(201).json({
        message: 'Account created successfully! Please log in to access your dashboard.',
        username: cleanUsername
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration. Please try again.' });
  }
});

// Login User (Supports Email OR Username)
router.post('/login', async (req, res) => {
  const identifier = (req.body.identifier || req.body.email || req.body.username || '').trim().toLowerCase();
  const password = req.body.password;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username or Email and password are required.' });
  }

  try {
    const userRes = await db.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.status
       FROM users u
       LEFT JOIN creator_profiles p ON p.user_id = u.id
       WHERE LOWER(u.email) = $1 OR LOWER(p.username) = $1`,
      [identifier]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact platform support.' });
    }

    let creator = null;
    if (user.role === 'CREATOR' || user.role === 'ADMIN') {
      const creatorRes = await db.query(
        `SELECT id, username, display_name, bio, profile_image FROM creator_profiles WHERE user_id = $1`,
        [user.id]
      );
      if (creatorRes.rowCount > 0) {
        creator = creatorRes.rows[0];
      }
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password_hash;

    return res.json({
      message: 'Login successful!',
      token,
      user,
      creator
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// Current Authenticated User
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({
    user: req.user,
    creator: req.creator || null
  });
});

module.exports = router;
