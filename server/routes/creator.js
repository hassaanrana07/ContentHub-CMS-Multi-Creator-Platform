const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sanitizeObject } = require('../utils/sanitize');

router.use(authenticateToken);
router.use(requireRole('CREATOR'));

// Apply input sanitization middleware to all incoming creator write requests
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    req.body = sanitizeObject(req.body);
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

// 1. CREATOR OVERVIEW & STATS
router.get('/dashboard/stats', async (req, res) => {
  const creatorId = req.creator.id;
  try {
    const publishedRes = await db.query(`SELECT COUNT(*) FROM posts WHERE creator_id = $1 AND status = 'PUBLISHED'`, [creatorId]);
    const draftRes = await db.query(`SELECT COUNT(*) FROM posts WHERE creator_id = $1 AND status = 'DRAFT'`, [creatorId]);
    const sectionsRes = await db.query(`SELECT COUNT(*) FROM homepage_sections WHERE creator_id = $1`, [creatorId]);
    const capabilitiesRes = await db.query(`SELECT COUNT(*) FROM capabilities WHERE creator_id = $1`, [creatorId]);
    const testimonialsRes = await db.query(`SELECT COUNT(*) FROM testimonials WHERE creator_id = $1`, [creatorId]);
    const faqsRes = await db.query(`SELECT COUNT(*) FROM faqs WHERE creator_id = $1`, [creatorId]);
    const unreadMessagesRes = await db.query(`SELECT COUNT(*) FROM contact_messages WHERE creator_id = $1 AND is_read = false`, [creatorId]);
    const mediaRes = await db.query(`SELECT COUNT(*) FROM media WHERE creator_id = $1`, [creatorId]);

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
      [display_name, bio, profile_image, creatorId]
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
  if (!section_type) return res.status(400).json({ error: 'Section type is required.' });

  try {
    const maxOrderRes = await db.query(`SELECT COALESCE(MAX(sort_order), 0) as max_order FROM homepage_sections WHERE creator_id = $1`, [req.creator.id]);
    const nextOrder = parseInt(maxOrderRes.rows[0].max_order, 10) + 1;

    const newSection = await db.query(
      `INSERT INTO homepage_sections (creator_id, section_type, title, subtitle, body, image_url, button_text, button_url, sort_order, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.creator.id, section_type, title, subtitle, body, image_url, button_text, button_url, nextOrder, is_visible !== false]
    );

    return res.status(201).json({ message: 'Homepage section created successfully!', section: newSection.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create homepage section.' });
  }
});

router.put('/sections/:id', async (req, res) => {
  const { id } = req.params;
  const { section_type, title, subtitle, body, image_url, button_text, button_url, is_visible, sort_order } = req.body;

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
      [section_type, title, subtitle, body, image_url, button_text, button_url, is_visible, sort_order, id, req.creator.id]
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
  if (!Array.isArray(sectionIds)) return res.status(400).json({ error: 'Invalid payload.' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    for (let index = 0; index < sectionIds.length; index++) {
      await client.query(`UPDATE homepage_sections SET sort_order = $1 WHERE id = $2 AND creator_id = $3`, [index + 1, sectionIds[index], req.creator.id]);
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
  if (!title) return res.status(400).json({ error: 'Capability title is required.' });

  try {
    const maxRes = await db.query(`SELECT COALESCE(MAX(sort_order), 0) as m FROM capabilities WHERE creator_id = $1`, [req.creator.id]);
    const nextOrder = parseInt(maxRes.rows[0].m, 10) + 1;

    const newCap = await db.query(
      `INSERT INTO capabilities (creator_id, title, description, icon, image_url, sort_order, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.creator.id, title.trim(), description, icon || 'Sparkles', image_url, nextOrder, is_visible !== false]
    );

    return res.status(201).json({ message: 'Capability added successfully!', capability: newCap.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add capability.' });
  }
});

router.put('/capabilities/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, icon, image_url, is_visible, sort_order } = req.body;

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
      [title, description, icon, image_url, is_visible, sort_order, id, req.creator.id]
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
  if (!title) return res.status(400).json({ error: 'Article title is required.' });

  const postSlug = slugify(slug || title);
  const postStatus = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  const publishedAt = postStatus === 'PUBLISHED' ? new Date() : null;

  try {
    const slugCheck = await db.query(`SELECT id FROM posts WHERE creator_id = $1 AND slug = $2`, [req.creator.id, postSlug]);
    if (slugCheck.rowCount > 0) {
      return res.status(400).json({ error: 'An article with this URL slug already exists. Please choose a different title or custom slug.' });
    }

    const newPost = await db.query(
      `INSERT INTO posts (creator_id, category_id, title, slug, summary, content, featured_image, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.creator.id, category_id || null, title.trim(), postSlug, summary, content, featured_image, postStatus, publishedAt]
    );

    return res.status(201).json({ message: 'Article created successfully!', post: newPost.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create article.' });
  }
});

router.put('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, slug, summary, content, featured_image, category_id, status } = req.body;

  try {
    const currentPostRes = await db.query(`SELECT status FROM posts WHERE id = $1 AND creator_id = $2`, [id, req.creator.id]);
    if (currentPostRes.rowCount === 0) return res.status(404).json({ error: 'Article not found or unauthorized.' });

    const currentPost = currentPostRes.rows[0];
    const postSlug = slug ? slugify(slug) : undefined;
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
      [title, postSlug, summary, content, featured_image, category_id, postStatus, publishedAt, id, req.creator.id]
    );

    return res.json({ message: 'Article updated successfully!', post: updated.rows[0] });
  } catch (err) {
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
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  try {
    const newCat = await db.query(`INSERT INTO categories (creator_id, name, description) VALUES ($1, $2, $3) RETURNING *`, [req.creator.id, name.trim(), description]);
    return res.status(201).json({ message: 'Category created!', category: newCat.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create category.' });
  }
});

router.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const updated = await db.query(`UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 AND creator_id = $4 RETURNING *`, [name, description, id, req.creator.id]);
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
  if (!name || !message) return res.status(400).json({ error: 'Name and message are required.' });
  try {
    const newItem = await db.query(
      `INSERT INTO testimonials (creator_id, name, role, message, avatar_url, rating, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.creator.id, name.trim(), role, message, avatar_url, rating || 5, is_visible !== false]
    );
    return res.status(201).json({ message: 'Testimonial added!', testimonial: newItem.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add testimonial.' });
  }
});

router.put('/testimonials/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, message, avatar_url, rating, is_visible } = req.body;
  try {
    const updated = await db.query(
      `UPDATE testimonials
       SET name = COALESCE($1, name), role = COALESCE($2, role), message = COALESCE($3, message),
           avatar_url = COALESCE($4, avatar_url), rating = COALESCE($5, rating), is_visible = COALESCE($6, is_visible)
       WHERE id = $7 AND creator_id = $8 RETURNING *`,
      [name, role, message, avatar_url, rating, is_visible, id, req.creator.id]
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
  if (!question || !answer) return res.status(400).json({ error: 'Question and answer are required.' });
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
  try {
    const updated = await db.query(
      `UPDATE faqs
       SET question = COALESCE($1, question), answer = COALESCE($2, answer),
           is_visible = COALESCE($3, is_visible), sort_order = COALESCE($4, sort_order), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND creator_id = $6 RETURNING *`,
      [question, answer, is_visible, sort_order, id, req.creator.id]
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
  if (!url) return res.status(400).json({ error: 'Media URL is required.' });
  try {
    const newMedia = await db.query(
      `INSERT INTO media (creator_id, url, title, alt_text, media_type) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.creator.id, url.trim(), title || 'Untitled Media', alt_text || title || '', media_type || 'image']
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
