/**
 * xAI Grok API integration.
 * Grok uses an OpenAI-compatible API surface.
 *
 * ⚠️  PRODUCTION NOTE: proxy through your backend, never expose keys client-side.
 */

const GROK_API = 'https://api.x.ai/v1/chat/completions';
const MODEL    = 'grok-3';
const SYSTEM   = `Eres Grok en ThoughtchainOS. Responde de forma directa, incisiva y sin rodeos. Máximo 180 palabras.`;

export async function callGrok(prompt, { apiKey, history = [] }) {
  const messages = [
    { role: 'system', content: SYSTEM },
    ...history,
    { role: 'user', content: prompt },
  ];

  const response = await fetch(GROK_API, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 600, messages }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `xAI API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
