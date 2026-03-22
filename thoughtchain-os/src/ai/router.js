import { callClaude }      from './claude.js';
import { callOpenAI }      from './openai.js';
import { callGrok }        from './grok.js';
import { callGemini }      from './gemini.js';
import { callPerplexity }  from './perplexity.js';

// ── DISPATCHER ────────────────────────────────────────────────────────────────

/**
 * Route a prompt to the correct IA handler.
 *
 * @param {string}   iaId     - IA identifier (claude | gpt | grok | gemini | perplexity | copilot)
 * @param {string}   prompt   - user message
 * @param {Object}   options
 * @param {string}   [options.apiKey]    - user-supplied API key for that IA
 * @param {Object[]} [options.history]   - conversation history [{role, content}]
 * @param {Function} [options.onToken]   - streaming callback (token: string) => void
 * @returns {Promise<string>}            - full response text
 */
export async function dispatch(iaId, prompt, { apiKey, history = [], onToken } = {}) {
  switch (iaId) {
    case 'claude':
      return callClaude(prompt, { history, onToken });

    case 'gpt':
      if (!apiKey) throw new Error('OpenAI API key required');
      return callOpenAI(prompt, { apiKey, history, onToken });

    case 'grok':
      if (!apiKey) throw new Error('xAI API key required');
      return callGrok(prompt, { apiKey, history, onToken });

    case 'gemini':
      if (!apiKey) throw new Error('Google API key required');
      return callGemini(prompt, { apiKey, history, onToken });

    case 'perplexity':
    case 'copilot':
      if (!apiKey) throw new Error(`${iaId} key required (pay-per-event)`);
      return callPerplexity(prompt, { apiKey, history, onToken });

    default:
      throw new Error(`Unknown IA: ${iaId}`);
  }
}

// ── PARALLEL ORCHESTRATOR ─────────────────────────────────────────────────────

/**
 * Send a prompt to multiple IAs simultaneously.
 * For each IA, calls onResult as soon as that IA finishes.
 *
 * @param {string[]}  iaIds
 * @param {string}    prompt
 * @param {Object}    keys      - { [iaId]: apiKey }
 * @param {Object}    history   - { [iaId]: Message[] }
 * @param {Function}  onResult  - (iaId, text, elapsedMs) => void
 * @param {Function}  onError   - (iaId, error) => void
 */
export function dispatchAll(iaIds, prompt, { keys = {}, history = {}, onResult, onError } = {}) {
  iaIds.forEach(iaId => {
    const t0 = Date.now();
    dispatch(iaId, prompt, { apiKey: keys[iaId], history: history[iaId] ?? [] })
      .then(text  => onResult?.(iaId, text, Date.now() - t0))
      .catch(err  => onError?.(iaId, err));
  });
}
