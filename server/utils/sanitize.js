/**
 * Input Sanitization Helper Utility for ContentHub CMS
 * Prevents Stored XSS and malicious injection in CMS content.
 */

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/on\w+="[^"]*"/gi, '') // Remove inline event handlers like onload="..."
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^\s"']*/gi, ''); // Remove javascript: pseudo-protocol
}

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
  sanitizeString,
  sanitizeObject,
};
