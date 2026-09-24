const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sanitizeObject, validateUrl } = require('../utils/sanitize');

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Apply input sanitization middleware to all incoming admin write requests
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
});

// Validate route :id parameter format to prevent SQL syntax errors (22003, 22P02)
router.param('id', (req, res, next, id) => {
  const numId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isInteger(numId) || numId < 1 || numId > 2147483647) {
    return res.status(400).json({ error: 'Invalid identifier format. Resource ID must be a positive integer.' });
  }
  next();
});

// Helper to get Admin creator_profile ID
async function getAdminCreatorId() {
  const res = await db.query(`SELECT id FROM creator_profiles WHERE username = 'admin'`);
  if (res.rowCount > 0) return res.rows[0].id;
  return null;
}

// Helper to log admin activity
async function logActivity(userId, actorName, action, targetInfo) {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, actor_name, action, target_info) VALUES ($1, $2, $3, $4)`,
      [userId, actorName, action, targetInfo]
    );
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

// 1. ADMIN DASHBOARD STATS & CHARTS
router.get('/stats', async (req, res) => {
  try {
    // Execute all 14 independent aggregation queries concurrently
    const [
      creatorsCount,
      activeCreatorsCount,
      suspendedCreatorsCount,
      postsCount,
      publishedPostsCount,
      draftPostsCount,
      mediaCount,
      messagesCount,
      growthRes,
      testimonialsCount,
      faqsCount,
      creatorArticlesRes,
      monthlyContentRes,
      monthlyMessagesRes
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM creator_profiles WHERE username != 'admin'`),
      db.query(`SELECT COUNT(*) FROM users WHERE role = 'CREATOR' AND status = 'ACTIVE'`),
      db.query(`SELECT COUNT(*) FROM users WHERE role = 'CREATOR' AND status = 'SUSPENDED'`),
      db.query(`SELECT COUNT(*) FROM posts`),
      db.query(`SELECT COUNT(*) FROM posts WHERE status = 'PUBLISHED'`),
      db.query(`SELECT COUNT(*) FROM posts WHERE status = 'DRAFT'`),
      db.query(`SELECT COUNT(*) FROM media`),
      db.query(`SELECT COUNT(*) FROM contact_messages`),
      db.query(`
        SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
        FROM users WHERE role = 'CREATOR'
        GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `),
      db.query(`SELECT COUNT(*) FROM testimonials`),
      db.query(`SELECT COUNT(*) FROM faqs`),
      db.query(`
        SELECT p.display_name,
               COUNT(CASE WHEN post.status = 'PUBLISHED' THEN 1 END) as published,
               COUNT(CASE WHEN post.status = 'DRAFT' THEN 1 END) as draft
        FROM creator_profiles p
        LEFT JOIN posts post ON post.creator_id = p.id
        WHERE p.username != 'admin'
        GROUP BY p.id, p.display_name
        ORDER BY p.display_name ASC LIMIT 8
      `),
      db.query(`
        SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
        FROM posts GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `),
      db.query(`
        SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
        FROM contact_messages GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `)
    ]);

    const contentDistribution = [
      { name: 'Articles', count: parseInt(postsCount.rows[0].count, 10), fill: '#A65F46' },
      { name: 'Media Items', count: parseInt(mediaCount.rows[0].count, 10), fill: '#B08A57' },
      { name: 'Testimonials', count: parseInt(testimonialsCount.rows[0].count, 10), fill: '#6B4F3A' },
      { name: 'FAQs', count: parseInt(faqsCount.rows[0].count, 10), fill: '#24211E' }
    ];

    const statusBreakdown = [
      { name: 'Active Creators', count: parseInt(activeCreatorsCount.rows[0].count, 10), fill: '#6B4F3A' },
      { name: 'Suspended Creators', count: parseInt(suspendedCreatorsCount.rows[0].count, 10), fill: '#A65F46' }
    ];

    return res.json({
      overview: {
        totalCreators: parseInt(creatorsCount.rows[0].count, 10),
        activeCreators: parseInt(activeCreatorsCount.rows[0].count, 10),
        suspendedCreators: parseInt(suspendedCreatorsCount.rows[0].count, 10),
        totalPosts: parseInt(postsCount.rows[0].count, 10),
        publishedPosts: parseInt(publishedPostsCount.rows[0].count, 10),
        draftPosts: parseInt(draftPostsCount.rows[0].count, 10),
        totalMedia: parseInt(mediaCount.rows[0].count, 10),
        totalMessages: parseInt(messagesCount.rows[0].count, 10)
      },
      charts: {
        creatorGrowth: growthRes.rows,
        contentDistribution,
        publishedVsDraft: creatorArticlesRes.rows,
        creatorStatus: statusBreakdown,
        monthlyContent: monthlyContentRes.rows,
        monthlyMessages: monthlyMessagesRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch platform dashboard analytics.' });
  }
});

// 2. CREATOR GOVERNANCE
router.get('/creators', async (req, res) => {
  const { search } = req.query;
  try {
    let query = `
      SELECT p.id as creator_id, p.username, p.display_name, p.profile_image,
             u.id as user_id, u.name, u.email, u.status, u.created_at,
             COUNT(DISTINCT post.id) as total_posts,
             COUNT(DISTINCT msg.id) as total_messages
      FROM creator_profiles p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN posts post ON post.creator_id = p.id
      LEFT JOIN contact_messages msg ON msg.creator_id = p.id
      WHERE p.username != 'admin'
    `;
    const params = [];

    const cleanSearch = typeof search === 'string' ? search.trim().toLowerCase() : '';
    if (cleanSearch !== '') {
      query += ` AND (LOWER(p.display_name) LIKE $1 OR LOWER(p.username) LIKE $1 OR LOWER(u.email) LIKE $1)`;
      params.push(`%${cleanSearch}%`);
    }

    query += ` GROUP BY p.id, u.id ORDER BY u.created_at DESC`;

    const creatorsRes = await db.query(query, params);
    return res.json({ creators: creatorsRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch creator accounts.' });
  }
});

router.patch('/creators/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be ACTIVE or SUSPENDED.' });
  }

  try {
    const creatorRes = await db.query(`SELECT user_id, display_name FROM creator_profiles WHERE id = $1`, [id]);
    if (creatorRes.rowCount === 0) return res.status(404).json({ error: 'Creator profile not found.' });

    const creatorObj = creatorRes.rows[0];

    // Administrative safeguard: Prevent suspending self
    if (creatorObj.user_id === req.user.id) {
      return res.status(403).json({ error: 'Administrative action forbidden: You cannot alter the suspension status of your own account.' });
    }

    const updateRes = await db.query(
      `UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status`,
      [status, creatorObj.user_id]
    );

    await logActivity(req.user.id, req.user.name, `${status === 'SUSPENDED' ? 'Suspended' : 'Activated'} Creator`, creatorObj.display_name);

    return res.json({ message: `Creator status updated to ${status} successfully!`, status: updateRes.rows[0].status });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update creator status.' });
  }
});

router.delete('/creators/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const creatorRes = await db.query(`SELECT user_id, display_name FROM creator_profiles WHERE id = $1`, [id]);
    if (creatorRes.rowCount === 0) return res.status(404).json({ error: 'Creator profile not found.' });

    const creatorObj = creatorRes.rows[0];

    // Administrative safeguard: Prevent deleting self
    if (creatorObj.user_id === req.user.id) {
      return res.status(403).json({ error: 'Administrative action forbidden: You cannot delete your own administrator account.' });
    }

    // Safeguard: Prevent deleting any platform administrator accounts through creator management
    const userRoleCheck = await db.query(`SELECT role FROM users WHERE id = $1`, [creatorObj.user_id]);
    if (userRoleCheck.rowCount > 0 && userRoleCheck.rows[0].role === 'ADMIN') {
      return res.status(403).json({ error: 'Administrative action forbidden: Platform administrator accounts cannot be deleted through this endpoint.' });
    }

    await db.query(`DELETE FROM users WHERE id = $1`, [creatorObj.user_id]);

    await logActivity(req.user.id, req.user.name, 'Deleted Creator Account', creatorObj.display_name);

    return res.json({ message: 'Creator account and all associated content deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete creator account.' });
  }
});

// 3. MAIN ADMIN PUBLIC WEBSITE (contenthub.com /) SETTINGS
router.get('/site/settings', async (req, res) => {
  const adminId = await getAdminCreatorId();
  try {
    const settingsRes = await db.query(`SELECT * FROM website_settings WHERE creator_id = $1`, [adminId]);
    return res.json({ settings: settingsRes.rows[0] || {} });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch Admin site settings.' });
  }
});

router.put('/site/settings', async (req, res) => {
  const adminId = await getAdminCreatorId();
  const { site_title, site_description, logo_url, primary_color, secondary_color, accent_color } = req.body;

  if (logo_url !== undefined && logo_url !== null && logo_url !== '') {
    const vUrl = validateUrl(logo_url, 'Logo URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    const updated = await db.query(
      `UPDATE website_settings
       SET site_title = COALESCE($1, site_title),
           site_description = COALESCE($2, site_description),
           logo_url = COALESCE($3, logo_url),
           primary_color = COALESCE($4, primary_color),
           secondary_color = COALESCE($5, secondary_color),
           accent_color = COALESCE($6, accent_color),
           updated_at = CURRENT_TIMESTAMP
       WHERE creator_id = $7
       RETURNING *`,
      [site_title, site_description, logo_url, primary_color, secondary_color, accent_color, adminId]
    );

    await logActivity(req.user.id, req.user.name, 'Updated Platform Website Settings', site_title || 'ContentHub Main Site');

    return res.json({ message: 'Main ContentHub website branding updated!', settings: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update Admin site settings.' });
  }
});

// 4. NAVIGATION & FOOTER SETTINGS
router.get('/site/navigation', async (req, res) => {
  const adminId = await getAdminCreatorId();
  try {
    const navRes = await db.query(`SELECT * FROM navigation_settings WHERE creator_id = $1`, [adminId]);
    return res.json({ navigation: navRes.rows[0] || {} });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch navigation settings.' });
  }
});

router.put('/site/navigation', async (req, res) => {
  const adminId = await getAdminCreatorId();
  const { footer_text, copyright_text, social_links } = req.body;

  let cleanSocialLinks = social_links;
  if (social_links !== undefined && social_links !== null) {
    let linksObj = social_links;
    if (typeof linksObj === 'string') {
      try {
        linksObj = JSON.parse(linksObj);
      } catch {
        return res.status(400).json({ error: 'Invalid social links JSON format.' });
      }
    }
    if (typeof linksObj === 'object' && linksObj !== null && !Array.isArray(linksObj)) {
      for (const [platform, link] of Object.entries(linksObj)) {
        if (link !== undefined && link !== null && link !== '') {
          const vUrl = validateUrl(link, `${platform} URL`, 2048, false);
          if (vUrl.error) return res.status(400).json({ error: vUrl.error });
        }
      }
      cleanSocialLinks = linksObj;
    } else if (linksObj !== '') {
      return res.status(400).json({ error: 'Social links must be an object.' });
    }
  }

  try {
    const updated = await db.query(
      `UPDATE navigation_settings
       SET footer_text = COALESCE($1, footer_text),
           copyright_text = COALESCE($2, copyright_text),
           social_links = COALESCE($3, social_links),
           updated_at = CURRENT_TIMESTAMP
       WHERE creator_id = $4
       RETURNING *`,
      [footer_text, copyright_text, typeof cleanSocialLinks === 'object' ? JSON.stringify(cleanSocialLinks) : cleanSocialLinks, adminId]
    );

    await logActivity(req.user.id, req.user.name, 'Updated Navigation & Footer Settings', 'Platform Website Navigation');

    return res.json({ message: 'Navigation & Footer settings updated!', navigation: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update navigation settings.' });
  }
});

// 5. ADMIN MEDIA LIBRARY
router.get('/media', async (req, res) => {
  const adminId = await getAdminCreatorId();
  try {
    const mediaRes = await db.query(`SELECT * FROM media WHERE creator_id = $1 ORDER BY created_at DESC`, [adminId]);
    return res.json({ media: mediaRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch Admin media.' });
  }
});

router.post('/media', async (req, res) => {
  const adminId = await getAdminCreatorId();
  const { url, title, alt_text, media_type } = req.body;

  const vUrl = validateUrl(url, 'Media URL', 2048, true);
  if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  const cleanUrl = vUrl.value;

  let cleanTitle = 'Platform Media';
  if (title !== undefined && title !== null) {
    if (typeof title !== 'string') {
      return res.status(400).json({ error: 'Title must be a string.' });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or fewer.' });
    }
    cleanTitle = trimmedTitle || 'Platform Media';
  }

  let cleanAlt = cleanTitle;
  if (alt_text !== undefined && alt_text !== null) {
    if (typeof alt_text !== 'string') {
      return res.status(400).json({ error: 'Alt text must be a string.' });
    }
    if (alt_text.trim().length > 255) {
      return res.status(400).json({ error: 'Alt text must be 255 characters or fewer.' });
    }
    cleanAlt = alt_text.trim();
  }

  let cleanMediaType = 'image';
  if (media_type !== undefined && media_type !== null) {
    if (typeof media_type !== 'string') {
      return res.status(400).json({ error: 'Media type must be a string.' });
    }
    if (media_type.trim().length > 50) {
      return res.status(400).json({ error: 'Media type must be 50 characters or fewer.' });
    }
    cleanMediaType = media_type.trim() || 'image';
  }

  try {
    const newMedia = await db.query(
      `INSERT INTO media (creator_id, url, title, alt_text, media_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [adminId, cleanUrl, cleanTitle, cleanAlt, cleanMediaType]
    );

    await logActivity(req.user.id, req.user.name, 'Added Platform Media Asset', cleanTitle);

    return res.status(201).json({ message: 'Media item added to platform library!', media: newMedia.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add media item.' });
  }
});

router.delete('/media/:id', async (req, res) => {
  const adminId = await getAdminCreatorId();
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM media WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, adminId]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Media item not found.' });
    return res.json({ message: 'Media item removed from platform library.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete media item.' });
  }
});

// 6. ADMIN CONTACT MESSAGES (Submitted on main contenthub.com / site)
router.get('/messages', async (req, res) => {
  const adminId = await getAdminCreatorId();
  try {
    const msgRes = await db.query(`SELECT * FROM contact_messages WHERE creator_id = $1 ORDER BY created_at DESC`, [adminId]);
    return res.json({ messages: msgRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch Admin messages.' });
  }
});

router.patch('/messages/:id/read', async (req, res) => {
  const adminId = await getAdminCreatorId();
  const { id } = req.params;
  try {
    const updated = await db.query(`UPDATE contact_messages SET is_read = true WHERE id = $1 AND creator_id = $2 RETURNING *`, [id, adminId]);
    if (updated.rowCount === 0) return res.status(404).json({ error: 'Message not found.' });
    return res.json({ message: 'Message marked as read!', contactMessage: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update message.' });
  }
});

router.delete('/messages/:id', async (req, res) => {
  const adminId = await getAdminCreatorId();
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM contact_messages WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, adminId]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Message not found.' });
    return res.json({ message: 'Message deleted!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete message.' });
  }
});

// 7. PLATFORM CONTENT & CATEGORIES
router.get('/content', async (req, res) => {
  try {
    const [postsRes, mediaRes] = await Promise.all([
      db.query(`
        SELECT p.id, p.title, p.slug, p.status, p.created_at, p.published_at,
               c.username as creator_username, c.display_name as creator_name
        FROM posts p
        JOIN creator_profiles c ON c.id = p.creator_id
        ORDER BY p.created_at DESC LIMIT 100
      `),
      db.query(`
        SELECT m.id, m.url, m.title, m.media_type, m.created_at,
               c.username as creator_username, c.display_name as creator_name
        FROM media m
        JOIN creator_profiles c ON c.id = m.creator_id
        ORDER BY m.created_at DESC LIMIT 100
      `)
    ]);

    return res.json({ posts: postsRes.rows, media: mediaRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch platform content.' });
  }
});

router.delete('/content/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const postRes = await db.query(`SELECT title FROM posts WHERE id = $1`, [id]);
    const postTitle = postRes.rowCount > 0 ? postRes.rows[0].title : 'Article';

    const delRes = await db.query(`DELETE FROM posts WHERE id = $1 RETURNING id`, [id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Article not found.' });

    await logActivity(req.user.id, req.user.name, 'Moderated & Removed Article', postTitle);

    return res.json({ message: 'Article removed by administrator.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove article.' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const catRes = await db.query(`
      SELECT cat.*, c.username as creator_username, c.display_name as creator_name
      FROM categories cat
      LEFT JOIN creator_profiles c ON c.id = cat.creator_id
      ORDER BY cat.created_at DESC
    `);
    return res.json({ categories: catRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

router.post('/categories', async (req, res) => {
  const { name, description } = req.body;
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required and must be a non-empty string.' });
  }

  const cleanName = name.trim();
  if (cleanName.length > 100) {
    return res.status(400).json({ error: 'Category name must be 100 characters or fewer.' });
  }

  let cleanDescription = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string.' });
    }
    cleanDescription = description.trim();
  }

  try {
    const adminId = await getAdminCreatorId();
    const newCat = await db.query(
      `INSERT INTO categories (creator_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [adminId, cleanName, cleanDescription]
    );

    await logActivity(req.user.id, req.user.name, 'Created Global Platform Category', cleanName);

    return res.status(201).json({ message: 'Global platform category created!', category: newCat.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create platform category.' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Category not found.' });
    return res.json({ message: 'Category deleted by administrator.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// 8. ACTIVITY LOG
router.get('/activity', async (req, res) => {
  try {
    const activityRes = await db.query(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100`);
    return res.json({ activities: activityRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

module.exports = router;
