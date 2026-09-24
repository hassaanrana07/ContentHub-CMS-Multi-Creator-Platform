const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5090';
const JWT_SECRET = process.env.JWT_SECRET;
const creatorToken = jwt.sign({ userId: 2, role: 'CREATOR' }, JWT_SECRET, { expiresIn: '1h' });

describe('Application Security, XSS & Protection Tests', () => {
  it('should reject dangerous javascript: URL schemes with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/sections/4`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ button_url: 'javascript:alert(1)' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject obfuscated javascript URL schemes (HTML entities) with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/sections/4`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ button_url: 'jav&#x61;script:alert(1)' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject data: HTML URI schemes with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/sections/4`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ button_url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject protocol-relative URLs (//evil.com) with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/sections/4`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ button_url: '//evil.com/phish' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should accept legitimate safe URLs (https:, http:, mailto:, relative, anchors)', async () => {
    const safePayloads = [
      'https://example.com/demo',
      'http://example.com',
      'mailto:contact@example.com',
      '/articles',
      '#capabilities'
    ];
    for (const url of safePayloads) {
      const res = await fetch(`${BASE_URL}/api/creator/sections/4`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ button_url: url })
      });
      assert.strictEqual(res.status, 200, `Expected 200 for URL: ${url}`);
    }

    // Reset section 4 button_url back to #capabilities
    await fetch(`${BASE_URL}/api/creator/sections/4`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ button_url: '#capabilities' })
    });
  });

  it('should preserve technical code snippets with <script> and <div> tags in post content without destructive truncation', async () => {
    const payload = {
      title: 'Guide to <script> Tags',
      slug: 'guide-to-script-tags-test-' + Date.now(),
      summary: 'HTML tutorial covering <script src="...">',
      content: 'Code example:\n<pre>console.log("hello");</pre>\nNever render untrusted input in <script>.',
      status: 'DRAFT',
      featured_image: 'https://images.unsplash.com/photo-1234'
    };

    const createRes = await fetch(`${BASE_URL}/api/creator/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createData.post.title, payload.title);
    assert.strictEqual(createData.post.content, payload.content);

    // Clean up created post
    await fetch(`${BASE_URL}/api/creator/posts/${createData.post.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
  });

  it('should include Helmet security headers on responses (nosniff, frame-options)', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  });

  it('should include RateLimit headers on authentication endpoints', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'test@example.com', password: 'wrong' })
    });
    assert.ok(
      res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit'),
      'Rate limit header should be present'
    );
  });
});
