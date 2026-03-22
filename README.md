# ThoughtchainOS

> Un sistema de gestión de ideas, relatos y proyectos — inmutable como BTC, navegable como Bubblemaps, orquestado por múltiples IAs.

![ThoughtchainOS](docs/screenshot-placeholder.png)

## ¿Qué es?

ThoughtchainOS es una aplicación web que combina tres conceptos:

- **GitHub de ideas** — cada pensamiento es un commit con hash, timestamp y trazabilidad completa
- **Orquestador multi-IA** — lanza consultas en paralelo a Claude, ChatGPT, Grok, Perplexity, Copilot y Gemini, selecciona fragmentos de texto quirúrgicamente y compones el commit final
- **Mapa cognitivo** — visualiza tus ideas como clusters semánticos navegables (zoom, pan, pinch)

## Características

- **Arena** — respuestas en paralelo de múltiples IAs, selección de texto con menú flotante, compositor drag & drop
- **Compositor** — extrae fragmentos exactos de cada respuesta, numéralos, reordénalos, fusiónos en un commit
- **Timeline** — chain inmutable de commits con hash encadenado
- **Mapa (Bubbles)** — visualización tipo Bubblemaps de clusters por tipo de idea
- **Debate** — las IAs se responden entre sí en rondas, commitas la conclusión
- **Persistencia** — todo se guarda entre sesiones (commits, fragmentos, configuración de IAs)
- **Tema del sistema** — light/dark automático según el OS
- **Pay-per-event** — modelo de pago por consulta para IAs sin suscripción

## Stack

```
Frontend:   HTML + CSS + Vanilla JS (zero dependencies)
Storage:    window.storage API (persistencia entre sesiones)
IA real:    Anthropic Claude API (claude-sonnet-4-20250514)
IA terceros: OpenAI, xAI, Google, Microsoft, Perplexity (requieren API keys)
```

## Estructura del proyecto

```
thoughtchain-os/
├── index.html                  # Entrada principal
├── src/
│   ├── styles/
│   │   ├── tokens.css          # Variables CSS (colores, radios, sombras)
│   │   ├── sidebar.css
│   │   ├── arena.css
│   │   ├── compositor.css
│   │   ├── timeline.css
│   │   ├── bubbles.css
│   │   └── chatbar.css
│   ├── components/
│   │   ├── Sidebar.js          # Panel lateral con IAs y historial
│   │   ├── Arena.js            # Vista de respuestas en paralelo
│   │   ├── Compositor.js       # Panel de fragmentos drag & drop
│   │   ├── Timeline.js         # Vista de chain inmutable
│   │   ├── BubbleMap.js        # Canvas de clusters semánticos
│   │   ├── Debate.js           # Modo debate entre IAs
│   │   ├── ChatBar.js          # Input inferior con chips de IAs
│   │   └── SelectionPopup.js   # Menú flotante al seleccionar texto
│   ├── ai/
│   │   ├── claude.js           # Llamadas a Anthropic API
│   │   ├── openai.js           # Llamadas a OpenAI API
│   │   ├── grok.js             # Llamadas a xAI API
│   │   ├── gemini.js           # Llamadas a Google Gemini API
│   │   ├── perplexity.js       # Llamadas a Perplexity API
│   │   └── router.js           # Orquestador — decide qué IA llamar
│   ├── storage/
│   │   ├── persist.js          # Capa de persistencia (load/save/clear)
│   │   └── schema.js           # Definición de tipos y claves
│   └── utils/
│       ├── hash.js             # Generador de hashes de commits
│       ├── escape.js           # Escape HTML
│       └── theme.js            # Detección y toggle de tema OS
├── docs/
│   ├── ARCHITECTURE.md         # Decisiones de diseño
│   ├── AI_SETUP.md             # Cómo configurar cada API key
│   └── ROADMAP.md              # Próximas features
├── .env.example                # Variables de entorno necesarias
├── .gitignore
└── LICENSE
```

## Setup rápido

```bash
# 1. Clonar
git clone https://github.com/tu-usuario/thoughtchain-os.git
cd thoughtchain-os

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Agregar tu Anthropic API key en .env
ANTHROPIC_API_KEY=sk-ant-...

# 4. Abrir en el browser (no requiere build step)
open index.html
# o con un servidor local:
npx serve .
```

> **Nota:** Claude funciona sin backend. Las demás IAs requieren un proxy backend para proteger las keys (ver `docs/AI_SETUP.md`).

## Configuración de IAs

| IA | Método | Requiere |
|---|---|---|
| Claude | Directo (CORS permitido) | `ANTHROPIC_API_KEY` |
| ChatGPT | Proxy backend | `OPENAI_API_KEY` |
| Grok | Proxy backend | `XAI_API_KEY` |
| Gemini | Proxy backend | `GOOGLE_API_KEY` |
| Perplexity | Pay-per-event | Cuenta Perplexity |
| Copilot | Pay-per-event | Cuenta Microsoft |

## Modelo de datos — Commit

```js
{
  hash:    "a3f7c9b2",          // SHA-like, encadenado al anterior
  type:    "idea",              // idea | insight | relato | proyecto | hipótesis
  text:    "...",               // contenido del commit
  ias:     ["Claude", "Grok"], // IAs que contribuyeron
  mode:    "fusión",           // ganador | fusión | selección | debate
  frags:   3,                  // número de fragmentos fusionados
  time:    1742600000000,      // unix timestamp
}
```

## Roadmap

- [ ] Backend seguro para API keys (Node.js / Deno)
- [ ] Autenticación real (OAuth)
- [ ] Embeddings semánticos para Bubblemap automático
- [ ] Exportar chain como JSON / Markdown
- [ ] Branches de ideas (fork de un commit)
- [ ] Colaboración multiusuario (shared commits)
- [ ] App móvil (PWA)

## Licencia

MIT — ver `LICENSE`
