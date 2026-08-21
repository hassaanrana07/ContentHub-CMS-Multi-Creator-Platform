const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper to look up active creator profile by username
async function getActiveCreator(username) {
  const cleanUsername = (username || 'admin').trim().toLowerCase();
  const res = await db.query(
    `SELECT p.id, p.user_id, p.username, p.display_name, p.bio, p.profile_image, u.status, u.role
     FROM creator_profiles p
     JOIN users u ON u.id = p.user_id
     WHERE LOWER(p.username) = $1`,
    [cleanUsername]
  );

  if (res.rowCount === 0) {
    return { error: 'Website not found.', status: 404 };
  }

  const creator = res.rows[0];
  if (creator.status === 'SUSPENDED') {
    return { error: 'This creator website is currently suspended and unavailable.', status: 403 };
  }

  return { creator };
}

// 1. Admin / Main ContentHub Public Website Data
router.get('/site/admin', async (req, res) => {
  req.params.username = 'admin';
  return getPublicSiteData(req, res);
});

// 2. Dynamic Public Website Data for any :username
router.get('/site/:username', async (req, res) => {
  return getPublicSiteData(req, res);
});

async function getPublicSiteData(req, res) {
  const { username } = req.params;
  const { creator, error, status } = await getActiveCreator(username);

  if (error) {
    return res.status(status).json({ error });
  }

  try {
    const settingsRes = await db.query(`SELECT * FROM website_settings WHERE creator_id = $1`, [creator.id]);
    const navSettingsRes = await db.query(`SELECT * FROM navigation_settings WHERE creator_id = $1`, [creator.id]);
    const sectionsRes = await db.query(
      `SELECT * FROM homepage_sections WHERE creator_id = $1 AND is_visible = true ORDER BY sort_order ASC, id ASC`,
      [creator.id]
    );
    const capabilitiesRes = await db.query(
      `SELECT * FROM capabilities WHERE creator_id = $1 AND is_visible = true ORDER BY sort_order ASC, id ASC`,
      [creator.id]
    );

    // Fetch maximum 3 published posts for the homepage
    const recentPostsRes = await db.query(
      `SELECT p.id, p.title, p.slug, p.summary, p.featured_image, p.published_at, c.name as category_name
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.creator_id = $1 AND p.status = 'PUBLISHED'
       ORDER BY p.published_at DESC LIMIT 3`,
      [creator.id]
    );

    // Fetch total count of published posts to determine if "View All Articles" button should show
    const totalPostsCountRes = await db.query(
      `SELECT COUNT(*) FROM posts WHERE creator_id = $1 AND status = 'PUBLISHED'`,
      [creator.id]
    );
    const publishedPostsCount = parseInt(totalPostsCountRes.rows[0].count, 10);

    const testimonialsRes = await db.query(
      `SELECT id, name, role, message, avatar_url, rating FROM testimonials WHERE creator_id = $1 AND is_visible = true ORDER BY created_at DESC`,
      [creator.id]
    );
    const faqsRes = await db.query(
      `SELECT id, question, answer, sort_order FROM faqs WHERE creator_id = $1 AND is_visible = true ORDER BY sort_order ASC, id ASC`,
      [creator.id]
    );
    const contactInfoRes = await db.query(`SELECT * FROM contact_information WHERE creator_id = $1`, [creator.id]);
    const mediaRes = await db.query(
      `SELECT id, url, title, alt_text, media_type FROM media WHERE creator_id = $1 ORDER BY created_at DESC LIMIT 12`,
      [creator.id]
    );

    return res.json({
      creator: {
        username: creator.username,
        display_name: creator.display_name,
        bio: creator.bio,
        profile_image: creator.profile_image,
        role: creator.role
      },
      settings: settingsRes.rows[0] || {},
      navigation: navSettingsRes.rows[0] || {},
      sections: sectionsRes.rows,
      capabilities: capabilitiesRes.rows,
      recent_posts: recentPostsRes.rows,
      published_posts_count: publishedPostsCount,
      testimonials: testimonialsRes.rows,
      faqs: faqsRes.rows,
      contact_info: contactInfoRes.rows[0] || {},
      media: mediaRes.rows
    });
  } catch (err) {
    console.error('Public site fetch error:', err);
    return res.status(500).json({ error: 'Failed to load creator website.' });
  }
}

// 3. Public Articles Listing for :username
router.get('/site/:username/posts', async (req, res) => {
  const { username } = req.params;
  const { creator, error, status } = await getActiveCreator(username);

  if (error) {
    return res.status(status).json({ error });
  }

  try {
    const postsRes = await db.query(
      `SELECT p.id, p.title, p.slug, p.summary, p.content, p.featured_image, p.published_at, c.name as category_name
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.creator_id = $1 AND p.status = 'PUBLISHED'
       ORDER BY p.published_at DESC`,
      [creator.id]
    );
    return res.json({
      posts: postsRes.rows,
      creator: { username: creator.username, display_name: creator.display_name }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load creator articles.' });
  }
});

// 4. Public Single Article Details for :username and :slug
router.get('/site/:username/posts/:slug', async (req, res) => {
  const { username, slug } = req.params;
  const { creator, error, status } = await getActiveCreator(username);

  if (error) {
    return res.status(status).json({ error });
  }

  try {
    const postRes = await db.query(
      `SELECT p.*, c.name as category_name
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.creator_id = $1 AND p.slug = $2 AND p.status = 'PUBLISHED'`,
      [creator.id, slug.trim()]
    );

    if (postRes.rowCount === 0) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    return res.json({ post: postRes.rows[0], creator: { username: creator.username, display_name: creator.display_name } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load article details.' });
  }
});

// 5. Submit Contact Form (Directly to :username's or Admin's inbox)
router.post('/site/:username/contact', async (req, res) => {
  const { username } = req.params;
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const { creator, error, status } = await getActiveCreator(username);
  if (error) {
    return res.status(status).json({ error });
  }

  try {
    await db.query(
      `INSERT INTO contact_messages (creator_id, name, email, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [creator.id, name.trim(), email.trim(), subject || 'Website Contact Form Inquiry', message.trim()]
    );

    return res.status(201).json({ message: 'Message sent successfully! Thank you for getting in touch.' });
  } catch (err) {
    console.error('Submit contact message error:', err);
    return res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

module.exports = router;
