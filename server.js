// Leak Gossip : serveur de jeu (Node.js 18+, aucune dépendance). Temps réel via Server-Sent Events.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000, K = +process.env.TCH_SPEED || 1; // TCH_SPEED=10 accélère les minuteurs (tests uniquement)
const MIN = 4, MAX = 36, MAX_ROOMS = 800;
// Durées en secondes : [avec 4 joueurs, avec 36 joueurs], proportionnelles au nombre de joueurs connectés
const DUR = { draw: [60, 90], write: [60, 120], vote: [25, 60], res: [60, 330] };
const SHORT_RES = 8; // quand rien n’est révélé (secret gardé ou texte vide), on n’attend pas
const dur = (s, ph) => {
  if (!DUR[ph]) return 0;
  const [a, b] = DUR[ph], f = Math.min(1, Math.max(0, (live(s).length - MIN) / (MAX - MIN)));
  return Math.round(a + (b - a) * f);
};
const rooms = new Map();
const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clean = (t, n) => String(t || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const live = s => [...s.pl.values()].filter(p => p.res);
const CONS = 'bcdfghjklmnprstvz', VOW = 'aeiou';
function newCode() { // 7 caractères prononçables, ex. Bimapo4 (plus de 6 millions de codes)
  let c = ''; for (let i = 0; i < 3; i++) c += CONS[crypto.randomInt(CONS.length)] + VOW[crypto.randomInt(VOW.length)];
  return c[0].toUpperCase() + c.slice(1) + (1 + crypto.randomInt(9));
}
const MODES_ON = ['gossip']; // les autres modes seront ajoutés ici au fur et à mesure
function mkRoom() {
  if (rooms.size >= MAX_ROOMS) return null;
  let c; do c = newCode(); while (rooms.has(c.toLowerCase()));
  const s = { code: c, pl: new Map(), tk: new Map(), n: 0, host: null, phase: 'lobby', mode: 'gossip', round: 0, rounds: 10, sub: {}, vote: {}, cur: null, q: [], log: [], tg: {}, dl: 0, t: null, seen: Date.now() };
  rooms.set(c.toLowerCase(), s); return s;
}
// id = identifiant public (vu par tous) ; tok = jeton secret du joueur (jamais diffusé), il sert à s’authentifier
function addPl(s, name) {
  const p = { id: 'p' + (++s.n), tok: crypto.randomBytes(12).toString('hex'), name: clean(name, 14) || 'Joueur', face: null, res: null };
  s.pl.set(p.id, p); s.tk.set(p.tok, p); return p;
}
// Ce que chaque joueur a le droit de voir (les secrets ne sortent jamais du serveur avant le bon moment)
function view(s, id) {
  const ph = s.phase, c = s.cur, nm = i => s.pl.get(i) ? s.pl.get(i).name : '';
  let cur = null;
  if (c && ['write', 'vote', 'res'].includes(ph)) {
    const role = id === c.w ? 'writer' : id === c.t ? 'target' : ph === 'vote' && c.voters.includes(id) ? 'voter' : 'other';
    const shown = ph === 'res' && c.out === 'shown';
    cur = { w: c.w, role, out: ph === 'res' ? c.out : null,
      tg: role === 'writer' || role === 'voter' || shown ? { id: c.t, name: nm(c.t) } : null,
      text: role === 'voter' || shown ? c.text : null };
  }
  return {
    code: s.code, phase: ph, mode: s.mode, round: s.round, rounds: s.rounds, dl: s.dl, now: Date.now(), host: s.host, you: id,
    players: [...s.pl.values()].map(p => ({ id: p.id, name: p.name, face: p.face, on: !!p.res, done: ph === 'draw' && p.id in s.sub })),
    mine: ph === 'vote' ? id in s.vote : id in s.sub, cur,
    target: ph === 'draw' && s.tg[id] ? nm(s.tg[id]) : null,
    log: ph === 'final' ? s.log.map(x => ({ t: x.t, by: nm(x.by), to: nm(x.to) })) : null
  };
}
function push(s) { for (const p of s.pl.values()) if (p.res) { try { p.res.write('data:' + JSON.stringify(view(s, p.id)) + '\n\n'); } catch (e) { p.res = null; } } }
function go(s, ph) {
  clearTimeout(s.t); s.phase = ph; s.sub = {}; s.vote = {}; s.pst = Date.now();
  const sec = ph === 'res' && s.cur && s.cur.out !== 'shown' ? SHORT_RES : dur(s, ph);
  s.dl = sec ? Date.now() + sec * 1000 / K : 0;
  if (sec) s.t = setTimeout(() => adv(s), sec * 1000 / K);
  push(s);
}
function startRound(s) { // un écrivain (chacun son tour) et une cible tirée au sort
  const L = live(s).map(p => p.id); let w;
  while (s.q.length) { const c = s.q.shift(); if (L.includes(c)) { w = c; break; } }
  if (!w) { s.q = shuf([...L]); w = s.q.shift(); }
  const o = L.filter(i => i !== w);
  s.cur = { w, t: o[Math.random() * o.length | 0], text: '', voters: [], out: null };
  go(s, 'write');
}
function adv(s) {
  clearTimeout(s.t); const ph = s.phase, c = s.cur;
  if (ph === 'draw') return startRound(s);
  if (ph === 'write') {
    c.text = s.sub[c.w] || '';
    const el = live(s).map(p => p.id).filter(i => i !== c.w && i !== c.t);
    if (!c.text || !el.length) { c.out = 'skip'; return go(s, 'res'); }
    c.voters = shuf(el).slice(0, Math.min(el.length, Math.max(2, Math.round(live(s).length / 3))));
    return go(s, 'vote');
  }
  if (ph === 'vote') { // révélé seulement si la majorité des votants le demande (égalité = secret)
    const y = Object.entries(s.vote).filter(([i, v]) => v === 1 && c.voters.includes(i)).length;
    c.out = y * 2 > c.voters.length ? 'shown' : 'hidden';
    if (c.out === 'shown') s.log.push({ t: c.text, by: c.w, to: c.t });
    return go(s, 'res');
  }
  if (ph === 'res') { if (s.round < s.rounds) { s.round++; return startRound(s); } return go(s, 'final'); }
}
function chk(s) { // passe à l’étape suivante dès que tout le monde a fait son action
  const ph = s.phase, L = live(s);
  if (ph === 'draw') { if (L.length && L.every(p => p.id in s.sub)) adv(s); }
  else if (ph === 'write') { const w = s.pl.get(s.cur.w); if (!w.res || s.cur.w in s.sub) adv(s); }
  else if (ph === 'vote') { if (s.cur.voters.map(i => s.pl.get(i)).filter(p => p.res).every(p => p.id in s.vote)) adv(s); }
}
function act(s, p, t, d) {
  const ph = s.phase;
  if (t === 'start' && ph === 'lobby' && s.host === p.id && live(s).length >= MIN) {
    s.round = 1; s.rounds = Math.min(40, Math.max(3, +d.rounds || 10)); s.q = []; s.log = [];
    const o = shuf(live(s)); o.forEach((x, i) => { x.face = null; s.tg[x.id] = o[(i + 1) % o.length].id; });
    return go(s, 'draw');
  }
  if (t === 'skip' && s.host === p.id && ['draw', 'write', 'vote', 'res'].includes(ph)) { // l’hôte peut passer le compte à rebours
    if (Date.now() - s.pst < 700) return; // évite de sauter deux étapes d’un double clic
    return adv(s);
  }
  if (t === 'again' && ph === 'final' && s.host === p.id) { s.pl.forEach(x => { x.face = null; }); return go(s, 'lobby'); }
  if (t === 'face' && ph === 'draw' && s.tg[p.id] && !(p.id in s.sub) && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+\/=]+$/.test(d.v || '') && d.v.length < 60000) { s.sub[p.id] = 1; s.pl.get(s.tg[p.id]).face = d.v; }
  else if (t === 'text' && ph === 'write' && p.id === s.cur.w && !(p.id in s.sub)) s.sub[p.id] = clean(d.v, 200);
  else if (t === 'vote' && ph === 'vote' && s.cur.voters.includes(p.id) && !(p.id in s.vote)) s.vote[p.id] = d.v ? 1 : 0;
  else return;
  push(s); chk(s);
}

const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/game.js': ['game.js', 'text/javascript; charset=utf-8'],
  '/icone-tchatche.svg': ['icone-tchatche.svg', 'image/svg+xml'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json']
};
const STATIC = {}; for (const [u, [f, t]] of Object.entries(FILES)) STATIC[u] = { body: fs.readFileSync(path.join(__dirname, 'public', f)), type: t };
const SEC = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
const hits = new Map(); // limitation de débit par adresse IP
const over = (k, max, win) => (hits.get(k) || []).filter(t => Date.now() - t < win).length >= max;
const add = k => { const a = hits.get(k) || []; a.push(Date.now()); hits.set(k, a.slice(-1000)); };

const server = http.createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x'), ip = String(q.headers['x-forwarded-for'] || q.socket.remoteAddress || '').split(',')[0].trim();
  const send = (c, o) => { if (r.headersSent) return; r.writeHead(c, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SEC }); r.end(JSON.stringify(o)); };
  r.on('error', () => {});
  try {
    if (q.method === 'GET' && u.pathname === '/health') { r.writeHead(200, { 'Content-Type': 'text/plain' }); return r.end('ok'); }
    if (q.method === 'GET' && (u.pathname === '/robots.txt' || u.pathname === '/sitemap.xml')) {
      const h = String(q.headers.host || ''), host = /^[a-z0-9.-]+(:\d+)?$/i.test(h) ? h : 'localhost', proto = q.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http', base = proto + '://' + host;
      r.writeHead(200, { 'Content-Type': u.pathname === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8', ...SEC });
      return r.end(u.pathname === '/robots.txt' ? 'User-agent: *\nAllow: /\nSitemap: ' + base + '/sitemap.xml\n'
        : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + base + '/</loc></url></urlset>\n');
    }
    if (q.method === 'GET' && !u.pathname.startsWith('/api/')) {
      const f = STATIC[u.pathname] || STATIC['/'];
      r.writeHead(STATIC[u.pathname] ? 200 : 404, { 'Content-Type': f.type, 'Cache-Control': 'no-cache', ...SEC }); return r.end(f.body);
    }
    if (q.method === 'GET' && u.pathname === '/api/events') {
      const s = rooms.get((u.searchParams.get('code') || '').toLowerCase()), p = s && s.tk.get(u.searchParams.get('id'));
      if (!p) { r.writeHead(404, SEC); return r.end(); }
      r.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', ...SEC });
      if (p.res) p.res.end(); p.res = r; s.seen = Date.now(); push(s);
      q.on('close', () => { if (p.res === r) { p.res = null; push(s); chk(s); } }); return;
    }
    if (q.method === 'POST') {
      if (over('req' + ip, 900, 60000)) return send(429, { error: 'Trop de requêtes. Réessaie dans un instant.' }); add('req' + ip);
      let b = ''; for await (const c of q) { b += c; if (b.length > 1e5) return send(413, { error: 'Message trop gros.' }); }
      const d = JSON.parse(b || '{}'); if (!d || typeof d !== 'object') return send(400, { error: 'Requête invalide.' });
      if (u.pathname === '/api/create') {
        if (over('mk' + ip, 20, 600000)) return send(429, { error: 'Trop de parties créées. Réessaie dans quelques minutes.' });
        const s = mkRoom(); if (!s) return send(503, { error: 'Le site est complet pour le moment. Réessaie bientôt.' });
        add('mk' + ip); if (MODES_ON.includes(d.mode)) s.mode = d.mode; const p = addPl(s, d.name); s.host = p.id; return send(200, { code: s.code, id: p.tok });
      }
      if (over('bad' + ip, 40, 600000)) return send(429, { error: 'Trop d’essais. Réessaie dans quelques minutes.' });
      const s = rooms.get(String(d.code || '').toLowerCase()); if (!s) { add('bad' + ip); return send(404, { error: 'Code inconnu.' }); }
      s.seen = Date.now();
      if (u.pathname === '/api/join') {
        if (s.phase !== 'lobby') return send(409, { error: 'La partie a déjà commencé.' });
        if (s.pl.size >= MAX) return send(409, { error: 'Salon plein (36 joueurs maximum).' });
        const p = addPl(s, d.name); push(s); return send(200, { code: s.code, id: p.tok });
      }
      if (u.pathname === '/api/act') { const p = s.tk.get(String(d.id)); if (!p) { add('bad' + ip); return send(403, { error: 'Joueur inconnu.' }); } act(s, p, String(d.type), d.data && typeof d.data === 'object' ? d.data : {}); return send(200, { ok: 1 }); }
    }
    r.writeHead(404, SEC); r.end();
  } catch (x) { send(400, { error: 'Requête invalide.' }); }
});
server.listen(PORT, () => console.log('Leak Gossip sur http://localhost:' + PORT));

setInterval(() => rooms.forEach(s => s.pl.forEach(p => { try { p.res && p.res.write(': ping\n\n'); } catch (e) { p.res = null; } })), 20000);
setInterval(() => { hits.clear(); rooms.forEach((s, k) => { if (Date.now() - s.seen > 3 * 3600e3 && !live(s).length) { clearTimeout(s.t); rooms.delete(k); } }); }, 600000);
process.on('uncaughtException', e => console.error('Erreur inattendue :', e));
process.on('SIGTERM', () => { server.close(); process.exit(0); });
