const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-20250514';
const SYSTEM        = `Eres Claude en ThoughtchainOS, un sistema de gestión de ideas, relatos y proyectos.
Responde de forma reflexiva, concisa e intelectualmente estimulante. Máximo 180 palabras.
Si la consulta es una idea creativa, explórala con profundidad.
Si es técnica, sé preciso y directo.`;

/**
 * Call the Anthropic Messages API.
 *
 * @param {string}   prompt
 * @param {Object}   options
 * @param {Object[]} options.history  - [{role: 'user'|'assistant', content: string}]
 * @param {Function} [options.onToken] - streaming token callback (not yet implemented client-side)
 * @returns {Promise<string>}
 */
export async function callClaude(prompt, { history = [], onToken } = {}) {
  const messages = [...history, { role: 'user', content: prompt }];

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 1000,
      system:     SYSTEM,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Anthropic API error ${response.status}`);
  }

  const data = await response.json();
  return data.content?.map(b => b.text ?? '').join('') ?? '';
}
