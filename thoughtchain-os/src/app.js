/**
 * ThoughtchainOS — Main Application Controller
 * Wires all modules together and exposes App.* to the HTML.
 */

import { IA_DEFS, TYPE_COLORS, COMMIT_TYPES } from './storage/schema.js';
import { loadState, createDebouncedSave, clearAll as storeClearAll } from './storage/persist.js';
import { dispatch }  from './ai/router.js';
import { generateHash } from './utils/hash.js';
import { esc, sleep }   from './utils/escape.js';

// ── STATE ──────────────────────────────────────────────────────────────────────
const S = {
  active:      { claude: true },
  keys:        {},
  commits:     [],
  frags:       [],
  loggedIn:    false,
  pendingPay:  null,
  pendingPrompt: '',
  pendingKeyIA:  null,
  debateCount: 0,
  fuseCount:   0,
  compOpen:    false,
  bState:      { scale: 1, ox: 0, oy: 0, drag: false, lx: 0, ly: 0 },
};

const claudeHistory = [];  // persistent per session
let bubbles = [];
let dragSrc = null;
let pendingSel = null, pendingIAD = null;

// ── SAVE (debounced) ───────────────────────────────────────────────────────────
const save = createDebouncedSave({
  getState: () => S,
  onStart:  () => setPersist('saving'),
  onDone:   () => { setPersist('saved'); setTimeout(() => setPersist('idle'), 2000); },
  onError:  () => setPersist('error'),
});

function setPersist(state) {
  const dot = document.getElementById('persist-dot');
  const lbl = document.getElementById('persist-label');
  dot.className = 'persist-dot ' + state;
  lbl.className = 'persist-label ' + state;
  lbl.textContent = { idle:'guardado', saving:'guardando...', saved:'guardado', error:'error' }[state] ?? '';
}

// ── BOOT ───────────────────────────────────────────────────────────────────────
async function boot() {
  setPersist('saving');
  try {
    const stored = await loadState();
    Object.assign(S, stored);
    setPersist('saved');
    setTimeout(() => setPersist('idle'), 1600);
    if (S.commits.length) toast(`Chain restaurada · ${S.commits.length} commit${S.commits.length !== 1 ? 's' : ''}`);
  } catch {
    setPersist('error');
  }
  renderAll();
  initEvents();
}

// ── RENDER ALL ─────────────────────────────────────────────────────────────────
function renderAll() {
  renderSidebar();
  updateStats();
  renderHist();
  renderTimeline();
  renderFrags();
}

// ── SIDEBAR ────────────────────────────────────────────────────────────────────
function renderSidebar() {
  document.getElementById('ia-list').innerHTML = IA_DEFS.map(ia => {
    const on  = !!S.active[ia.id];
    const sub = ia.free
      ? 'conectado'
      : ia.payPerEvent ? 'pago / evento'
      : S.keys[ia.id] ? 'key ✓'
      : 'API key requerida';

    return `<div class="ia-row ${on ? 'on' : ''}" onclick="App.toggleIA('${ia.id}')">
      <div class="ia-av-col">
        <div class="ia-dot" style="background:${ia.bg};color:${ia.tc}">${ia.abbr}</div>
      </div>
      <div class="ia-name-col sb-reveal">
        ${ia.name}
        <span class="ia-sub">${sub}</span>
      </div>
      <div class="tog ${on ? 'on' : ''} sb-reveal"></div>
    </div>`;
  }).join('');

  document.getElementById('ia-chips').innerHTML = IA_DEFS.map(ia => {
    const on = !!S.active[ia.id];
    return `<div class="ia-chip ${on ? 'on' : ''}"
        onclick="App.toggleIA('${ia.id}')"
        style="background:${on ? ia.bg : 'transparent'};color:${ia.tc}">
      <div class="chip-dot" style="background:${ia.c}"></div>${ia.name}
    </div>`;
  }).join('');
}

// ── TOGGLE IA ─────────────────────────────────────────────────────────────────
window.App = window.App || {};
App.toggleIA = (id) => {
  const ia = IA_DEFS.find(x => x.id === id);
  if (!ia) return;

  if (S.active[id]) {
    delete S.active[id];
    renderSidebar();
    save();
    return;
  }

  // Needs API key — show key modal
  if (ia.needsKey && !S.keys[id]) {
    S.pendingKeyIA = id;
    document.getElementById('km-title').textContent = `${ia.name} · API Key`;
    document.getElementById('km-desc').textContent  = `Introduce tu API key de ${ia.name} para activarla.`;
    document.getElementById('km-input').value = '';
    document.getElementById('key-modal').classList.add('show');
    return;
  }

  S.active[id] = true;
  renderSidebar();
  save();
};

App.closeKeyModal = () => {
  document.getElementById('key-modal').classList.remove('show');
  S.pendingKeyIA = null;
};

App.saveKeyModal = () => {
  const id  = S.pendingKeyIA;
  const val = document.getElementById('km-input').value.trim();
  if (!val || !id) return;
  S.keys[id]   = val;
  S.active[id] = true;
  App.closeKeyModal();
  renderSidebar();
  save();
  toast(`${IA_DEFS.find(x=>x.id===id)?.name} activado`);
};

App.toggleLogin = () => {
  S.loggedIn = !S.loggedIn;
  document.getElementById('uav').textContent  = S.loggedIn ? 'U' : '?';
  document.getElementById('ulbl').textContent = S.loggedIn ? 'usuario' : 'Iniciar sesión';
  if (S.loggedIn) toast('Sesión iniciada');
};

// ── COMPOSITOR TOGGLE ─────────────────────────────────────────────────────────
App.toggleComp = (forceOpen) => {
  S.compOpen = forceOpen !== undefined ? forceOpen : !S.compOpen;
  const cw = document.getElementById('comp-wrap');
  cw.classList.toggle('open', S.compOpen);
  cw.style.width = S.compOpen ? '260px' : '32px';
};

// ── SEND ───────────────────────────────────────────────────────────────────────
App.sendAll = () => {
  const inp    = document.getElementById('chat-inp');
  const prompt = inp.value.trim();
  if (!prompt) return;

  const actives = Object.keys(S.active);
  if (!actives.length) { toast('Activa al menos una IA'); return; }

  const payIA = actives.find(k => {
    const ia = IA_DEFS.find(x => x.id === k);
    return ia?.payPerEvent && !S.loggedIn;
  });

  if (payIA) {
    const ia = IA_DEFS.find(x => x.id === payIA);
    S.pendingPay    = payIA;
    S.pendingPrompt = prompt;
    document.getElementById('m-ia').textContent    = ia.name;
    document.getElementById('m-price').textContent = '$' + ia.price.toFixed(2);
    document.getElementById('pay-modal').classList.add('show');
    return;
  }

  launch(prompt, actives);
  inp.value = '';
  inp.style.height = '';
};

function launch(prompt, actives) {
  setScreen('arena');
  document.getElementById('empty-state').style.display = 'none';
  document.querySelectorAll('.rcard').forEach(e => e.remove());
  App.clearFrags();
  document.getElementById('send-btn').disabled = true;
  actives.forEach(id => spawnCard(id, prompt));
  setTimeout(() => document.getElementById('send-btn').disabled = false, 300);
}

App.closeModal = () => {
  document.getElementById('pay-modal').classList.remove('show');
  S.pendingPay = null;
};

App.payAndSend = () => {
  App.closeModal();
  toast('Pago procesado');
  const p = S.pendingPrompt;
  const a = Object.keys(S.active);
  document.getElementById('chat-inp').value = '';
  S.pendingPay = null;
  launch(p, a);
};

// ── CARDS ──────────────────────────────────────────────────────────────────────
function spawnCard(iaId, prompt) {
  const ia = IA_DEFS.find(x => x.id === iaId);
  if (!ia) return;

  const cid  = `rc-${iaId}-${Date.now()}`;
  const card = document.createElement('div');
  card.className = 'rcard';
  card.id = cid;
  card.innerHTML = `
    <div class="rcard-head">
      <div class="rav" style="background:${ia.bg};color:${ia.tc}">${ia.abbr}</div>
      <div class="rname">${ia.name}</div>
      <div class="rtime" id="rt-${cid}">...</div>
    </div>
    <div class="rbody streaming" id="rb-${cid}"
         data-ia="${iaId}" data-c="${ia.c}" data-bg="${ia.bg}" data-tc="${ia.tc}"></div>
    <div class="ractions" id="ra-${cid}" style="display:none">
      <button class="rab w"   onclick="App.markWinner('${cid}','${iaId}')">✓ ganador</button>
      <button class="rab dbt" onclick="App.sendToDebate('${cid}')">↬ debate</button>
    </div>`;
  document.getElementById('resp-area').appendChild(card);
  callIA(iaId, prompt, cid);
}

async function callIA(iaId, prompt, cid) {
  const body  = document.getElementById(`rb-${cid}`);
  const time  = document.getElementById(`rt-${cid}`);
  const acts  = document.getElementById(`ra-${cid}`);
  const t0    = Date.now();

  try {
    const text = await dispatch(iaId, prompt, {
      apiKey:  S.keys[iaId],
      history: iaId === 'claude' ? claudeHistory : [],
    });
    if (iaId === 'claude') claudeHistory.push({ role: 'user', content: prompt }, { role: 'assistant', content: text });
    streamText(text, body, time, acts, t0);
  } catch (err) {
    body.classList.remove('streaming');
    body.innerHTML = `<span style="color:var(--text3);font-style:italic">${esc(err.message)}</span>`;
  }
}

function streamText(text, body, time, acts, t0) {
  body.classList.remove('streaming');
  body.textContent = '';
  const words = text.split(' ');
  let i = 0;
  const iv = setInterval(() => {
    if (i >= words.length) {
      clearInterval(iv);
      time.textContent = ((Date.now() - t0) / 1000).toFixed(1) + 's';
      acts.style.display = 'flex';
      return;
    }
    body.textContent += (i > 0 ? ' ' : '') + words[i];
    i += 3;
  }, 25);
}

App.markWinner = (cid, iaId) => {
  const text = document.getElementById(`rb-${cid}`).textContent;
  App.clearFrags();
  const ia = IA_DEFS.find(x => x.id === iaId);
  S.frags.push({ id: 'f' + Date.now(), text, ia: iaId, c: ia.c, bg: ia.bg, tc: ia.tc });
  renderFrags();
  App.toggleComp(true);
  toast(`✓ ${ia.name} ganador`);
  save();
};

App.sendToDebate = (cid) => {
  document.getElementById('chat-inp').value = document.getElementById(`rb-${cid}`).textContent.slice(0, 80);
  setScreen('debate');
};

// ── SELECTION ──────────────────────────────────────────────────────────────────
App.addFrag = () => {
  if (!pendingSel) return;
  const ia = IA_DEFS.find(x => x.id === pendingIAD.ia);
  const id = 'f' + Date.now();
  S.frags.push({ id, text: pendingSel.text, ia: pendingIAD.ia, c: ia.c, bg: pendingIAD.bg, tc: pendingIAD.tc });
  try {
    const span = document.createElement('span');
    span.className = 'frag-hl';
    span.style.background = pendingIAD.bg;
    span.style.outline = `1px solid ${pendingIAD.c}55`;
    span.dataset.fid = id;
    pendingSel.range.surroundContents(span);
  } catch {}
  renderFrags();
  App.dismissSel();
  if (S.frags.length === 1) App.toggleComp(true);
  toast(`#${S.frags.length} · ${ia.name}`);
  save();
};

App.addFragWinner = () => { if (!pendingSel) return; App.clearFrags(); App.addFrag(); };
App.dismissSel = () => {
  document.getElementById('sel-popup').style.display = 'none';
  window.getSelection()?.removeAllRanges();
  pendingSel = null;
};

// ── FRAGMENTS ──────────────────────────────────────────────────────────────────
function renderFrags() {
  const cnt = S.frags.length;
  document.getElementById('fc-badge').textContent  = cnt;
  document.getElementById('tab-badge').textContent = cnt;
  document.getElementById('tab-badge').classList.toggle('show', cnt > 0);
  document.getElementById('tab-ico').textContent   = cnt > 0 ? `${cnt} frag${cnt !== 1 ? 's' : ''}` : 'compositor';

  const list = document.getElementById('frag-list');
  if (!cnt) {
    list.innerHTML = '<div class="f-empty" id="f-empty">Selecciona texto en<br>cualquier respuesta<br>para agregar fragmentos</div>';
    updatePreview();
    return;
  }

  list.innerHTML = S.frags.map((f, i) => `
    <div class="fitem" id="${f.id}" draggable="true"
      ondragstart="App._dragStart(event,'${f.id}')"
      ondragover="App._dragOver(event,'${f.id}')"
      ondrop="App._dragDrop(event,'${f.id}')"
      ondragend="App._dragEnd()">
      <div class="fhd">
        <div class="fnum" style="background:${f.bg};color:${f.c}">${i + 1}</div>
        <span class="ftag" style="background:${f.bg};color:${f.c}">${IA_DEFS.find(x=>x.id===f.ia)?.name ?? f.ia}</span>
        <button class="fdel" onclick="App.removeFrag('${f.id}')">✕</button>
      </div>
      <div class="ftxt">${esc(f.text)}</div>
    </div>`).join('');

  updatePreview();
}

App.removeFrag = (id) => {
  S.frags.splice(S.frags.findIndex(f => f.id === id), 1);
  const hl = document.querySelector(`[data-fid="${id}"]`);
  if (hl) { const p = hl.parentNode; while (hl.firstChild) p.insertBefore(hl.firstChild, hl); p.removeChild(hl); }
  renderFrags();
  save();
};

App._dragStart = (e, id) => { dragSrc = id; document.getElementById(id).style.opacity = '.35'; e.dataTransfer.effectAllowed = 'move'; };
App._dragOver  = (e, id) => { e.preventDefault(); document.getElementById(id).classList.add('dov'); };
App._dragDrop  = (e, id) => {
  e.preventDefault();
  if (id === dragSrc) return;
  const fi = S.frags.findIndex(f => f.id === dragSrc);
  const ti = S.frags.findIndex(f => f.id === id);
  const [m] = S.frags.splice(fi, 1);
  S.frags.splice(ti, 0, m);
  renderFrags();
  save();
};
App._dragEnd = () => { document.querySelectorAll('.fitem').forEach(el => { el.style.opacity = ''; el.classList.remove('dov'); }); dragSrc = null; };

App.reverseFrags = () => { S.frags.reverse(); renderFrags(); save(); toast('Orden invertido'); };
App.clearFrags   = () => {
  S.frags.length = 0;
  document.querySelectorAll('.frag-hl').forEach(hl => { const p = hl.parentNode; while (hl.firstChild) p.insertBefore(hl.firstChild, hl); p.removeChild(hl); });
  renderFrags();
  save();
};

function updatePreview() {
  document.getElementById('prev-box').textContent = S.frags.length
    ? S.frags.map((f, i) => `[${i + 1}·${IA_DEFS.find(x=>x.id===f.ia)?.name}] ${f.text}`).join('\n\n')
    : '';
}

// ── COMMIT ─────────────────────────────────────────────────────────────────────
App.doCommit = () => {
  const text = (document.getElementById('prev-box').textContent || S.frags.map(f => f.text).join(' ')).trim();
  if (!text) { toast('Agrega fragmentos primero'); return; }

  const type = document.getElementById('commit-type').value;
  const ias  = [...new Set(S.frags.map(f => IA_DEFS.find(x=>x.id===f.ia)?.name).filter(Boolean))];
  if (!ias.length) ias.push(...Object.keys(S.active).map(id => IA_DEFS.find(x=>x.id===id)?.name).filter(Boolean));

  const hash = generateHash(text);
  S.commits.unshift({ hash, type, text, ias, time: Date.now(), frags: S.frags.length, mode: S.frags.length > 1 ? 'fusión' : 'selección' });
  if (S.frags.length > 1) S.fuseCount++;

  App.clearFrags();
  document.getElementById('prev-box').textContent = '';
  App.toggleComp(false);
  updateStats(); renderHist(); renderTimeline();
  save();
  toast(`Commit ${hash.slice(0, 7)} · ${type}`);
};

// ── DEBATE ─────────────────────────────────────────────────────────────────────
const DEBATE_LINES = [
  ['Inmutabilidad es el diferenciador clave — sin ella es solo Notion con IA.', 'L'],
  ['Discrepo: sin síntesis activa solo acumulas deuda cognitiva.', 'R'],
  ['Propongo: commits borradores privados + commits sellados inmutables.', 'L'],
  ['Sellar equivale a consolidación de memoria en sueño REM.', 'R'],
  ['El valor emerge en la reactivación futura, no en la creación.', 'L'],
  ['La trazabilidad del razonamiento tiene valor legal sin explotar.', 'R'],
];

App.startDebate = async () => {
  const topic   = document.getElementById('chat-inp').value.trim();
  const actives = Object.keys(S.active);
  if (!topic)            { toast('Escribe el tema del debate'); return; }
  if (actives.length < 2) { toast('Activa 2+ IAs para debatir'); return; }

  const thread = document.getElementById('dthread');
  thread.innerHTML = '';
  S.debateCount++;

  const hdr = document.createElement('div');
  hdr.style.cssText = 'text-align:center;font-size:9px;color:var(--text3);padding:3px 0 10px;border-bottom:0.5px solid var(--border);margin-bottom:6px';
  hdr.textContent = `"${topic.slice(0, 70)}"`;
  thread.appendChild(hdr);

  const rounds = Math.min(actives.length * 2, 6);
  for (let i = 0; i < rounds; i++) {
    await sleep(700 + Math.random() * 500);
    const ia = IA_DEFS.find(x => x.id === actives[i % actives.length]);
    const dl = DEBATE_LINES[i % DEBATE_LINES.length];
    let txt  = dl[0];

    if (ia.id === 'claude') {
      try { txt = await dispatch('claude', `Debate: "${topic}". Ronda ${i+1}. Tu postura en máx 35 palabras.`, { history: [] }); }
      catch {}
    }

    const msg = document.createElement('div');
    msg.className = `dmsg ${dl[1]}`;
    if (dl[1] === 'R') msg.style.background = ia.bg;
    msg.innerHTML = `<div class="dm-lbl" style="color:${ia.c}">${ia.name}</div><div class="dm-txt">${esc(txt)}</div>`;
    thread.appendChild(msg);
    thread.scrollTop = thread.scrollHeight;
  }

  updateStats();
  save();
  toast('Debate completo · escribe la conclusión abajo');
};

App.commitDebate = () => {
  const text = document.getElementById('debate-synth').textContent.trim();
  if (!text) { toast('Escribe la conclusión del debate'); return; }
  const hash = generateHash(text);
  S.commits.unshift({ hash, type: 'insight', text, ias: Object.keys(S.active).map(id => IA_DEFS.find(x=>x.id===id)?.name).filter(Boolean), time: Date.now(), frags: 0, mode: 'debate' });
  document.getElementById('debate-synth').textContent = '';
  updateStats(); renderHist(); renderTimeline();
  save();
  toast(`Commit ${hash.slice(0, 7)} · debate`);
};

// ── TIMELINE ───────────────────────────────────────────────────────────────────
function renderTimeline() {
  const el = document.getElementById('tl-commits');
  document.getElementById('tl-empty').style.display = S.commits.length ? 'none' : 'flex';
  el.innerHTML = S.commits.map(c => {
    const t   = new Date(c.time);
    const ts  = t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0');
    const col = TYPE_COLORS[c.type] ?? '#888';
    return `<div class="tl-row">
      <div class="tl-time">${ts}</div>
      <div class="tl-node"><div class="tl-dot" style="background:${col}"></div></div>
      <div class="tl-card">
        <div class="tl-top">
          <div class="tl-title">${esc(c.text.slice(0, 60))}${c.text.length > 60 ? '…' : ''}</div>
          <div class="tl-hash">${c.hash.slice(0, 7)}</div>
        </div>
        <div class="tl-meta">
          <span class="tl-badge" style="background:${col}18;color:${col}">${c.type}</span>
          ${c.mode ? `<span class="tl-badge">${c.mode}</span>` : ''}
          <span class="tl-badge">${c.ias?.join(', ') ?? '—'}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── BUBBLEMAP ──────────────────────────────────────────────────────────────────
function buildBubbles() {
  const canvas = document.getElementById('bcanvas');
  const W = canvas.clientWidth || 400, H = canvas.clientHeight || 300;
  const groups = {};
  S.commits.forEach(c => { const k = c.type || 'idea'; (groups[k] ??= []).push(c); });
  bubbles = [];

  Object.keys(groups).forEach((key, gi, arr) => {
    const angle = (gi / Math.max(arr.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const rad   = Math.min(W, H) * .27;
    const cx    = W / 2 + Math.cos(angle) * rad;
    const cy    = H / 2 + Math.sin(angle) * rad;
    const cr    = Math.min(48 + groups[key].length * 9, 80);
    const col   = TYPE_COLORS[key] ?? '#888';
    bubbles.push({ type: 'cluster', label: key, x: cx, y: cy, r: cr, count: groups[key].length, col });
    groups[key].forEach((c, ii) => {
      const a2 = (ii / groups[key].length) * Math.PI * 2;
      bubbles.push({ type: 'commit', label: c.text.slice(0, 14), x: cx + Math.cos(a2)*cr*.62, y: cy + Math.sin(a2)*cr*.62, r: 11, col, full: c.text });
    });
  });
}

function drawBubbles() {
  const canvas = document.getElementById('bcanvas');
  if (!canvas?.clientWidth) return;
  const dpr  = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx  = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const { scale, ox, oy } = S.bState;
  const dark = window.matchMedia('(prefers-color-scheme:dark)').matches;

  if (!S.commits.length) {
    ctx.fillStyle = dark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.2)';
    ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Haz commits para ver el mapa de ideas', W / 2, H / 2);
    return;
  }

  ctx.save();
  ctx.translate(W / 2 + ox, H / 2 + oy);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -H / 2);

  bubbles.filter(b => b.type === 'cluster').forEach(cl => {
    bubbles.filter(b => b.type === 'commit').forEach(cb => {
      if (Math.hypot(cb.x - cl.x, cb.y - cl.y) < cl.r * 1.2) {
        ctx.beginPath(); ctx.moveTo(cl.x, cl.y); ctx.lineTo(cb.x, cb.y);
        ctx.strokeStyle = dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)';
        ctx.lineWidth = 0.5; ctx.stroke();
      }
    });
  });

  bubbles.filter(b => b.type === 'cluster').forEach(b => {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.col + '18'; ctx.fill();
    ctx.strokeStyle = b.col + '55'; ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = b.col; ctx.font = '500 11px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x, b.y - 4);
    ctx.fillStyle = dark ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.3)';
    ctx.font = '9px system-ui';
    ctx.fillText(`${b.count} commit${b.count !== 1 ? 's' : ''}`, b.x, b.y + 8);
  });

  bubbles.filter(b => b.type === 'commit').forEach(b => {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.col + '20'; ctx.fill();
    ctx.strokeStyle = b.col + '77'; ctx.lineWidth = 0.5; ctx.stroke();
    if (scale > 0.85) {
      ctx.fillStyle = dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)';
      ctx.font = '8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label.slice(0, 10), b.x, b.y);
    }
  });

  ctx.restore();
  ctx.fillStyle = dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.25)';
  ctx.font = '9px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`zoom ${scale.toFixed(1)}x`, 10, 14);
}

// ── STATS & HIST ───────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('st-c').textContent   = S.commits.length;
  document.getElementById('st-f').textContent   = S.fuseCount;
  document.getElementById('st-d').textContent   = S.debateCount;
  document.getElementById('tb-hint').textContent = `${S.commits.length} commit${S.commits.length !== 1 ? 's' : ''}`;
  if (S.commits[0]) document.getElementById('chain-hash').textContent = `${S.commits[0].type} · ${S.commits[0].hash.slice(0, 8)}`;
}

function renderHist() {
  document.getElementById('hist-list').innerHTML = S.commits.slice(0, 5).map(c => `
    <div class="hist-row" onclick="App.setScreen('timeline')">
      <div class="hist-av"><div class="hist-dot" style="background:${TYPE_COLORS[c.type] ?? '#888'}"></div></div>
      <div class="hist-label sb-reveal">
        ${esc(c.text.slice(0, 30))}${c.text.length > 30 ? '…' : ''}
        <div class="hist-sub">${c.hash.slice(0, 6)} · ${c.type}</div>
      </div>
    </div>`).join('');
}

// ── SCREEN ─────────────────────────────────────────────────────────────────────
function setScreen(s) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('on'));
  document.querySelectorAll('.tbt').forEach(el => el.classList.toggle('on', el.dataset.screen === s));
  document.getElementById(`screen-${s}`).classList.add('on');
  if (s === 'bubbles')  { buildBubbles(); setTimeout(drawBubbles, 50); }
  if (s === 'timeline') renderTimeline();
}
App.setScreen = setScreen;

// ── CLEAR DATA ─────────────────────────────────────────────────────────────────
App.clearAllData = async () => {
  if (!confirm('¿Borrar todos los commits y datos? Esta acción es irreversible.')) return;
  await storeClearAll();
  S.commits = []; S.frags = []; S.active = { claude: true }; S.keys = {};
  S.fuseCount = 0; S.debateCount = 0;
  renderAll();
  setPersist('idle');
  toast('Datos borrados · chain reiniciada');
};

// ── EVENTS ─────────────────────────────────────────────────────────────────────
function initEvents() {
  // Tab navigation
  document.querySelectorAll('.tbt').forEach(btn => {
    btn.addEventListener('click', () => setScreen(btn.dataset.screen));
  });

  // Chat input auto-resize + enter
  const chatInp = document.getElementById('chat-inp');
  chatInp.addEventListener('input', () => {
    chatInp.style.height = 'auto';
    chatInp.style.height = Math.min(chatInp.scrollHeight, 120) + 'px';
  });
  chatInp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const active = document.querySelector('.tbt.on')?.dataset?.screen;
      if (active === 'debate') App.startDebate();
      else App.sendAll();
    }
  });

  // Selection popup
  document.addEventListener('mouseup', e => {
    const popup = document.getElementById('sel-popup');
    if (popup.contains(e.target)) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 3) {
      popup.style.display = 'none'; return;
    }
    let node = sel.anchorNode, bodyEl = null;
    while (node && node !== document.body) {
      if (node.nodeType === 1 && node.classList?.contains('rbody')) { bodyEl = node; break; }
      node = node.parentNode;
    }
    if (!bodyEl) { popup.style.display = 'none'; return; }

    pendingSel  = { text: sel.toString().trim(), range: sel.getRangeAt(0).cloneRange() };
    pendingIAD  = { ia: bodyEl.dataset.ia, c: bodyEl.dataset.c, bg: bodyEl.dataset.bg, tc: bodyEl.dataset.tc };
    const rect  = sel.getRangeAt(0).getBoundingClientRect();
    popup.style.display = 'flex';
    popup.style.left    = Math.max(4, rect.left)  + 'px';
    popup.style.top     = Math.max(4, rect.top - 44) + 'px';
  });

  document.addEventListener('mousedown', e => {
    const popup = document.getElementById('sel-popup');
    if (!popup.contains(e.target)) {
      setTimeout(() => { if (!window.getSelection()?.toString().trim()) popup.style.display = 'none'; }, 60);
    }
  });

  // Resize handle
  const rz = document.getElementById('rz');
  let rzDrag = false, rzSX = 0, rzSW = 0;
  rz.addEventListener('mousedown', e => {
    rzDrag = true; rzSX = e.clientX;
    rzSW = document.getElementById('comp-wrap').offsetWidth;
    rz.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!rzDrag) return;
    const nw = Math.max(32, Math.min(480, rzSW + (rzSX - e.clientX)));
    const cw = document.getElementById('comp-wrap');
    cw.style.width = nw + 'px';
    cw.style.transition = 'none';
    if (nw > 60 && !S.compOpen)  { S.compOpen = true;  cw.classList.add('open'); }
    if (nw <= 32 && S.compOpen)  { S.compOpen = false; cw.classList.remove('open'); }
  });
  document.addEventListener('mouseup', () => {
    if (!rzDrag) return; rzDrag = false;
    rz.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.getElementById('comp-wrap').style.transition = 'width .22s cubic-bezier(.4,0,.2,1)';
  });

  // Bubble canvas events
  const canvas = document.getElementById('bcanvas');
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    S.bState.scale = Math.max(.2, Math.min(4, S.bState.scale * (e.deltaY > 0 ? .88 : 1.13)));
    drawBubbles();
  }, { passive: false });
  canvas.addEventListener('mousedown', e => { S.bState.drag = true; S.bState.lx = e.clientX; S.bState.ly = e.clientY; });
  canvas.addEventListener('mousemove', e => {
    if (S.bState.drag) {
      S.bState.ox += e.clientX - S.bState.lx; S.bState.oy += e.clientY - S.bState.ly;
      S.bState.lx = e.clientX; S.bState.ly = e.clientY;
      drawBubbles();
    }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { scale, ox, oy } = S.bState;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const wx = (mx - W/2 - ox) / scale + W/2;
    const wy = (my - H/2 - oy) / scale + H/2;
    const hit = bubbles.find(b => Math.hypot(wx - b.x, wy - b.y) < b.r);
    const tip = document.getElementById('b-tip');
    if (hit) { tip.style.opacity='1'; tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY-8)+'px'; tip.textContent=hit.full??hit.label; }
    else tip.style.opacity = '0';
  });
  canvas.addEventListener('mouseup', () => S.bState.drag = false);

  // Window resize — redraw bubbles
  window.addEventListener('resize', () => {
    if (document.getElementById('screen-bubbles').classList.contains('on')) {
      buildBubbles(); drawBubbles();
    }
  });
}

// ── TOAST ──────────────────────────────────────────────────────────────────────
function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── START ──────────────────────────────────────────────────────────────────────
boot();
