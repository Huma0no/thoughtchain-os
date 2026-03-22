// ── STORAGE KEYS ──────────────────────────────────────────────────────────────
export const KEYS = {
  commits:  'tc:commits',
  active:   'tc:active',
  keys:     'tc:keys',
  frags:    'tc:frags',
  settings: 'tc:settings',
};

// ── COMMIT SCHEMA ──────────────────────────────────────────────────────────────
/**
 * @typedef {Object} Commit
 * @property {string}   hash    - 8-char hex hash, chained to previous
 * @property {string}   type    - 'idea' | 'insight' | 'relato' | 'proyecto' | 'hipótesis'
 * @property {string}   text    - commit content (plain text, may include attribution headers)
 * @property {string[]} ias     - IA names that contributed
 * @property {string}   mode    - 'ganador' | 'fusión' | 'selección' | 'debate' | 'anotado'
 * @property {number}   frags   - number of fragments fused (0 if single winner)
 * @property {number}   time    - unix timestamp ms
 */

// ── FRAGMENT SCHEMA ────────────────────────────────────────────────────────────
/**
 * @typedef {Object} Fragment
 * @property {string} id    - unique id ('f' + timestamp)
 * @property {string} text  - selected text
 * @property {string} ia    - source IA id
 * @property {string} c     - accent color hex
 * @property {string} bg    - background color rgba
 * @property {string} tc    - text color hex
 * @property {string} [note] - optional user annotation
 */

// ── IA DEFINITION SCHEMA ───────────────────────────────────────────────────────
/**
 * @typedef {Object} IADef
 * @property {string}  id           - unique identifier
 * @property {string}  name         - display name
 * @property {string}  abbr         - 2-char abbreviation
 * @property {string}  c            - accent color hex
 * @property {string}  bg           - bg color (light mode) rgba
 * @property {string}  tc           - text color (light mode)
 * @property {boolean} [free]       - true = no key needed (Claude)
 * @property {boolean} [needsKey]   - true = requires user API key
 * @property {boolean} [payPerEvent] - true = shows pay modal before sending
 * @property {number}  [price]      - cost per query in USD
 */

export const IA_DEFS = [
  { id:'claude',     name:'Claude',     abbr:'Cl', c:'#7F77DD', bg:'rgba(127,119,221,.13)', tc:'#7F77DD', free:true },
  { id:'gpt',        name:'ChatGPT',    abbr:'GP', c:'#1D9E75', bg:'rgba(29,158,117,.11)',  tc:'#1D9E75', needsKey:true,    price:0.02 },
  { id:'grok',       name:'Grok',       abbr:'Gk', c:'#EF9F27', bg:'rgba(239,159,39,.11)',  tc:'#c4891c', needsKey:true,    price:0.02 },
  { id:'perplexity', name:'Perplexity', abbr:'Px', c:'#D85A30', bg:'rgba(216,90,48,.11)',   tc:'#D85A30', payPerEvent:true, price:0.02 },
  { id:'copilot',    name:'Copilot',    abbr:'Co', c:'#378ADD', bg:'rgba(55,138,221,.11)',   tc:'#378ADD', payPerEvent:true, price:0.02 },
  { id:'gemini',     name:'Gemini',     abbr:'Gm', c:'#3B6D11', bg:'rgba(59,109,17,.11)',   tc:'#3B6D11', needsKey:true,    price:0.01 },
];

export const COMMIT_TYPES = ['idea', 'insight', 'relato', 'proyecto', 'hipótesis'];

export const TYPE_COLORS = {
  idea:      '#7F77DD',
  insight:   '#1D9E75',
  relato:    '#EF9F27',
  proyecto:  '#D85A30',
  hipótesis: '#378ADD',
};
