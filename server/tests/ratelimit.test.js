const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5090';

/**
 * Helper to reset rate limits between test blocks
 */
async function resetLimits() {
  await fetch(`${BASE_URL}/api/test/reset-rate-limits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('Rate Limiting & Anti-Brute-Force Security Tests', () => {
  beforeEach(async () => {
    await resetLimits();
  });

  it('should include RateLimit standard headers on protected API requests', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@contenthub.com', password: 'Admin123!' })
    });
    assert.strictEqual(res.status, 200);

    // express-rate-limit standardHeaders emits ratelimit-limit, ratelimit-remaining, ratelimit-reset
    const limitHeader = res.headers.get('ratelimit-limit') || res.headers.get('RateLimit-Limit');
    const remainingHeader = res.headers.get('ratelimit-remaining') || res.headers.get('RateLimit-Remaining');
    assert.ok(limitHeader, 'RateLimit-Limit header must be present');
    assert.ok(remainingHeader !== null, 'RateLimit-Remaining header must be present');
  });

  it('should NOT decrement failed login quota on successful authentication (skipSuccessfulRequests: true)', async () => {
    // Perform 3 successful logins
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin@contenthub.com', password: 'Admin123!' })
      });
      assert.strictEqual(res.status, 200, `Login attempt ${i + 1} should succeed`);
    }

    // Now send 10 failed logins for a specific test account
    for (let i = 0; i < 10; i++) {
      const failRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'quota_test_user@example.com', password: 'WrongPassword!' })
      });
      assert.strictEqual(failRes.status, 401, `Failed attempt ${i + 1} should return 401`);
    }

    // Attempt 11 must now trigger HTTP 429 Too Many Requests
    const blockedRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'quota_test_user@example.com', password: 'WrongPassword!' })
    });
    assert.strictEqual(blockedRes.status, 429, 'Excessive failed logins must return HTTP 429');
    assert.ok(blockedRes.headers.get('retry-after'), 'HTTP 429 response must include Retry-After header');
  });

  it('should enforce account brute-force protection and return HTTP 429 with Retry-After header', async () => {
    const targetAccount = 'victim_brute_target@example.com';

    // Exhaust 10 allowed failed login attempts for this composite key
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: targetAccount, password: 'GuessPassword123!' })
      });
      assert.strictEqual(res.status, 401);
    }

    // 11th request must receive HTTP 429
    const blockedRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: targetAccount, password: 'GuessPassword123!' })
    });

    assert.strictEqual(blockedRes.status, 429);
    const retryAfter = blockedRes.headers.get('retry-after');
    assert.ok(retryAfter, 'Response must include standard Retry-After header');
    assert.ok(parseInt(retryAfter, 10) > 0, 'Retry-After duration must be positive');

    const body = await blockedRes.json();
    assert.strictEqual(body.error, 'Too many failed login attempts. Please try again after 15 minutes.');
  });

  it('should NOT leak account existence in rate-limit 429 response (Anti-Enumeration)', async () => {
    const nonExistent = 'definitely_nonexistent_person_404@example.com';

    for (let i = 0; i < 10; i++) {
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: nonExistent, password: 'WrongPassword!' })
      });
    }

    const blockedRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: nonExistent, password: 'WrongPassword!' })
    });

    assert.strictEqual(blockedRes.status, 429);
    const body = await blockedRes.json();
    // Message must be uniform and NOT mention whether the user existed or not
    assert.strictEqual(body.error, 'Too many failed login attempts. Please try again after 15 minutes.');
  });

  it('should isolate composite keys so an attacker targeting Account A does NOT lock out Account B', async () => {
    const accountA = 'target_alpha@example.com';
    const accountB = 'target_beta@example.com';

    // Lock out Account A
    for (let i = 0; i < 10; i++) {
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: accountA, password: 'WrongPassword!' })
      });
    }

    // Account A is now rate-limited
    const resA = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: accountA, password: 'WrongPassword!' })
    });
    assert.strictEqual(resA.status, 429, 'Account A must be rate-limited');

    // Account B must NOT be locked out (returns 401 Invalid Credentials, not 429)
    const resB = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: accountB, password: 'WrongPassword!' })
    });
    assert.strictEqual(resB.status, 401, 'Account B must still be accessible and not locked out');
  });

  it('should rate-limit account registration to 10 attempts per 15 minutes', async () => {
    // Send 10 registration attempts with invalid payload
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `testbot_${i}@example.com` })
      });
      // Will return 400 because required fields are missing
      assert.strictEqual(res.status, 400);
    }

    // 11th registration attempt should return HTTP 429
    const blockedRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testbot_11@example.com' })
    });
    assert.strictEqual(blockedRes.status, 429, 'Registration must be rate-limited to 10 per 15 minutes');
    const body = await blockedRes.json();
    assert.strictEqual(body.error, 'Too many account registration attempts. Please try again later.');
  });

  it('should rate-limit password reset requests to 5 attempts per 15 minutes', async () => {
    const testEmail = 'reset_flood_target@example.com';

    // 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      assert.strictEqual(res.status, 200);
    }

    // 6th request must be blocked
    const blockedRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    assert.strictEqual(blockedRes.status, 429);
    const body = await blockedRes.json();
    assert.strictEqual(body.error, 'Too many password reset requests. Please try again after 15 minutes.');
  });

  it('should rate-limit email verification to 5 requests per 15 minutes', async () => {
    // 5 attempts
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: `dummy_token_${i}` })
      });
      assert.strictEqual(res.status, 200);
    }

    // 6th attempt must be blocked
    const blockedRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'dummy_token_6' })
    });
    assert.strictEqual(blockedRes.status, 429);
    const body = await blockedRes.json();
    assert.strictEqual(body.error, 'Too many verification attempts. Please try again later.');
  });

  it('should rate-limit authenticated password change endpoint to 5 attempts per 15 minutes', async () => {
    // 1. Authenticate as Creator
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'hassan@example.com', password: 'Creator123!' })
    });
    const { token } = await loginRes.json();

    // 2. Perform 5 invalid password changes (wrong current password)
    for (let i = 0; i < 5; i++) {
      const changeRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: 'IncorrectOldPassword123!',
          newPassword: 'NewValidPassword123!',
          confirmPassword: 'NewValidPassword123!'
        })
      });
      assert.strictEqual(changeRes.status, 401, 'Invalid current password returns 401');
    }

    // 3. 6th attempt must return HTTP 429
    const blockedRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'IncorrectOldPassword123!',
        newPassword: 'NewValidPassword123!',
        confirmPassword: 'NewValidPassword123!'
      })
    });
    assert.strictEqual(blockedRes.status, 429, 'Password change must be rate-limited after 5 attempts');
    const body = await blockedRes.json();
    assert.strictEqual(body.error, 'Too many password change attempts. Please try again after 15 minutes.');
  });

  it('should reset limits and restore legitimate access upon store reset', async () => {
    const testAccount = 'restore_access_target@example.com';

    // Exhaust limits
    for (let i = 0; i < 10; i++) {
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: testAccount, password: 'WrongPassword!' })
      });
    }

    // Verify blocked
    const blocked = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testAccount, password: 'WrongPassword!' })
    });
    assert.strictEqual(blocked.status, 429);

    // Reset rate limits
    await resetLimits();

    // Verify access restored (returns 401 instead of 429)
    const restored = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testAccount, password: 'WrongPassword!' })
    });
    assert.strictEqual(restored.status, 401, 'Access must be restored after rate limit reset');
  });
});
