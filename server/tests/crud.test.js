const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const BASE_URL = 'http://localhost:5090';
const JWT_SECRET = process.env.JWT_SECRET;
const adminToken = jwt.sign({ userId: 1, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
const creatorToken = jwt.sign({ userId: 2, role: 'CREATOR' }, JWT_SECRET, { expiresIn: '1h' });

describe('Core CRUD & Data Lifecycle Tests', () => {
  it('should successfully execute the full CRUD lifecycle on Creator Posts', async () => {
    // 1. Create
    const createRes = await fetch(`${BASE_URL}/api/creator/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Automated Test Post',
        slug: 'auto-test-post-' + Date.now(),
        summary: 'Test summary description',
        content: 'Comprehensive content for automated testing.',
        status: 'DRAFT',
        featured_image: 'https://images.unsplash.com/photo-1234'
      })
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    assert.ok(createData.post?.id);
    const postId = createData.post.id;

    // 2. Read
    const getRes = await fetch(`${BASE_URL}/api/creator/posts`, {
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    const getData = await getRes.json();
    assert.strictEqual(getRes.status, 200);
    const found = getData.posts.some(p => p.id === postId);
    assert.strictEqual(found, true, 'Created post should appear in creator post list');

    // 3. Update
    const updateRes = await fetch(`${BASE_URL}/api/creator/posts/${postId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Post Title' })
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateData.post.title, 'Updated Post Title');

    // 4. Delete
    const deleteRes = await fetch(`${BASE_URL}/api/creator/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    assert.strictEqual(deleteRes.status, 200);
  });

  it('should successfully execute CRUD on Creator Categories', async () => {
    // 1. Create
    const createRes = await fetch(`${BASE_URL}/api/creator/categories`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Automated Category ' + Date.now(), description: 'Temp' })
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    const catId = createData.category.id;

    // 2. Read
    const getRes = await fetch(`${BASE_URL}/api/creator/categories`, {
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    assert.strictEqual(getRes.status, 200);

    // 3. Delete
    const deleteRes = await fetch(`${BASE_URL}/api/creator/categories/${catId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    assert.strictEqual(deleteRes.status, 200);
  });

  it('should successfully execute CRUD on Homepage Sections', async () => {
    // 1. Create
    const createRes = await fetch(`${BASE_URL}/api/creator/sections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section_type: 'custom',
        title: 'Automated Section',
        button_text: 'Click',
        button_url: '#contact'
      })
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    const secId = createData.section.id;

    // 2. Delete
    const deleteRes = await fetch(`${BASE_URL}/api/creator/sections/${secId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    assert.strictEqual(deleteRes.status, 200);
  });

  it('should allow Admin to fetch overview statistics and creator list', async () => {
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    assert.strictEqual(statsRes.status, 200);
    assert.ok(statsData.overview?.totalCreators >= 1);

    const creatorsRes = await fetch(`${BASE_URL}/api/admin/creators`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const creatorsData = await creatorsRes.json();
    assert.strictEqual(creatorsRes.status, 200);
    assert.ok(Array.isArray(creatorsData.creators));
  });

  it('should preserve exact database baseline integrity (5 users, 13 posts, 5 categories)', async () => {
    const [uRes, pRes, cRes] = await Promise.all([
      db.query('SELECT count(*) FROM users'),
      db.query('SELECT count(*) FROM posts'),
      db.query('SELECT count(*) FROM categories')
    ]);
    assert.strictEqual(parseInt(uRes.rows[0].count, 10), 5, 'Users count must remain 5');
    assert.strictEqual(parseInt(pRes.rows[0].count, 10), 13, 'Posts count must remain 13');
    assert.strictEqual(parseInt(cRes.rows[0].count, 10), 5, 'Categories count must remain 5');
  });

  after(async () => {
    await db.pool.end();
  });
});

