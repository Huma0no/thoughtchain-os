/**
 * Call OpenAI Chat Completions API.
 * Requires a user-supplied API key (or a backend proxy in production).
 *
 * ⚠️  PRODUCTION NOTE:
 *   Never expose API keys in client-side code in a public app.
 *   Route through /api/openai on your backend and validate auth there.
 */

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MODEL      = 'gpt-4o';
const SYSTEM     = `Eres ChatGPT en ThoughtchainOS. Responde de forma concisa y analítica. Máximo 180 palabras.`;

/**
 * @param {string}   prompt
 * @param {Object}   options
 * @param {string}   options.apiKey
 * @param {Object[]} options.history
 * @returns {Promise<string>}
 */
export async function callOpenAI(prompt, { apiKey, history = [] }) {
  const messages = [
    { role: 'system', content: SYSTEM },
    ...history,
    { role: 'user', content: prompt },
  ];

  const response = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 600, messages }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `OpenAI API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
