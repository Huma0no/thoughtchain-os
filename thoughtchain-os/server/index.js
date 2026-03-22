/**
 * ThoughtchainOS — Backend Proxy Server
 *
 * Proxies requests to third-party IA APIs (OpenAI, xAI, Google, Perplexity)
 * so API keys never reach the client browser.
 *
 * Usage:
 *   npm install
 *   cp .env.example .env   # fill in your keys
 *   node server/index.js
 *
 * Then point your frontend API calls to http://localhost:3000/api/ia
 */

import express        from 'express';
import cors           from 'cors';
import { config }     from 'dotenv';
import { createRoutes } from './routes.js';

config(); // load .env

const app  = express();
const PORT = process.env.PORT ?? 3000;

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:8080',
  methods: ['POST', 'GET', 'OPTIONS'],
}));

// ── HEALTH ─────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// ── IA PROXY ROUTES ────────────────────────────────────────────────────────────
createRoutes(app);

// ── START ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`ThoughtchainOS server running on http://localhost:${PORT}`);
  console.log(`Connected IAs: ${getConnectedIAs().join(', ') || 'none'}`);
});

function getConnectedIAs() {
  const connected = [];
  if (process.env.OPENAI_API_KEY)     connected.push('ChatGPT');
  if (process.env.XAI_API_KEY)        connected.push('Grok');
  if (process.env.GOOGLE_API_KEY)     connected.push('Gemini');
  if (process.env.PERPLEXITY_API_KEY) connected.push('Perplexity');
  return connected;
}

export default app;
