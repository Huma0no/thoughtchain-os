/**
 * IA proxy routes.
 * Each handler validates the request, adds the server-side API key,
 * and forwards to the real IA provider.
 */

const SYSTEM_PROMPTS = {
  gpt:        'Eres ChatGPT en ThoughtchainOS. Responde de forma concisa y analítica. Máximo 180 palabras.',
  grok:       'Eres Grok en ThoughtchainOS. Responde de forma directa e incisiva. Máximo 180 palabras.',
  gemini:     'Eres Gemini en ThoughtchainOS. Responde de forma reflexiva y orientada a sistemas. Máximo 180 palabras.',
  perplexity: 'Eres Perplexity en ThoughtchainOS. Responde con información actualizada. Máximo 180 palabras.',
  copilot:    'Eres Copilot en ThoughtchainOS. Responde de forma práctica y orientada a soluciones. Máximo 180 palabras.',
};

// ── ROUTE FACTORY ──────────────────────────────────────────────────────────────
export function createRoutes(app) {

  /**
   * POST /api/ia
   * Body: { iaId: string, prompt: string, history?: {role, content}[] }
   * Returns: { text: string, elapsed: number }
   */
  app.post('/api/ia', async (req, res) => {
    const { iaId, prompt, history = [] } = req.body;

    if (!iaId || !prompt) {
      return res.status(400).json({ error: 'iaId and prompt are required' });
    }

    const t0 = Date.now();

    try {
      const text = await proxyIA(iaId, prompt, history);
      res.json({ text, elapsed: Date.now() - t0 });
    } catch (err) {
      console.error(`[${iaId}] error:`, err.message);
      res.status(502).json({ error: err.message });
    }
  });
}

// ── DISPATCHER ─────────────────────────────────────────────────────────────────
async function proxyIA(iaId, prompt, history) {
  switch (iaId) {
    case 'gpt':        return proxyOpenAI(prompt, history);
    case 'grok':       return proxyGrok(prompt, history);
    case 'gemini':     return proxyGemini(prompt, history);
    case 'perplexity':
    case 'copilot':    return proxyPerplexity(prompt, history);
    default:           throw new Error(`Unknown iaId: ${iaId}`);
  }
}

// ── OPENAI ─────────────────────────────────────────────────────────────────────
async function proxyOpenAI(prompt, history) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured on server');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.gpt },
    ...history,
    { role: 'user', content: prompt },
  ];

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body:    JSON.stringify({ model: 'gpt-4o', max_tokens: 600, messages }),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? `OpenAI ${r.status}`);
  return data.choices?.[0]?.message?.content ?? '';
}

// ── GROK (xAI) ─────────────────────────────────────────────────────────────────
async function proxyGrok(prompt, history) {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error('XAI_API_KEY not configured on server');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.grok },
    ...history,
    { role: 'user', content: prompt },
  ];

  const r = await fetch('https://api.x.ai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body:    JSON.stringify({ model: 'grok-3', max_tokens: 600, messages }),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? `xAI ${r.status}`);
  return data.choices?.[0]?.message?.content ?? '';
}

// ── GEMINI ─────────────────────────────────────────────────────────────────────
async function proxyGemini(prompt, history) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not configured on server');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

  const contents = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const r = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPTS.gemini }] },
      contents,
      generationConfig: { maxOutputTokens: 600 },
    }),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? `Gemini ${r.status}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ── PERPLEXITY / COPILOT ───────────────────────────────────────────────────────
async function proxyPerplexity(prompt, history) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY not configured on server');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.perplexity },
    ...history,
    { role: 'user', content: prompt },
  ];

  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body:    JSON.stringify({ model: 'llama-3.1-sonar-large-128k-online', max_tokens: 600, messages }),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? `Perplexity ${r.status}`);
  return data.choices?.[0]?.message?.content ?? '';
}
