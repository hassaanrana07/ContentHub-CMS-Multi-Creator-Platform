const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sanitizeObject, validateUrl } = require('../utils/sanitize');

router.use(authenticateToken);
router.use(requireRole('CREATOR'));

// Apply input sanitization middleware to all incoming creator write requests
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
});

// Validate route :id parameter format to prevent SQL syntax/type errors (22P02, 22003)
router.param('id', (req, res, next, id) => {
  const numId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isInteger(numId) || numId < 1 || numId > 2147483647) {
    return res.status(400).json({ error: 'Invalid identifier format. Resource ID must be a positive integer.' });
  }
  next();
});

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function validateInt(val, fieldName, min = 0, max = 2147483647) {
  if (val === undefined || val === null || val === '') return { value: undefined };
  const num = typeof val === 'number'
    ? val
    : (typeof val === 'string' && /^-?\d+$/.test(val.trim()) ? Number(val.trim()) : NaN);
  if (!Number.isInteger(num) || num < min || num > max) {
    return { error: `${fieldName} must be an integer between ${min} and ${max}.` };
  }
  return { value: num };
}

function validateString(val, fieldName, maxLength, required = false) {
  if (val === undefined || val === null) {
    if (required) return { error: `${fieldName} is required.` };
    return { value: undefined };
  }
  if (typeof val !== 'string') {
    return { error: `${fieldName} must be a string.` };
  }
  const trimmed = val.trim();
  if (required && trimmed.length === 0) {
    return { error: `${fieldName} cannot be empty.` };
  }
  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer.` };
  }
  return { value: trimmed };
}

// 1. CREATOR OVERVIEW & STATS
router.get('/dashboard/stats', async (req, res) => {
  const creatorId = req.creator.id;
  try {
    const [
      publishedRes,
      draftRes,
      sectionsRes,
      capabilitiesRes,
      testimonialsRes,
      faqsRes,
      unreadMessagesRes,
      mediaRes
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM posts WHERE creator_id = $1 AND status = 'PUBLISHED'`, [creatorId]),
      db.query(`SELECT COUNT(*) FROM posts WHERE creator_id = $1 AND status = 'DRAFT'`, [creatorId]),
      db.query(`SELECT COUNT(*) FROM homepage_sections WHERE creator_id = $1`, [creatorId]),
      db.query(`SELECT COUNT(*) FROM capabilities WHERE creator_id = $1`, [creatorId]),
      db.query(`SELECT COUNT(*) FROM testimonials WHERE creator_id = $1`, [creatorId]),
      db.query(`SELECT COUNT(*) FROM faqs WHERE creator_id = $1`, [creatorId]),
      db.query(`SELECT COUNT(*) FROM contact_messages WHERE creator_id = $1 AND is_read = false`, [creatorId]),
      db.query(`SELECT COUNT(*) FROM media WHERE creator_id = $1`, [creatorId])
    ]);

    return res.json({
      stats: {
        publishedPosts: parseInt(publishedRes.rows[0].count, 10),
        draftPosts: parseInt(draftRes.rows[0].count, 10),
        homepageSections: parseInt(sectionsRes.rows[0].count, 10),
        capabilities: parseInt(capabilitiesRes.rows[0].count, 10),
        testimonials: parseInt(testimonialsRes.rows[0].count, 10),
        faqs: parseInt(faqsRes.rows[0].count, 10),
        unreadMessages: parseInt(unreadMessagesRes.rows[0].count, 10),
        mediaItems: parseInt(mediaRes.rows[0].count, 10)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load dashboard statistics.' });
  }
});

// 2. CREATOR PROFILE
router.get('/profile', async (req, res) => {
  try {
    const profileRes = await db.query(
      `SELECT p.*, u.name, u.email FROM creator_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
      [req.creator.id]
    );
    return res.json({ profile: profileRes.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch creator profile.' });
  }
});

router.put('/profile', async (req, res) => {
  const { display_name, bio, profile_image, name } = req.body;
  const creatorId = req.creator.id;

  if (name !== undefined && name !== null) {
    const vName = validateString(name, 'Name', 255, true);
    if (vName.error) return res.status(400).json({ error: vName.error });
  }
  if (display_name !== undefined && display_name !== null) {
    const vDisplay = validateString(display_name, 'Display name', 255, false);
    if (vDisplay.error) return res.status(400).json({ error: vDisplay.error });
  }
  if (bio !== undefined && bio !== null && typeof bio !== 'string') {
    return res.status(400).json({ error: 'Bio must be a string.' });
  }
  if (profile_image !== undefined && profile_image !== null && profile_image !== '') {
    const vUrl = validateUrl(profile_image, 'Profile image', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    if (name) {
      await db.query(`UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [name.trim(), req.user.id]);
    }
    const updateRes = await db.query(
      `UPDATE creator_profiles
       SET display_name = COALESCE($1, display_name),
           bio = COALESCE($2, bio),
           profile_image = COALESCE($3, profile_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [display_name !== undefined ? (typeof display_name === 'string' ? display_name.trim() : display_name) : null, bio, profile_image, creatorId]
    );
    return res.json({ message: 'Profile updated successfully!', profile: updateRes.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update creator profile.' });
  }
});

// 3. WEBSITE SETTINGS (Includes Full Palette & Typography Controls)
router.get('/website-settings', async (req, res) => {
  try {
    const settingsRes = await db.query(`SELECT * FROM website_settings WHERE creator_id = $1`, [req.creator.id]);
    return res.json({ settings: settingsRes.rows[0] || {} });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch website settings.' });
  }
});

router.put('/website-settings', async (req, res) => {
  const {
    site_title,
    site_description,
    logo_url,
    favicon_url,
    primary_color,
    secondary_color,
    accent_color,
    bg_color,
    surface_color,
    text_color,
    muted_color,
    font_family,
    base_font_size,
    heading_scale
  } = req.body;

  if (site_title !== undefined && site_title !== null) {
    const v = validateString(site_title, 'Site title', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }

  const colorFields = { primary_color, secondary_color, accent_color, bg_color, surface_color, text_color, muted_color };
  for (const [key, val] of Object.entries(colorFields)) {
    if (val !== undefined && val !== null) {
      const v = validateString(val, key, 50, false);
      if (v.error) return res.status(400).json({ error: v.error });
    }
  }

  if (font_family !== undefined && font_family !== null) {
    const v = validateString(font_family, 'Font family', 100, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (base_font_size !== undefined && base_font_size !== null) {
    const v = validateString(base_font_size, 'Base font size', 20, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (heading_scale !== undefined && heading_scale !== null) {
    const v = validateString(heading_scale, 'Heading scale', 20, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }

  if (logo_url !== undefined && logo_url !== null && logo_url !== '') {
    const vUrl = validateUrl(logo_url, 'Logo URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }
  if (favicon_url !== undefined && favicon_url !== null && favicon_url !== '') {
    const vUrl = validateUrl(favicon_url, 'Favicon URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    const updateRes = await db.query(
      `UPDATE website_settings
       SET site_title = COALESCE($1, site_title),
           site_description = COALESCE($2, site_description),
           logo_url = COALESCE($3, logo_url),
           favicon_url = COALESCE($4, favicon_url),
           primary_color = COALESCE($5, primary_color),
           secondary_color = COALESCE($6, secondary_color),
           accent_color = COALESCE($7, accent_color),
           bg_color = COALESCE($8, bg_color),
           surface_color = COALESCE($9, surface_color),
           text_color = COALESCE($10, text_color),
           muted_color = COALESCE($11, muted_color),
           font_family = COALESCE($12, font_family),
           base_font_size = COALESCE($13, base_font_size),
           heading_scale = COALESCE($14, heading_scale),
           updated_at = CURRENT_TIMESTAMP
       WHERE creator_id = $15
       RETURNING *`,
      [
        site_title, site_description, logo_url, favicon_url,
        primary_color, secondary_color, accent_color,
        bg_color, surface_color, text_color, muted_color,
        font_family, base_font_size, heading_scale, req.creator.id
      ]
    );
    return res.json({ message: 'Website settings updated successfully!', settings: updateRes.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update website settings.' });
  }
});

// 4. HOMEPAGE SECTIONS
router.get('/sections', async (req, res) => {
  try {
    const sectionsRes = await db.query(
      `SELECT * FROM homepage_sections WHERE creator_id = $1 ORDER BY sort_order ASC, id ASC`,
      [req.creator.id]
    );
    return res.json({ sections: sectionsRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch homepage sections.' });
  }
});

router.post('/sections', async (req, res) => {
  const { section_type, title, subtitle, body, image_url, button_text, button_url, is_visible } = req.body;
  const vType = validateString(section_type, 'Section type', 50, true);
  if (vType.error) return res.status(400).json({ error: vType.error });

  if (title !== undefined && title !== null) {
    const v = validateString(title, 'Title', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (subtitle !== undefined && subtitle !== null) {
    const v = validateString(subtitle, 'Subtitle', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (button_text !== undefined && button_text !== null) {
    const v = validateString(button_text, 'Button text', 100, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (button_url !== undefined && button_url !== null && button_url !== '') {
    const vUrl = validateUrl(button_url, 'Button URL', 255, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }
  if (image_url !== undefined && image_url !== null && image_url !== '') {
    const vUrl = validateUrl(image_url, 'Image URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    const maxOrderRes = await db.query(`SELECT COALESCE(MAX(sort_order), 0) as max_order FROM homepage_sections WHERE creator_id = $1`, [req.creator.id]);
    const nextOrder = parseInt(maxOrderRes.rows[0].max_order, 10) + 1;

    const newSection = await db.query(
      `INSERT INTO homepage_sections (creator_id, section_type, title, subtitle, body, image_url, button_text, button_url, sort_order, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.creator.id, vType.value, title, subtitle, body, image_url, button_text, button_url, nextOrder, is_visible !== false]
    );

    return res.status(201).json({ message: 'Homepage section created successfully!', section: newSection.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create homepage section.' });
  }
});

router.put('/sections/:id', async (req, res) => {
  const { id } = req.params;
  const { section_type, title, subtitle, body, image_url, button_text, button_url, is_visible, sort_order } = req.body;

  let cleanSortOrder = sort_order;
  if (sort_order !== undefined && sort_order !== null && sort_order !== '') {
    const v = validateInt(sort_order, 'Sort order', 0, 2147483647);
    if (v.error) return res.status(400).json({ error: v.error });
    cleanSortOrder = v.value;
  }
  if (section_type !== undefined && section_type !== null) {
    const v = validateString(section_type, 'Section type', 50, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (title !== undefined && title !== null) {
    const v = validateString(title, 'Title', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (subtitle !== undefined && subtitle !== null) {
    const v = validateString(subtitle, 'Subtitle', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (button_text !== undefined && button_text !== null) {
    const v = validateString(button_text, 'Button text', 100, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (button_url !== undefined && button_url !== null && button_url !== '') {
    const vUrl = validateUrl(button_url, 'Button URL', 255, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }
  if (image_url !== undefined && image_url !== null && image_url !== '') {
    const vUrl = validateUrl(image_url, 'Image URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    const updated = await db.query(
      `UPDATE homepage_sections
       SET section_type = COALESCE($1, section_type),
           title = COALESCE($2, title),
           subtitle = COALESCE($3, subtitle),
           body = COALESCE($4, body),
           image_url = COALESCE($5, image_url),
           button_text = COALESCE($6, button_text),
           button_url = COALESCE($7, button_url),
           is_visible = COALESCE($8, is_visible),
           sort_order = COALESCE($9, sort_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND creator_id = $11
       RETURNING *`,
      [section_type, title, subtitle, body, image_url, button_text, button_url, is_visible, cleanSortOrder, id, req.creator.id]
    );

    if (updated.rowCount === 0) return res.status(404).json({ error: 'Section not found or unauthorized.' });
    return res.json({ message: 'Homepage section updated successfully!', section: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update homepage section.' });
  }
});

router.delete('/sections/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM homepage_sections WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, req.creator.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Section not found.' });
    return res.json({ message: 'Homepage section deleted successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete homepage section.' });
  }
});

router.patch('/sections/reorder', async (req, res) => {
  const { sectionIds } = req.body;
  if (!Array.isArray(sectionIds)) return res.status(400).json({ error: 'Invalid payload. sectionIds must be an array.' });

  const validIds = [];
  for (const id of sectionIds) {
    const num = typeof id === 'number'
      ? id
      : (typeof id === 'string' && /^\d+$/.test(id.trim()) ? Number(id.trim()) : NaN);

    if (!Number.isInteger(num) || num < 1 || num > 2147483647) {
      return res.status(400).json({ error: 'Invalid payload. Every section ID must be a positive integer.' });
    }
    validIds.push(num);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    for (let index = 0; index < validIds.length; index++) {
      await client.query(`UPDATE homepage_sections SET sort_order = $1 WHERE id = $2 AND creator_id = $3`, [index + 1, validIds[index], req.creator.id]);
    }
    await client.query('COMMIT');
    return res.json({ message: 'Sections reordered successfully!' });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to reorder sections.' });
  } finally {
    client.release();
  }
});

// 5. CAPABILITIES CMS
router.get('/capabilities', async (req, res) => {
  try {
    const capRes = await db.query(`SELECT * FROM capabilities WHERE creator_id = $1 ORDER BY sort_order ASC, id ASC`, [req.creator.id]);
    return res.json({ capabilities: capRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch capabilities.' });
  }
});

router.post('/capabilities', async (req, res) => {
  const { title, description, icon, image_url, is_visible } = req.body;
  const vTitle = validateString(title, 'Capability title', 255, true);
  if (vTitle.error) return res.status(400).json({ error: vTitle.error });

  if (icon !== undefined && icon !== null) {
    const v = validateString(icon, 'Icon', 100, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (image_url !== undefined && image_url !== null && image_url !== '') {
    const vUrl = validateUrl(image_url, 'Image URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    const maxRes = await db.query(`SELECT COALESCE(MAX(sort_order), 0) as m FROM capabilities WHERE creator_id = $1`, [req.creator.id]);
    const nextOrder = parseInt(maxRes.rows[0].m, 10) + 1;

    const newCap = await db.query(
      `INSERT INTO capabilities (creator_id, title, description, icon, image_url, sort_order, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.creator.id, vTitle.value, description, icon || 'Sparkles', image_url, nextOrder, is_visible !== false]
    );

    return res.status(201).json({ message: 'Capability added successfully!', capability: newCap.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add capability.' });
  }
});

router.put('/capabilities/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, icon, image_url, is_visible, sort_order } = req.body;

  let cleanSortOrder = sort_order;
  if (sort_order !== undefined && sort_order !== null && sort_order !== '') {
    const v = validateInt(sort_order, 'Sort order', 0, 2147483647);
    if (v.error) return res.status(400).json({ error: v.error });
    cleanSortOrder = v.value;
  }
  if (title !== undefined && title !== null) {
    const v = validateString(title, 'Capability title', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (icon !== undefined && icon !== null) {
    const v = validateString(icon, 'Icon', 100, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (image_url !== undefined && image_url !== null && image_url !== '') {
    const vUrl = validateUrl(image_url, 'Image URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    const updated = await db.query(
      `UPDATE capabilities
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           icon = COALESCE($3, icon),
           image_url = COALESCE($4, image_url),
           is_visible = COALESCE($5, is_visible),
           sort_order = COALESCE($6, sort_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND creator_id = $8
       RETURNING *`,
      [title, description, icon, image_url, is_visible, cleanSortOrder, id, req.creator.id]
    );

    if (updated.rowCount === 0) return res.status(404).json({ error: 'Capability not found or unauthorized.' });
    return res.json({ message: 'Capability updated successfully!', capability: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update capability.' });
  }
});

router.delete('/capabilities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM capabilities WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, req.creator.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Capability not found.' });
    return res.json({ message: 'Capability deleted successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete capability.' });
  }
});

// 6. ARTICLES & POSTS CMS
router.get('/posts', async (req, res) => {
  try {
    const postsRes = await db.query(
      `SELECT p.*, c.name as category_name FROM posts p LEFT JOIN categories c ON c.id = p.category_id WHERE p.creator_id = $1 ORDER BY p.created_at DESC`,
      [req.creator.id]
    );
    return res.json({ posts: postsRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch articles.' });
  }
});

router.post('/posts', async (req, res) => {
  const { title, slug, summary, content, featured_image, category_id, status } = req.body;
  const vTitle = validateString(title, 'Article title', 255, true);
  if (vTitle.error) return res.status(400).json({ error: vTitle.error });
  const cleanTitle = vTitle.value;

  if (slug !== undefined && slug !== null) {
    const v = validateString(slug, 'Slug', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (status !== undefined && status !== null) {
    const v = validateString(status, 'Status', 50, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }

  if (featured_image !== undefined && featured_image !== null && featured_image !== '') {
    const vUrl = validateUrl(featured_image, 'Featured image URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  const postSlug = slugify(slug || cleanTitle);
  if (!postSlug) {
    return res.status(400).json({ error: 'Article title must contain at least one alphanumeric character to generate a URL slug.' });
  }

  const postStatus = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  const publishedAt = postStatus === 'PUBLISHED' ? new Date() : null;

  let validatedCategoryId = null;
  if (category_id !== undefined && category_id !== null && category_id !== '') {
    const catNum = typeof category_id === 'number'
      ? category_id
      : (typeof category_id === 'string' && /^\d+$/.test(category_id.trim()) ? Number(category_id.trim()) : NaN);

    if (!Number.isInteger(catNum) || catNum < 1 || catNum > 2147483647) {
      return res.status(400).json({ error: 'Invalid category format. Category ID must be a positive integer.' });
    }
    validatedCategoryId = catNum;
  }

  try {
    if (validatedCategoryId) {
      const catCheck = await db.query(
        `SELECT id FROM categories WHERE id = $1 AND (creator_id = $2 OR creator_id IN (SELECT id FROM creator_profiles WHERE username = 'admin'))`,
        [validatedCategoryId, req.creator.id]
      );
      if (catCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid category. Category does not exist or does not belong to your account.' });
      }
    }

    const slugCheck = await db.query(`SELECT id FROM posts WHERE creator_id = $1 AND slug = $2`, [req.creator.id, postSlug]);
    if (slugCheck.rowCount > 0) {
      return res.status(400).json({ error: 'An article with this URL slug already exists. Please choose a different title or custom slug.' });
    }

    const newPost = await db.query(
      `INSERT INTO posts (creator_id, category_id, title, slug, summary, content, featured_image, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.creator.id, validatedCategoryId || null, cleanTitle, postSlug, summary, content, featured_image, postStatus, publishedAt]
    );

    return res.status(201).json({ message: 'Article created successfully!', post: newPost.rows[0] });
  } catch (err) {
    if (err.code === '23505' && (err.constraint === 'unique_creator_slug' || (err.message && err.message.includes('unique_creator_slug')))) {
      return res.status(400).json({ error: 'An article with this URL slug already exists. Please choose a different title or custom slug.' });
    }
    return res.status(500).json({ error: 'Failed to create article.' });
  }
});

router.put('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, slug, summary, content, featured_image, category_id, status } = req.body;

  let cleanTitle = undefined;
  if (title !== undefined && title !== null) {
    const vTitle = validateString(title, 'Article title', 255, true);
    if (vTitle.error) return res.status(400).json({ error: vTitle.error });
    cleanTitle = vTitle.value;
  }
  if (slug !== undefined && slug !== null) {
    const v = validateString(slug, 'Slug', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }
  if (status !== undefined && status !== null) {
    const v = validateString(status, 'Status', 50, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }

  if (featured_image !== undefined && featured_image !== null && featured_image !== '') {
    const vUrl = validateUrl(featured_image, 'Featured image URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  let validatedCategoryId = undefined;
  if (category_id !== undefined && category_id !== null && category_id !== '') {
    const catNum = typeof category_id === 'number'
      ? category_id
      : (typeof category_id === 'string' && /^\d+$/.test(category_id.trim()) ? Number(category_id.trim()) : NaN);

    if (!Number.isInteger(catNum) || catNum < 1 || catNum > 2147483647) {
      return res.status(400).json({ error: 'Invalid category format. Category ID must be a positive integer.' });
    }
    validatedCategoryId = catNum;
  } else if (category_id === null) {
    validatedCategoryId = null;
  }

  try {
    const currentPostRes = await db.query(`SELECT status FROM posts WHERE id = $1 AND creator_id = $2`, [id, req.creator.id]);
    if (currentPostRes.rowCount === 0) return res.status(404).json({ error: 'Article not found or unauthorized.' });

    if (validatedCategoryId !== undefined && validatedCategoryId !== null) {
      const catCheck = await db.query(
        `SELECT id FROM categories WHERE id = $1 AND (creator_id = $2 OR creator_id IN (SELECT id FROM creator_profiles WHERE username = 'admin'))`,
        [validatedCategoryId, req.creator.id]
      );
      if (catCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid category. Category does not exist or does not belong to your account.' });
      }
    }

    const currentPost = currentPostRes.rows[0];
    const postSlug = slug ? slugify(slug) : undefined;
    if (slug && !postSlug) {
      return res.status(400).json({ error: 'Custom slug must contain at least one alphanumeric character.' });
    }

    if (postSlug) {
      const slugCheck = await db.query(
        `SELECT id FROM posts WHERE creator_id = $1 AND slug = $2 AND id != $3`,
        [req.creator.id, postSlug, id]
      );
      if (slugCheck.rowCount > 0) {
        return res.status(400).json({ error: 'An article with this URL slug already exists. Please choose a different title or custom slug.' });
      }
    }

    const postStatus = status ? (status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT') : currentPost.status;
    let publishedAt = currentPost.published_at;

    if (status === 'PUBLISHED' && currentPost.status !== 'PUBLISHED') {
      publishedAt = new Date();
    } else if (status === 'DRAFT') {
      publishedAt = null;
    }

    const updated = await db.query(
      `UPDATE posts
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           summary = COALESCE($3, summary),
           content = COALESCE($4, content),
           featured_image = COALESCE($5, featured_image),
           category_id = COALESCE($6, category_id),
           status = $7,
           published_at = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND creator_id = $10
       RETURNING *`,
      [cleanTitle !== undefined ? cleanTitle : null, postSlug, summary, content, featured_image, validatedCategoryId !== undefined ? validatedCategoryId : null, postStatus, publishedAt, id, req.creator.id]
    );

    return res.json({ message: 'Article updated successfully!', post: updated.rows[0] });
  } catch (err) {
    if (err.code === '23505' && (err.constraint === 'unique_creator_slug' || (err.message && err.message.includes('unique_creator_slug')))) {
      return res.status(400).json({ error: 'An article with this URL slug already exists. Please choose a different title or custom slug.' });
    }
    return res.status(500).json({ error: 'Failed to update article.' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM posts WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, req.creator.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Article not found.' });
    return res.json({ message: 'Article deleted successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete article.' });
  }
});

// 7. CATEGORIES
router.get('/categories', async (req, res) => {
  try {
    const catRes = await db.query(`SELECT * FROM categories WHERE creator_id = $1 ORDER BY name ASC`, [req.creator.id]);
    return res.json({ categories: catRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

router.post('/categories', async (req, res) => {
  const { name, description } = req.body;
  const vName = validateString(name, 'Category name', 100, true);
  if (vName.error) return res.status(400).json({ error: vName.error });
  const cleanName = vName.value;

  let cleanDescription = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string.' });
    }
    cleanDescription = description.trim();
  }

  try {
    const newCat = await db.query(
      `INSERT INTO categories (creator_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [req.creator.id, cleanName, cleanDescription]
    );
    return res.status(201).json({ message: 'Category created!', category: newCat.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create category.' });
  }
});

router.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  let cleanName = undefined;
  if (name !== undefined && name !== null) {
    const vName = validateString(name, 'Category name', 100, true);
    if (vName.error) return res.status(400).json({ error: vName.error });
    cleanName = vName.value;
  }

  let cleanDescription = undefined;
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string.' });
    }
    cleanDescription = description.trim();
  }

  try {
    const updated = await db.query(
      `UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 AND creator_id = $4 RETURNING *`,
      [cleanName !== undefined ? cleanName : null, cleanDescription !== undefined ? cleanDescription : null, id, req.creator.id]
    );
    if (updated.rowCount === 0) return res.status(404).json({ error: 'Category not found.' });
    return res.json({ message: 'Category updated!', category: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update category.' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM categories WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, req.creator.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Category not found.' });
    return res.json({ message: 'Category deleted!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// 8. TESTIMONIALS & FAQS
router.get('/testimonials', async (req, res) => {
  try {
    const resList = await db.query(`SELECT * FROM testimonials WHERE creator_id = $1 ORDER BY created_at DESC`, [req.creator.id]);
    return res.json({ testimonials: resList.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch testimonials.' });
  }
});

router.post('/testimonials', async (req, res) => {
  const { name, role, message, avatar_url, rating, is_visible } = req.body;
  const vName = validateString(name, 'Name', 255, true);
  if (vName.error) return res.status(400).json({ error: vName.error });

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required and cannot be empty.' });
  }

  if (role !== undefined && role !== null) {
    const v = validateString(role, 'Role', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }

  let cleanRating = 5;
  if (rating !== undefined && rating !== null && rating !== '') {
    const vRating = validateInt(rating, 'Rating', 1, 5);
    if (vRating.error) return res.status(400).json({ error: vRating.error });
    cleanRating = vRating.value;
  }

  if (avatar_url !== undefined && avatar_url !== null && avatar_url !== '') {
    const vUrl = validateUrl(avatar_url, 'Avatar URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    const newItem = await db.query(
      `INSERT INTO testimonials (creator_id, name, role, message, avatar_url, rating, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.creator.id, vName.value, role, message.trim(), avatar_url, cleanRating, is_visible !== false]
    );
    return res.status(201).json({ message: 'Testimonial added!', testimonial: newItem.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add testimonial.' });
  }
});

router.put('/testimonials/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, message, avatar_url, rating, is_visible } = req.body;

  let cleanName = undefined;
  if (name !== undefined && name !== null) {
    const vName = validateString(name, 'Name', 255, true);
    if (vName.error) return res.status(400).json({ error: vName.error });
    cleanName = vName.value;
  }

  let cleanMessage = undefined;
  if (message !== undefined && message !== null) {
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    cleanMessage = message.trim();
  }

  if (role !== undefined && role !== null) {
    const v = validateString(role, 'Role', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
  }

  let cleanRating = undefined;
  if (rating !== undefined && rating !== null && rating !== '') {
    const vRating = validateInt(rating, 'Rating', 1, 5);
    if (vRating.error) return res.status(400).json({ error: vRating.error });
    cleanRating = vRating.value;
  }

  if (avatar_url !== undefined && avatar_url !== null && avatar_url !== '') {
    const vUrl = validateUrl(avatar_url, 'Avatar URL', 2048, false);
    if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  }

  try {
    const updated = await db.query(
      `UPDATE testimonials
       SET name = COALESCE($1, name), role = COALESCE($2, role), message = COALESCE($3, message),
           avatar_url = COALESCE($4, avatar_url), rating = COALESCE($5, rating), is_visible = COALESCE($6, is_visible)
       WHERE id = $7 AND creator_id = $8 RETURNING *`,
      [cleanName !== undefined ? cleanName : null, role, cleanMessage !== undefined ? cleanMessage : null, avatar_url, cleanRating !== undefined ? cleanRating : null, is_visible, id, req.creator.id]
    );
    if (updated.rowCount === 0) return res.status(404).json({ error: 'Testimonial not found.' });
    return res.json({ message: 'Testimonial updated!', testimonial: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update testimonial.' });
  }
});

router.delete('/testimonials/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM testimonials WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, req.creator.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Testimonial not found.' });
    return res.json({ message: 'Testimonial deleted!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete testimonial.' });
  }
});

// FAQs
router.get('/faqs', async (req, res) => {
  try {
    const faqsRes = await db.query(`SELECT * FROM faqs WHERE creator_id = $1 ORDER BY sort_order ASC, id ASC`, [req.creator.id]);
    return res.json({ faqs: faqsRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch FAQs.' });
  }
});

router.post('/faqs', async (req, res) => {
  const { question, answer, is_visible } = req.body;
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Question is required and cannot be empty.' });
  }
  if (typeof answer !== 'string' || !answer.trim()) {
    return res.status(400).json({ error: 'Answer is required and cannot be empty.' });
  }
  try {
    const maxOrder = await db.query(`SELECT COALESCE(MAX(sort_order), 0) as m FROM faqs WHERE creator_id = $1`, [req.creator.id]);
    const nextOrder = parseInt(maxOrder.rows[0].m, 10) + 1;

    const newFaq = await db.query(
      `INSERT INTO faqs (creator_id, question, answer, sort_order, is_visible) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.creator.id, question.trim(), answer.trim(), nextOrder, is_visible !== false]
    );
    return res.status(201).json({ message: 'FAQ added!', faq: newFaq.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add FAQ.' });
  }
});

router.put('/faqs/:id', async (req, res) => {
  const { id } = req.params;
  const { question, answer, is_visible, sort_order } = req.body;

  let cleanQuestion = undefined;
  if (question !== undefined && question !== null) {
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question cannot be empty.' });
    }
    cleanQuestion = question.trim();
  }

  let cleanAnswer = undefined;
  if (answer !== undefined && answer !== null) {
    if (typeof answer !== 'string' || !answer.trim()) {
      return res.status(400).json({ error: 'Answer cannot be empty.' });
    }
    cleanAnswer = answer.trim();
  }

  let cleanSortOrder = undefined;
  if (sort_order !== undefined && sort_order !== null && sort_order !== '') {
    const v = validateInt(sort_order, 'Sort order', 0, 2147483647);
    if (v.error) return res.status(400).json({ error: v.error });
    cleanSortOrder = v.value;
  }

  try {
    const updated = await db.query(
      `UPDATE faqs
       SET question = COALESCE($1, question), answer = COALESCE($2, answer),
           is_visible = COALESCE($3, is_visible), sort_order = COALESCE($4, sort_order), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND creator_id = $6 RETURNING *`,
      [cleanQuestion !== undefined ? cleanQuestion : null, cleanAnswer !== undefined ? cleanAnswer : null, is_visible, cleanSortOrder !== undefined ? cleanSortOrder : null, id, req.creator.id]
    );
    if (updated.rowCount === 0) return res.status(404).json({ error: 'FAQ not found.' });
    return res.json({ message: 'FAQ updated!', faq: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update FAQ.' });
  }
});

router.delete('/faqs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM faqs WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, req.creator.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'FAQ not found.' });
    return res.json({ message: 'FAQ deleted!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete FAQ.' });
  }
});

// 9. MEDIA & CONTACT MESSAGES
router.get('/media', async (req, res) => {
  try {
    const mediaRes = await db.query(`SELECT * FROM media WHERE creator_id = $1 ORDER BY created_at DESC`, [req.creator.id]);
    return res.json({ media: mediaRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch media library.' });
  }
});

router.post('/media', async (req, res) => {
  const { url, title, alt_text, media_type } = req.body;
  const vUrl = validateUrl(url, 'Media URL', 2048, true);
  if (vUrl.error) return res.status(400).json({ error: vUrl.error });
  const cleanUrl = vUrl.value;

  let cleanTitle = 'Untitled Media';
  if (title !== undefined && title !== null) {
    const v = validateString(title, 'Title', 255, false);
    if (v.error) return res.status(400).json({ error: v.error });
    cleanTitle = v.value || 'Untitled Media';
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
    const v = validateString(media_type, 'Media type', 50, false);
    if (v.error) return res.status(400).json({ error: v.error });
    cleanMediaType = v.value || 'image';
  }

  try {
    const newMedia = await db.query(
      `INSERT INTO media (creator_id, url, title, alt_text, media_type) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.creator.id, cleanUrl, cleanTitle, cleanAlt, cleanMediaType]
    );
    return res.status(201).json({ message: 'Media item added!', media: newMedia.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add media item.' });
  }
});

router.delete('/media/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM media WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, req.creator.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Media item not found.' });
    return res.json({ message: 'Media item deleted!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete media item.' });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const msgRes = await db.query(`SELECT * FROM contact_messages WHERE creator_id = $1 ORDER BY created_at DESC`, [req.creator.id]);
    return res.json({ messages: msgRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

router.patch('/messages/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await db.query(`UPDATE contact_messages SET is_read = true WHERE id = $1 AND creator_id = $2 RETURNING *`, [id, req.creator.id]);
    if (updated.rowCount === 0) return res.status(404).json({ error: 'Message not found.' });
    return res.json({ message: 'Message marked as read!', contactMessage: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update message.' });
  }
});

router.delete('/messages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await db.query(`DELETE FROM contact_messages WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, req.creator.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Message not found.' });
    return res.json({ message: 'Message deleted!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete message.' });
  }
});

module.exports = router;
