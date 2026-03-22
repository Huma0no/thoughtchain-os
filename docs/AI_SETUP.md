# Configuración de IAs

## Claude (Anthropic) — funciona sin backend

Claude es la única IA que puede llamarse directamente desde el browser porque Anthropic permite CORS en su API para uso autorizado.

1. Obtén tu key en https://console.anthropic.com
2. Agrégala en `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
3. En el código está hardcoded en `src/ai/claude.js` — en producción inyéctala via variable de entorno en tu build step.

---

## ChatGPT (OpenAI)

1. Obtén tu key en https://platform.openai.com/api-keys
2. La API de OpenAI **no permite CORS desde el browser** — necesitas un proxy backend:

```js
// Ejemplo con Express
app.post('/api/openai', authenticate, async (req, res) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });
  res.json(await response.json());
});
```

---

## Grok (xAI)

1. Obtén acceso en https://x.ai/api
2. Misma restricción de CORS que OpenAI — requiere proxy backend.
3. Grok usa API surface compatible con OpenAI, por lo que el proxy es idéntico cambiando el endpoint a `https://api.x.ai/v1/chat/completions`.

---

## Gemini (Google)

1. Obtén tu key en https://aistudio.google.com/app/apikey
2. Google **sí permite** llamadas directas desde el browser con API key en el query param, pero expone la key.
3. Recomendado: usar el SDK de Google o un proxy backend.

---

## Perplexity

1. Obtén tu key en https://www.perplexity.ai/settings/api
2. Requiere proxy backend (no permite CORS).
3. En ThoughtchainOS está configurado como "pay-per-event" — el usuario ve el costo antes de confirmar.

---

## Copilot (Microsoft)

1. Acceso via Azure OpenAI Service: https://azure.microsoft.com/en-us/products/ai-services/openai-service
2. Requiere cuenta Azure + deployment propio.
3. Configura el endpoint de tu deployment en `src/ai/copilot.js`.

---

## Backend proxy recomendado

Para producción, un backend mínimo en Node.js/Deno/Edge Functions que:

1. Valida autenticación del usuario
2. Selecciona la API key correcta del servidor (nunca del cliente)
3. Factura por evento si el usuario no tiene suscripción
4. Retorna la respuesta

```
POST /api/ia
Body: { iaId, prompt, history }
Auth: Bearer <user_token>
```
