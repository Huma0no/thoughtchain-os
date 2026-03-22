import { KEYS } from './schema.js';

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Simple base64 obfuscation for API keys stored client-side.
 *  NOT true encryption — use a backend proxy in production. */
const obfuscate   = str => btoa(str);
const deobfuscate = str => atob(str);

// ── LOAD ──────────────────────────────────────────────────────────────────────

/**
 * Load all persisted state from window.storage.
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

  await Promise.allSettled([

    window.storage.get(KEYS.commits).then(r => {
      if (!r) return;
      const data = JSON.parse(r.value);
      result.commits     = data.commits     ?? [];
      result.fuseCount   = data.fuseCount   ?? 0;
      result.debateCount = data.debateCount ?? 0;
    }),

    window.storage.get(KEYS.active).then(r => {
      if (!r) return;
      result.active = JSON.parse(r.value);
    }),

    window.storage.get(KEYS.keys).then(r => {
      if (!r) return;
      const encoded = JSON.parse(r.value);
      Object.keys(encoded).forEach(k => {
        try { result.keys[k] = deobfuscate(encoded[k]); } catch {}
      });
    }),

    window.storage.get(KEYS.frags).then(r => {
      if (!r) return;
      result.frags = JSON.parse(r.value);
    }),

  ]);

  return result;
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

/** Save commits + counters as a single blob (updated together). */
export async function saveCommits({ commits, fuseCount, debateCount }) {
  await window.storage.set(KEYS.commits, JSON.stringify({ commits, fuseCount, debateCount }));
}

/** Save active IA map. */
export async function saveActive(active) {
  await window.storage.set(KEYS.active, JSON.stringify(active));
}

/** Save API keys (obfuscated). */
export async function saveKeys(keys) {
  const encoded = {};
  Object.keys(keys).forEach(k => { if (keys[k]) encoded[k] = obfuscate(keys[k]); });
  await window.storage.set(KEYS.keys, JSON.stringify(encoded));
}

/** Save in-progress compositor fragments (strip DOM-specific fields). */
export async function saveFrags(frags) {
  const clean = frags.map(({ id, text, ia, c, bg, tc, note }) =>
    ({ id, text, ia, c, bg, tc, note: note ?? '' })
  );
  await window.storage.set(KEYS.frags, JSON.stringify(clean));
}

// ── CLEAR ─────────────────────────────────────────────────────────────────────

/** Delete all ThoughtchainOS data from storage. */
export async function clearAll() {
  await Promise.allSettled([
    window.storage.delete(KEYS.commits),
    window.storage.delete(KEYS.active),
    window.storage.delete(KEYS.keys),
    window.storage.delete(KEYS.frags),
  ]);
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
