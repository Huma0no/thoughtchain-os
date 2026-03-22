/**
 * Google Gemini API integration.
 *
 * ⚠️  PRODUCTION NOTE: proxy through your backend, never expose keys client-side.
 */

const MODEL  = 'gemini-1.5-flash';
const SYSTEM = `Eres Gemini en ThoughtchainOS. Responde de forma reflexiva y orientada a sistemas. Máximo 180 palabras.`;

export async function callGemini(prompt, { apiKey, history = [] }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const contents = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { maxOutputTokens: 600 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Gemini API error ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
