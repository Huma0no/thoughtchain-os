/**
 * Generate a deterministic-ish 8-char hex commit hash.
 * Incorporates content + timestamp + random salt to avoid collisions.
 *
 * Not cryptographically secure — used as a human-readable identifier only.
 */
export function generateHash(content) {
  const seed = content + Date.now() + Math.random();
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0; // convert to 32-bit int
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}

/**
 * Shorten a hash for display (first N chars).
 */
export const shortHash = (hash, n = 7) => hash.slice(0, n);
