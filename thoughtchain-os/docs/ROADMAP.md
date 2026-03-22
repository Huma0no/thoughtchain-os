# Roadmap

## v0.1 — MVP (actual)
- [x] Arena multi-IA con respuestas en paralelo
- [x] Selección de texto con menú flotante
- [x] Compositor drag & drop con fragmentos numerados
- [x] 3 modos de commit: ganador, fusión, selección
- [x] Timeline inmutable con hashes encadenados
- [x] Bubblemap de clusters semánticos (zoom, pan, pinch)
- [x] Modo debate entre IAs
- [x] Persistencia entre sesiones (window.storage)
- [x] Tema light/dark automático (OS)
- [x] Sidebar hover-to-expand
- [x] Compositor tab colapsable con peek

## v0.2 — Backend & Auth
- [ ] Backend Node.js/Deno con proxy seguro de API keys
- [ ] Autenticación OAuth (Google, GitHub)
- [ ] API keys cifradas en servidor, nunca en cliente
- [ ] Modelo pay-per-event real con Stripe

## v0.3 — Semántica
- [ ] Embeddings de texto para posicionamiento automático en Bubblemap
- [ ] Búsqueda semántica sobre commits (ej. "ideas sobre blockchain")
- [ ] Tags automáticos via clasificación con Claude
- [ ] Distancia cognitiva entre commits (similitud vectorial)

## v0.4 — Colaboración
- [ ] Branches de ideas (fork de un commit en dos líneas)
- [ ] Shared chains multiusuario
- [ ] Comentarios y reacciones en commits
- [ ] Merge de dos branches

## v0.5 — Exportación
- [ ] Exportar chain como JSON estructurado
- [ ] Exportar como Markdown (documento narrativo)
- [ ] Exportar Bubblemap como SVG/PNG
- [ ] Importar desde Obsidian / Notion / Roam

## v1.0 — PWA
- [ ] Progressive Web App (installable)
- [ ] Soporte offline con sync cuando hay conexión
- [ ] App móvil nativa (React Native o Tauri)
- [ ] Notificaciones de ideas pendientes de commit
