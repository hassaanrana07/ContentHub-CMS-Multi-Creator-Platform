const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5090';
const JWT_SECRET = process.env.JWT_SECRET;
const creatorToken = jwt.sign({ userId: 2, role: 'CREATOR' }, JWT_SECRET, { expiresIn: '1h' });

describe('Input Validation & Robustness Tests', () => {
  it('should reject route :id = 0 with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/posts/0`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject route :id = -1 with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/posts/-1`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject decimal route :id (1.5) with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/posts/1.5`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject alphabetic route :id ("abc") with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/posts/abc`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject 32-bit integer overflow route :id (2147483648) with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/posts/2147483648`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject type confusion (object in identifier) without server crash (HTTP 400)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: { $gt: '' }, password: 'password123' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject type confusion (array in password) without server crash (HTTP 400)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@contenthub.com', password: ['secret'] })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject category_id type confusion (string or array) with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Post with Bad Category', content: 'Content', category_id: 'invalid-string' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject string exceeding VARCHAR limit (> 255 chars) in contact name with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/public/site/hassan/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A'.repeat(300),
        email: 'visitor@example.com',
        subject: 'Inquiry',
        message: 'Hello'
      })
    });
    assert.strictEqual(res.status, 400);
  });
});
