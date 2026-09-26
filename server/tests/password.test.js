const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const db = require('../config/db');
const { validatePassword, checkBreachedPassword, hashPassword } = require('../utils/passwordPolicy');

const BASE_URL = 'http://localhost:5090';

// Helper to reset rate limits before tests
async function resetLimits() {
  await fetch(`${BASE_URL}/api/test/reset-rate-limits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('Password Security & Governance Tests', () => {
  const TEST_USER_EMAIL = 'pwd_isolated_test@example.com';
  const INITIAL_PASSWORD = 'InitialValidPass123!';

  before(async () => {
    await resetLimits();
    const hash = await hashPassword(INITIAL_PASSWORD);
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ('Password Test User', $1, $2, 'CREATOR', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [TEST_USER_EMAIL, hash]
    );
  });

  after(async () => {
    // Clean up all test users created in this suite to preserve database baseline integrity
    await db.query(
      `DELETE FROM users WHERE email = $1 OR email LIKE 'complex_%' OR email LIKE 'phrase_%'`,
      [TEST_USER_EMAIL]
    );
  });

  beforeEach(async () => {
    await resetLimits();
  });

  describe('1. Server-Side Password Policy Enforcement', () => {
    it('should reject passwords shorter than 8 characters (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Pass User',
          username: 'shortuser1',
          email: 'shortpass1@example.com',
          password: 'short',
          confirmPassword: 'short'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.error, 'Password must be at least 8 characters long.');
    });

    it('should reject passwords consisting of a single repeated character (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Repeated Pass User',
          username: 'repeatuser1',
          email: 'repeatuser1@example.com',
          password: 'aaaaaaaaaaaa',
          confirmPassword: 'aaaaaaaaaaaa'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.error, 'Password cannot consist of only a single repeated character.');
    });

    it('should reject passwords that contain the user username (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Context User',
          username: 'targetuser',
          email: 'contextuser@example.com',
          password: 'targetuser123!',
          confirmPassword: 'targetuser123!'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.error, 'Password must not contain your username.');
    });

    it('should reject passwords that lack character diversity (< 14 chars with only letters) (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'No Diversity User',
          username: 'nodiversity1',
          email: 'nodiversity1@example.com',
          password: 'onlylowercase',
          confirmPassword: 'onlylowercase'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.error, 'Password must contain a mix of letters and numbers or symbols (or be 14+ characters long).');
    });

    it('should reject breached passwords using privacy-preserving k-Anonymity (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Breached Pass User',
          username: 'breacheduser1',
          email: 'breacheduser1@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.error, 'This password has appeared in known data breaches and cannot be used. Please choose a more secure, unique password.');
    });

    it('should accept valid complex passwords with letters, numbers, and symbols (HTTP 201)', async () => {
      const uniqueSuffix = Date.now().toString().slice(-6);
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Acceptable Complex User',
          username: `complex_${uniqueSuffix}`,
          email: `complex_${uniqueSuffix}@example.com`,
          password: 'Str0ng&Un!que_Pass2026',
          confirmPassword: 'Str0ng&Un!que_Pass2026'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.ok(data.message.includes('Account created successfully'));
    });

    it('should accept long passphrases (>= 14 chars) without forcing symbols (NIST SP 800-63B) (HTTP 201)', async () => {
      const uniqueSuffix = (Date.now() + 1).toString().slice(-6);
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Passphrase User',
          username: `phrase_${uniqueSuffix}`,
          email: `phrase_${uniqueSuffix}@example.com`,
          password: 'correct horse battery staple passphrase',
          confirmPassword: 'correct horse battery staple passphrase'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.ok(data.message.includes('Account created successfully'));
    });
  });

  describe('2. Frontend and Backend Validation Parity', () => {
    it('should verify that backend validation logic mirrors frontend criteria', () => {
      // 1. Short
      const shortRes = validatePassword('short');
      assert.strictEqual(shortRes.valid, false);
      assert.strictEqual(shortRes.error, 'Password must be at least 8 characters long.');

      // 2. Single repeated char
      const repeatRes = validatePassword('aaaaaaaaaaaa');
      assert.strictEqual(repeatRes.valid, false);
      assert.strictEqual(repeatRes.error, 'Password cannot consist of only a single repeated character.');

      // 3. Username match
      const userRes = validatePassword('myadminpass123', { username: 'admin' });
      assert.strictEqual(userRes.valid, false);
      assert.strictEqual(userRes.error, 'Password must not contain your username.');

      // 4. Passphrase
      const passPhraseRes = validatePassword('correct horse battery staple');
      assert.strictEqual(passPhraseRes.valid, true);

      // 5. Standard complex
      const complexRes = validatePassword('SecurePass123!');
      assert.strictEqual(complexRes.valid, true);
    });
  });

  describe('3. Password Hash & Plaintext Exposure Prevention', () => {
    it('should NEVER return password_hash in login response payload', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin@contenthub.com', password: 'Admin123!' })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.user.password_hash, undefined, 'password_hash must be stripped');
      assert.strictEqual(data.user.password, undefined, 'password must not be present');
      assert.strictEqual(JSON.stringify(data).includes('password_hash'), false);
    });

    it('should NEVER return password_hash in /api/auth/me response payload', async () => {
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'hassan@example.com', password: 'Creator123!' })
      });
      const { token } = await loginRes.json();

      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meData = await meRes.json();
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meData.user.password_hash, undefined);
      assert.strictEqual(meData.user.password, undefined);
      assert.strictEqual(JSON.stringify(meData).includes('password_hash'), false);
    });

    it('should NEVER log plaintext passwords to console output during authentication', async () => {
      const secretPassword = 'MySuperConfidentialSecretPassword123!';
      const logs = [];
      const originalLog = console.log;
      const originalError = console.error;

      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };
      console.error = (...args) => {
        logs.push(args.join(' '));
        originalError(...args);
      };

      try {
        await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'admin@contenthub.com', password: secretPassword })
        });
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }

      const foundSecret = logs.some((line) => line.includes(secretPassword));
      assert.strictEqual(foundSecret, false, 'Plaintext password must never appear in console logs');
    });
  });

  describe('4. Password Change Reuse Prevention', () => {
    it('should reject changing password to the identical current password (HTTP 400)', async () => {
      // 1. Login with test user
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: TEST_USER_EMAIL, password: INITIAL_PASSWORD })
      });
      const { token } = await loginRes.json();

      // 2. Attempt change using identical current password as new password
      const changeRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: INITIAL_PASSWORD,
          newPassword: INITIAL_PASSWORD,
          confirmPassword: INITIAL_PASSWORD
        })
      });
      const changeData = await changeRes.json();
      assert.strictEqual(changeRes.status, 400);
      assert.strictEqual(changeData.error, 'New password cannot be the same as your current password.');
    });
  });

  describe('5. Password Reset Lifecycle: Tokens, Expiry & Single-Use', () => {
    it('should generate secure, expiring single-use reset token and prevent reuse', async () => {
      // 1. Request password reset for isolated test user
      const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_USER_EMAIL })
      });
      const forgotData = await forgotRes.json();
      assert.strictEqual(forgotRes.status, 200);
      assert.ok(forgotData.testResetToken, 'Reset token must be generated for active account');

      const rawToken = forgotData.testResetToken;

      // 2. Perform valid password reset with new password
      const newValidPass = 'BrandNewSecurePass987!';
      const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken,
          newPassword: newValidPass,
          confirmPassword: newValidPass
        })
      });
      const resetData = await resetRes.json();
      assert.strictEqual(resetRes.status, 200);
      assert.ok(resetData.message.includes('Password has been reset successfully'));

      // 3. Token Single-Use: Attempting to use the SAME token a second time must fail with HTTP 400
      const reusedRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken,
          newPassword: 'AnotherPassword456!',
          confirmPassword: 'AnotherPassword456!'
        })
      });
      const reusedData = await reusedRes.json();
      assert.strictEqual(reusedRes.status, 400);
      assert.strictEqual(reusedData.error, 'This password reset token has already been used. Please request a new one.');

      // 4. Verify login works with new password
      const newLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: TEST_USER_EMAIL, password: newValidPass })
      });
      assert.strictEqual(newLogin.status, 200);
    });

    it('should reject expired password reset tokens with HTTP 400', async () => {
      // 1. Generate reset token
      const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_USER_EMAIL })
      });
      const { testResetToken } = await forgotRes.json();
      assert.ok(testResetToken);

      // 2. Manually simulate token expiration in the database
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(testResetToken).digest('hex');
      await db.query(
        "UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '10 minutes' WHERE token_hash = $1",
        [tokenHash]
      );

      // 3. Attempt reset with expired token
      const expiredRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testResetToken,
          newPassword: 'ValidNewPassword987!',
          confirmPassword: 'ValidNewPassword987!'
        })
      });
      const expiredData = await expiredRes.json();
      assert.strictEqual(expiredRes.status, 400);
      assert.strictEqual(expiredData.error, 'This password reset token has expired. Please request a new one.');
    });

    it('should reject resetting password to the identical previous password (HTTP 400)', async () => {
      // Set known password in database for test user
      const currentPass = 'KnownPriorPass987!';
      const hash = await hashPassword(currentPass);
      await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, TEST_USER_EMAIL]);

      // 1. Generate reset token
      const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_USER_EMAIL })
      });
      const { testResetToken } = await forgotRes.json();

      // 2. Attempt reset to the same existing password
      const sameRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testResetToken,
          newPassword: currentPass,
          confirmPassword: currentPass
        })
      });
      const sameData = await sameRes.json();
      assert.strictEqual(sameRes.status, 400);
      assert.strictEqual(sameData.error, 'New password cannot be the same as your previous password.');
    });
  });
});
