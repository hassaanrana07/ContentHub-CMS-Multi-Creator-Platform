/**
 * Client-side defense-in-depth URL sanitizer
 * Ensures that href attributes rendered in anchor tags cannot execute javascript: or data: payloads.
 */
export function sanitizeUrl(url, fallback = '#') {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  // Fragment or relative path (excluding protocol-relative //)
  if (trimmed.startsWith('#') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    return trimmed;
  }

  // Strip control characters and invisible characters before protocol check
  const sanitized = trimmed.replace(/[\x00-\x1F\x7F-\x9F\s]/g, '');

  // Disallow javascript:, vbscript:, data:
  const lower = sanitized.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:')
  ) {
    return fallback;
  }

  // Allow safe protocols: https://, http://, mailto:
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
      return trimmed;
    }
  } catch (e) {
    // If not a parseable URL and not starting with / or #, reject for safety
    return fallback;
  }

  return fallback;
}

export default sanitizeUrl;
