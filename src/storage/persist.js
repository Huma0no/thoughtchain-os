import { KEYS } from './schema.js';

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Simple base64 obfuscation for API keys stored client-side.
 *  NOT true encryption — use a backend proxy in production. */
const obfuscate   = str => btoa(unescape(encodeURIComponent(str)));
const deobfuscate = str => decodeURIComponent(escape(atob(str)));

function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function lsDel(key) {
  try { localStorage.removeItem(key); } catch {}
}

// ── LOAD ──────────────────────────────────────────────────────────────────────

/**
 * Load all persisted state from localStorage.
 * Returns a partial state object; missing keys return defaults.
 */
export async function loadState() {
  const result = {
    commits:      [],
    fuseCount:    0,
    debateCount:  0,
    active:       { claude: true },
    keys:         {},
    frags:        [],
  };

  const rawCommits = lsGet(KEYS.commits);
  if (rawCommits) {
    try {
      const data = JSON.parse(rawCommits);
      result.commits     = data.commits     ?? [];
      result.fuseCount   = data.fuseCount   ?? 0;
      result.debateCount = data.debateCount ?? 0;
    } catch {}
  }

  const rawActive = lsGet(KEYS.active);
  if (rawActive) {
    try { result.active = JSON.parse(rawActive); } catch {}
  }

  const rawKeys = lsGet(KEYS.keys);
  if (rawKeys) {
    try {
      const encoded = JSON.parse(rawKeys);
      Object.keys(encoded).forEach(k => {
        try { result.keys[k] = deobfuscate(encoded[k]); } catch {}
      });
    } catch {}
  }

  const rawFrags = lsGet(KEYS.frags);
  if (rawFrags) {
    try { result.frags = JSON.parse(rawFrags); } catch {}
  }

  return result;
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

/** Save commits + counters as a single blob (updated together). */
export async function saveCommits({ commits, fuseCount, debateCount }) {
  lsSet(KEYS.commits, JSON.stringify({ commits, fuseCount, debateCount }));
}

/** Save active IA map. */
export async function saveActive(active) {
  lsSet(KEYS.active, JSON.stringify(active));
}

/** Save API keys (obfuscated). */
export async function saveKeys(keys) {
  const encoded = {};
  Object.keys(keys).forEach(k => { if (keys[k]) encoded[k] = obfuscate(keys[k]); });
  lsSet(KEYS.keys, JSON.stringify(encoded));
}

/** Save in-progress compositor fragments (strip DOM-specific fields). */
export async function saveFrags(frags) {
  const clean = frags.map(({ id, text, ia, c, bg, tc, note }) =>
    ({ id, text, ia, c, bg, tc, note: note ?? '' })
  );
  lsSet(KEYS.frags, JSON.stringify(clean));
}

// ── CLEAR ─────────────────────────────────────────────────────────────────────

/** Delete all ThoughtchainOS data from storage. */
export async function clearAll() {
  lsDel(KEYS.commits);
  lsDel(KEYS.active);
  lsDel(KEYS.keys);
  lsDel(KEYS.frags);
}

// ── DEBOUNCED SAVE FACTORY ────────────────────────────────────────────────────

/**
 * Returns a debounced save function.
 * Call it after any state mutation; it waits `delay` ms before writing.
 *
 * @param {Function} getState - () => current app state
 * @param {Function} onStart  - called when save starts (show indicator)
 * @param {Function} onDone   - called when save finishes
 * @param {Function} onError  - called on failure
 * @param {number}   delay    - debounce ms (default 600)
 */
export function createDebouncedSave({ getState, onStart, onDone, onError, delay = 600 }) {
  let timer = null;

  return function scheduleSave() {
    if (timer) clearTimeout(timer);
    onStart?.();
    timer = setTimeout(async () => {
      try {
        const s = getState();
        await Promise.all([
          saveCommits({ commits: s.commits, fuseCount: s.fuseCount, debateCount: s.debateCount }),
          saveActive(s.active),
          saveKeys(s.keys),
          saveFrags(s.frags),
        ]);
        onDone?.();
      } catch (err) {
        onError?.(err);
      }
    }, delay);
  };
}
