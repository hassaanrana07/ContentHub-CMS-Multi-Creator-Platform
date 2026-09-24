const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

const BASE_URL = 'http://localhost:5090';

describe('Authentication & Session Management Tests', () => {
  it('should authenticate Admin user with valid credentials (HTTP 200)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@contenthub.com', password: 'Admin123!' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.token, 'Token must be present in login response');
    assert.strictEqual(data.user.role, 'ADMIN');
  });

  it('should authenticate Creator user with valid credentials (HTTP 200)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'hassan@example.com', password: 'Creator123!' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.token, 'Token must be present in login response');
    assert.strictEqual(data.user.role, 'CREATOR');
  });

  it('should reject invalid password with generic HTTP 401 error', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@contenthub.com', password: 'WrongPassword123!' })
    });
    assert.strictEqual(res.status, 401);
  });

  it('should reject non-existent user with uniform HTTP 401 error (No User Enumeration)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'nonexistent_user_99@example.com', password: 'AnyPassword123!' })
    });
    assert.strictEqual(res.status, 401);
  });

  it('should reject empty login credentials with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '', password: '' })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should verify session identity via /api/auth/me for authenticated user', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'hassan@example.com', password: 'Creator123!' })
    });
    const loginData = await loginRes.json();

    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    const meData = await meRes.json();
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.user.email, 'hassan@example.com');
    assert.strictEqual(meData.user.role, 'CREATOR');
  });

  it('should reject registration with weak password (< 8 chars) with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Pass User',
        username: 'weakpassuser',
        email: 'weakpass@example.com',
        password: 'short',
        password_confirmation: 'short'
      })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject registration with duplicate email address with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Admin User',
        username: 'new_unique_user_1',
        email: 'admin@contenthub.com',
        password: 'ValidPassword123!',
        password_confirmation: 'ValidPassword123!'
      })
    });
    assert.strictEqual(res.status, 400);
  });

  it('should revoke token upon logout and reject subsequent requests with HTTP 401', async () => {
    // 1. Login to get fresh token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'hassan@example.com', password: 'Creator123!' })
    });
    const { token } = await loginRes.json();

    // 2. Logout
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(logoutRes.status, 200);

    // 3. Attempt to reuse revoked token
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(meRes.status, 401);
  });
});
