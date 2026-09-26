const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Local offline fallback list of top high-risk / breached passwords
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'admin1234',
  'welcome1',
  'welcome123',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'monkey123',
  'charlie1',
  'donald123',
  'pass1234',
  'letmein123',
  'trustno1',
  'changeme',
  'contenthub123'
]);

/**
 * Validates password structure and context against NIST SP 800-63B guidelines.
 *
 * @param {string} password - Raw candidate password
 * @param {object} [userContext] - Optional contextual user metadata
 * @param {string} [userContext.username]
 * @param {string} [userContext.email]
 * @param {string} [userContext.name]
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePassword(password, userContext = {}) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password must be provided as a text string.' };
  }

  // 1. Length validation (NIST SP 800-63B: at least 8 chars, support long passphrases up to 128)
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`
    };
  }

  // 2. Trivial repetition check (e.g., 'aaaaaaaa', '11111111')
  if (/^(.)\1+$/.test(password)) {
    return {
      valid: false,
      error: 'Password cannot consist of only a single repeated character.'
    };
  }

  // 3. User contextual check: ensure password does not contain username or email
  const lowerPassword = password.toLowerCase();

  if (userContext.username && typeof userContext.username === 'string') {
    const cleanUser = userContext.username.trim().toLowerCase();
    if (cleanUser.length >= 3 && lowerPassword.includes(cleanUser)) {
      return {
        valid: false,
        error: 'Password must not contain your username.'
      };
    }
  }

  if (userContext.email && typeof userContext.email === 'string') {
    const emailPrefix = userContext.email.split('@')[0].trim().toLowerCase();
    if (emailPrefix.length >= 3 && lowerPassword.includes(emailPrefix)) {
      return {
        valid: false,
        error: 'Password must not contain the username portion of your email.'
      };
    }
  }

  // 4. Character diversity (Letters + at least one number or special character, or long passphrase >= 14 chars)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigitOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (password.length < 14 && (!hasLetter || !hasDigitOrSymbol)) {
    return {
      valid: false,
      error: 'Password must contain a mix of letters and numbers or symbols (or be 14+ characters long).'
    };
  }

  return { valid: true };
}

/**
 * Privacy-preserving breached password check using k-Anonymity (Have I Been Pwned API model).
 * Only the first 5 characters of the SHA-1 hash are transmitted. The full password NEVER leaves the system.
 * Includes local fallback list and timeout handling.
 *
 * @param {string} password - Raw candidate password
 * @returns {Promise<{ breached: boolean, count: number }>}
 */
async function checkBreachedPassword(password) {
  if (!password || typeof password !== 'string') {
    return { breached: false, count: 0 };
  }

  const lower = password.toLowerCase().trim();

  // Fast check: Local high-risk / breached passwords list
  if (COMMON_PASSWORDS.has(lower)) {
    return { breached: true, count: 100000 };
  }

  // Compute SHA-1 hash for k-Anonymity query
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const url = `https://api.pwnedpasswords.com/range/${prefix}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'ContentHub-CMS-PasswordCheck',
        'Add-Padding': 'true' // Prevents response size side-channel leakage
      },
      signal: AbortSignal.timeout(2500) // Fail fast after 2.5s if offline/slow
    });

    if (!response.ok) {
      return { breached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\r\n');

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix && hashSuffix.trim().toUpperCase() === suffix) {
        const count = parseInt(countStr, 10) || 1;
        return { breached: true, count };
      }
    }

    return { breached: false, count: 0 };
  } catch (err) {
    // If external service is unavailable or network is disconnected, fallback safely without blocking legitimate users
    return { breached: false, count: 0 };
  }
}

/**
 * Hashes a plaintext password using bcrypt with standard work factor.
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Constant-time password comparison.
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  BCRYPT_ROUNDS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  COMMON_PASSWORDS,
  validatePassword,
  checkBreachedPassword,
  hashPassword,
  comparePassword
};
