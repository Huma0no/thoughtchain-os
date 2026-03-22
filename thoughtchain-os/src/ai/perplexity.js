/**
 * Perplexity API integration (also used for Copilot pay-per-event).
 * Perplexity uses an OpenAI-compatible API surface.
 *
 * ⚠️  PRODUCTION NOTE: proxy through your backend, never expose keys client-side.
 */

const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions';
const MODEL          = 'llama-3.1-sonar-large-128k-online';
const SYSTEM         = `Eres Perplexity en ThoughtchainOS. Responde con información actualizada y cita fuentes cuando sea relevante. Máximo 180 palabras.`;

export async function callPerplexity(prompt, { apiKey, history = [] }) {
  const messages = [
    { role: 'system', content: SYSTEM },
    ...history,
    { role: 'user', content: prompt },
  ];

  const response = await fetch(PERPLEXITY_API, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 600, messages }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Perplexity API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
