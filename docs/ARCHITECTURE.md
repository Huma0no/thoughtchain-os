# Decisiones de arquitectura

## ¿Por qué Vanilla JS y no React/Vue?

ThoughtchainOS en su forma actual es un **prototipo de alta fidelidad** construido en HTML/CSS/JS puro por tres razones:

1. **Cero dependencias** — funciona abriendo `index.html` directamente, sin npm install ni build step.
2. **Portabilidad** — puede vivir como artifact en Claude.ai, en GitHub Pages, o en cualquier servidor estático.
3. **Velocidad de iteración** — para explorar UX e ideas, el overhead de un framework ralentiza el ciclo.

Para producción (v0.2+) la recomendación es migrar a **React + Vite** manteniendo la misma estructura de módulos.

---

## Inmutabilidad de commits

Los commits son append-only por convención, no por mecanismo técnico (no usamos una blockchain real). La "inmutabilidad" es una garantía de la UI: no existe botón de editar ni borrar commits individuales.

Cada commit incluye el hash del texto + timestamp + salt aleatorio. No encadenamos el hash del commit anterior (como BTC) porque no hay consenso distribuido — pero el orden temporal sí es preservado.

Para v1.0 se puede implementar encadenamiento real:
```js
hash = sha256(content + previousHash + timestamp)
```

---

## Por qué window.storage y no localStorage

`window.storage` es la API de persistencia disponible en artifacts de Claude.ai. En un entorno de browser estándar, el equivalente sería `localStorage` con la misma interfaz key-value.

La capa `src/storage/persist.js` abstrae esta diferencia — para migrar a localStorage basta con cambiar `window.storage.get/set/delete` por `localStorage.getItem/setItem/removeItem`.

---

## API keys: por qué nunca en el cliente

Las API keys de OpenAI, xAI, Google y Perplexity **no deben estar en código cliente** en una app pública porque:

1. Cualquier usuario puede inspeccionarlas con DevTools
2. Se pueden abusar generando costos para el dueño
3. Las ToS de todos los proveedores lo prohíben explícitamente

La arquitectura correcta para producción:
```
Browser → POST /api/ia {iaId, prompt} → Backend (tiene las keys) → IA API
```

Claude es la excepción: Anthropic permite llamadas directas desde el browser en contextos controlados como Claude.ai artifacts.

---

## Bubblemap: clustering actual vs semántico

La versión actual agrupa commits por `type` (idea, insight, relato...) — clustering manual.

El objetivo para v0.3 es clustering semántico real:
1. Cada commit genera un embedding de 1536 dimensiones (OpenAI embeddings o Claude)
2. Se aplica UMAP o t-SNE para reducir a 2D
3. Las posiciones en el canvas reflejan similitud semántica real
4. Commits con ideas similares se atraen entre sí

Esto convierte el Bubblemap en un **mapa cognitivo real** de tu pensamiento.
