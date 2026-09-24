const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5090';
const JWT_SECRET = process.env.JWT_SECRET;

const adminToken = jwt.sign({ userId: 1, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
const creatorAToken = jwt.sign({ userId: 2, role: 'CREATOR' }, JWT_SECRET, { expiresIn: '1h' });
const creatorBToken = jwt.sign({ userId: 3, role: 'CREATOR' }, JWT_SECRET, { expiresIn: '1h' });

describe('Role-Based Access Control (RBAC) & IDOR / BOLA Tests', () => {
  it('should block unauthenticated access to admin endpoints with HTTP 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(res.status, 401);
  });

  it('should block Creator role from accessing Admin stats with HTTP 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${creatorAToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  it('should block Creator role from accessing Admin creator list with HTTP 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/creators`, {
      headers: { Authorization: `Bearer ${creatorAToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  it('should block Admin role from accessing Creator personal profile with HTTP 403 (Strict Separation)', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  it('should block BOLA / IDOR: Creator A attempting to modify Creator B post (ID 10) returns HTTP 404', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/posts/10`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${creatorAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Malicious Overwrite Attempt' })
    });
    assert.strictEqual(res.status, 404);
  });

  it('should block BOLA / IDOR: Creator A attempting to delete Creator B post (ID 10) returns HTTP 404', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/posts/10`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creatorAToken}` }
    });
    assert.strictEqual(res.status, 404);
  });

  it('should block BOLA / IDOR: Creator A attempting to delete Creator B section (ID 7) returns HTTP 404', async () => {
    const res = await fetch(`${BASE_URL}/api/creator/sections/7`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creatorAToken}` }
    });
    assert.strictEqual(res.status, 404);
  });

  it('should block Admin self-suspension safeguard with HTTP 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/creators/1/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'SUSPENDED' })
    });
    assert.strictEqual(res.status, 403);
  });

  it('should block Admin self-deletion safeguard with HTTP 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/creators/1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 403);
  });
});
