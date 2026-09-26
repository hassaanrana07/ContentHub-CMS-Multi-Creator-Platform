/**
 * Client-Side Password Validation & Strength Assessment Utility
 * Matches backend NIST SP 800-63B requirements.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Validates password structure and returns errors if any.
 *
 * @param {string} password
 * @param {string} [confirmPassword]
 * @param {object} [userContext]
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validatePasswordClient = (password, confirmPassword, userContext = {}) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`
    };
  }

  if (/^(.)\1+$/.test(password)) {
    return {
      isValid: false,
      error: 'Password cannot consist of only a single repeated character.'
    };
  }

  const lowerPassword = password.toLowerCase();

  if (userContext.username && typeof userContext.username === 'string') {
    const cleanUser = userContext.username.trim().toLowerCase();
    if (cleanUser.length >= 3 && lowerPassword.includes(cleanUser)) {
      return {
        isValid: false,
        error: 'Password must not contain your username.'
      };
    }
  }

  if (userContext.email && typeof userContext.email === 'string') {
    const emailPrefix = userContext.email.split('@')[0].trim().toLowerCase();
    if (emailPrefix.length >= 3 && lowerPassword.includes(emailPrefix)) {
      return {
        isValid: false,
        error: 'Password must not contain the username portion of your email.'
      };
    }
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigitOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (password.length < 14 && (!hasLetter || !hasDigitOrSymbol)) {
    return {
      isValid: false,
      error: 'Password must contain a mix of letters and numbers or symbols (or be 14+ characters long).'
    };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Passwords do not match.'
    };
  }

  return { isValid: true, error: null };
};

/**
 * Calculates password strength score (0-4) and descriptive label.
 *
 * @param {string} password
 * @returns {{ score: number, label: string, color: string }}
 */
export const getPasswordStrength = (password) => {
  if (!password) {
    return { score: 0, label: '', color: 'bg-warm-border' };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[\d]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: 1, label: 'Weak', color: 'bg-red-500' };
  }
  if (score === 2) {
    return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  }
  if (score === 3) {
    return { score: 3, label: 'Good', color: 'bg-blue-500' };
  }
  return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
};
