/**
 * Safe Input Sanitization & URL Validation Utility for ContentHub CMS
 *
 * ContentHub treats CMS content as plain text, rendered by React as safe text nodes.
 * This utility:
 * 1. Strictly validates and sanitizes URLs against dangerous schemes (javascript:, data:, vbscript:).
 * 2. Cleans dangerous control characters (e.g. NULL bytes) without stripping or corrupting legitimate plain text,
 *    code examples, or HTML-like text.
 */

/**
 * Validates whether a URL uses an approved safe scheme.
 * Allowed: https:, http:, mailto:, relative paths (/), and fragment anchors (#).
 * Disallowed: javascript:, data:, vbscript:, file:, blob:, protocol-relative (//), or control characters.
 *
 * @param {string} rawUrl
 * @returns {boolean}
 */
function isSafeUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;

  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  // 1. Fragment URLs (must begin with #)
  if (trimmed.startsWith('#')) {
    return !/[\u0000-\u001F\u007F-\u009F]/.test(trimmed);
  }

  // 2. Relative paths (must begin with / and not //)
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return false; // Reject protocol-relative URLs
    return !/[\u0000-\u001F\u007F-\u009F]/.test(trimmed);
  }

  // 3. Normalize string to detect obfuscated schemes:
  // Strip whitespace, control characters, and decode basic HTML entities
  const normalized = trimmed
    .replace(/[\u0000-\u001F\u007F-\u009F\s]/g, '')
    .replace(/&#x?([0-9a-fA-F]+);?/gi, (_, hex) => {
      const code = parseInt(hex, hex.length > 2 && !hex.startsWith('x') ? 10 : 16);
      return String.fromCharCode(code);
    })
    .replace(/&colon;?/gi, ':')
    .replace(/&tab;?/gi, '')
    .replace(/&newline;?/gi, '');

  const cleanProtocolCheck = normalized.replace(/[\u0000-\u001F\u007F-\u009F\s]/g, '');

  const colonIndex = cleanProtocolCheck.indexOf(':');
  if (colonIndex === -1) {
    // Relative path without leading slash
    return !/[\u0000-\u001F\u007F-\u009F]/.test(trimmed);
  }

  const scheme = cleanProtocolCheck.slice(0, colonIndex).toLowerCase();

  // Allow only explicit safe schemes
  if (scheme === 'https' || scheme === 'http' || scheme === 'mailto') {
    if (/[\u0000-\u001F\u007F-\u009F]/.test(trimmed)) {
      return false;
    }
    return true;
  }

  // Reject all other schemes (javascript, data, vbscript, etc.)
  return false;
}

/**
 * Validates a URL field for request payload validation.
 *
 * @param {any} url
 * @param {string} fieldName
 * @param {number} maxLength
 * @param {boolean} required
 * @returns {{ error?: string, value?: string|null }}
 */
function validateUrl(url, fieldName, maxLength = 2048, required = false) {
  if (url === undefined || url === null || url === '') {
    if (required) return { error: `${fieldName} is required.` };
    return { value: url === '' ? '' : null };
  }
  if (typeof url !== 'string') {
    return { error: `${fieldName} must be a string.` };
  }
  const trimmed = url.trim();
  if (required && trimmed.length === 0) {
    return { error: `${fieldName} cannot be empty.` };
  }
  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer.` };
  }
  if (!isSafeUrl(trimmed)) {
    return { error: `${fieldName} contains an unsafe or unsupported URL protocol. Only http, https, mailto, relative paths (/), and anchors (#) are allowed.` };
  }
  return { value: trimmed };
}

/**
 * Sanitizes a URL, returning a safe fallback if invalid.
 *
 * @param {string} url
 * @param {string} fallback
 * @returns {string}
 */
function sanitizeUrl(url, fallback = '') {
  if (isSafeUrl(url)) {
    return url.trim();
  }
  return fallback;
}

/**
 * Cleans dangerous ASCII/Unicode control characters (such as NULL bytes) from strings,
 * without stripping HTML tags or altering legitimate plain text content.
 *
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  // Remove NULL bytes and dangerous unprintable control characters,
  // but preserve tabs (\t), newlines (\n, \r), and all printable text
  return str.replace(/[\u0000\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}

/**
 * Recursively cleans dangerous control characters from request body objects.
 *
 * @param {any} obj
 * @returns {any}
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === 'string') {
        sanitized[key] = sanitizeString(val);
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = sanitizeObject(val);
      } else {
        sanitized[key] = val;
      }
    }
  }
  return sanitized;
}

module.exports = {
  isSafeUrl,
  validateUrl,
  sanitizeUrl,
  sanitizeString,
  sanitizeObject,
};
