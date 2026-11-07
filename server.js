'use strict';
const express = require('express');
const http = require('node:http');
const path = require('node:path');
const { Server } = require('socket.io');
const { Store, SESSION_MS } = require('./persistence/store');
const { World, CFG } = require('./game/world');
const cookieToken = req => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('session='))?.slice(8);

async function createGame(options = {}) {
  const production = process.env.NODE_ENV === 'production';
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  if (production && !databaseUrl && !options.store) throw new Error('DATABASE_URL is required in production.');
  const store = options.store || await new Store().init({ databaseUrl, filename: options.filename || process.env.SQLITE_PATH });
  const world = new World(options.random);
  const app = express();
  app.disable('x-powered-by');
  const server = http.createServer(app);
  const sameOrigin = req => {
    if (!req.headers.origin) return true;
    try { return new URL(req.headers.origin).host === req.headers.host; } catch { return false; }
  };
  const io = new Server(server, { maxHttpBufferSize: 2048, allowRequest: (req, callback) => callback(null, sameOrigin(req)) });
  let tail = Promise.resolve(), stopping = false, storageHealthy = true, tickPending = false;
  const serial = fn => { const job = tail.then(fn); tail = job.catch(() => {}); return job; };
  const clients = new Map();
  const attempts = new Map();
  app.use(express.json({ limit: '2kb' }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'GET' && !sameOrigin(req)) return res.status(403).json({ error: 'Neplatný pôvod požiadavky.' });
    next();
  });
  app.post('/api/auth/:mode', async (req, res) => {
    if (!['login', 'register'].includes(req.params.mode)) return res.sendStatus(404);
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const attempt = attempts.get(ip) || { count: 0, until: now + 60000 };
    if (++attempt.count > 10 || attempts.size > 10000) return res.status(429).json({ error: 'Priveľa pokusov. Skús to o minútu.' });
    attempts.set(ip, attempt);
    try {
      const auth = await store.authenticate(req.body?.username, req.body?.password, req.params.mode === 'register');
      await serial(async () => { const old = clients.get(auth.id); if (old) old.disconnect(true); });
      res.cookie('session', auth.token, { httpOnly: true, sameSite: 'strict', secure: production, maxAge: SESSION_MS, path: '/' });
      res.json({ id: auth.id, name: auth.name });
    } catch (err) {
      const expected = /Meno:|obsadené|Nesprávne/.test(err.message);
      if (!expected) console.error('Authentication storage failure', err);
      res.status(expected ? 400 : 503).json({ error: expected ? err.message : 'Úložisko je nedostupné. Skús to neskôr.' });
    }
  });
  app.get('/api/me', async (req, res) => {
    try { const s = await store.session(cookieToken(req)); res.status(s ? 200 : 401).json(s ? { id: s.id, name: s.name } : { error: 'Prihlás sa.' }); }
    catch { res.status(503).json({ error: 'Úložisko je nedostupné.' }); }
  });
  app.post('/api/logout', async (req, res) => {
    try {
      const token = cookieToken(req); const s = await store.session(token);
      if (s) { await store.logout(token); await serial(async () => clients.get(s.id)?.disconnect(true)); }
      res.clearCookie('session', { path: '/', httpOnly: true, sameSite: 'strict', secure: production }); res.json({ ok: true });
    } catch { res.status(503).json({ error: 'Odhlásenie zlyhalo. Skús to znova.' }); }
  });
  app.get('/health', (_, res) => res.status(storageHealthy && !stopping ? 200 : 503).json({ ok: storageHealthy && !stopping, players: clients.size }));
  app.use(express.static(path.join(__dirname, 'public')));
  function broadcast() { for (const [id, socket] of clients) socket.emit('state', world.state(id)); }
  async function durable(fn) {
    const before = world.snapshot();
    try { const result = fn(); await store.save(Object.values(world.players)); storageHealthy = true; return result; }
    catch (err) { world.restore(before); storageHealthy = false; throw err; }
  }
  io.on('connection', socket => {
    let id, ready = false, budget = 0, windowStart = Date.now(), queued = 0;
    const token = cookieToken(socket.request);
    serial(async () => {
      if (stopping || !socket.connected) return socket.disconnect(true);
      const session = await store.session(token);
      if (!session) { socket.emit('authRequired'); return socket.disconnect(true); }
      id = session.id;
      if (clients.has(id)) { socket.emit('serverMessage', 'Postava už hrá v inom okne.'); return socket.disconnect(true); }
      if (clients.size >= 100) { socket.emit('serverMessage', 'Svet je plný.'); return socket.disconnect(true); }
      const p = await store.load(id);
      if (!socket.connected) return;
      world.join(p); clients.set(id, socket); ready = true;
      socket.data.expiresAt = Number(session.expires_at);
      socket.emit('state', world.state(id));
    }).catch(err => { console.error('Join failed', err); socket.emit('serverMessage', 'Postavu sa nepodarilo načítať. Skús obnoviť pripojenie.'); socket.disconnect(true); });
    for (const event of ['move', 'attack', 'setStyle', 'item']) socket.on(event, (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (!ready || !socket.connected || stopping) return reply({ ok: false, error: 'Pripojenie ešte nie je pripravené.' });
      if (Date.now() - windowStart > 1000) { budget = 0; windowStart = Date.now(); }
      if (++budget > 20 || queued >= 8) return reply({ ok: false, error: 'Príliš veľa akcií.' });
      queued++;
      serial(async () => {
        if (clients.get(id) !== socket || !socket.connected) return reply({ ok: false, error: 'Pripojenie skončilo.' });
        if (Date.now() >= socket.data.expiresAt) { socket.emit('authRequired'); socket.disconnect(true); return; }
        const before = world.snapshot();
        try { world.command(id, event, payload); }
        catch (err) { world.restore(before); return reply({ ok: false, error: err.message }); }
        try {
          await store.save(Object.values(world.players)); storageHealthy = true;
          reply({ ok: true }); socket.emit('state', { ...world.state(id), events: [] });
        } catch (err) {
          world.restore(before); storageHealthy = false; console.error('Save failed', err);
          reply({ ok: false, error: 'Uloženie zlyhalo. Akcia nebola potvrdená, skús ju znova.' });
        }
      }).catch(err => console.error('Command failed', err)).finally(() => queued--);
    });
    socket.on('disconnect', () => {
      serial(async () => {
        if (clients.get(id) !== socket) return;
        // Every acknowledged action and published tick is already committed.
        clients.delete(id); world.leave(id); broadcast();
      }).catch(err => console.error('Disconnect failed', err));
    });
  });
  const tick = () => serial(async () => {
    if (stopping || !clients.size) return;
    for (const socket of clients.values()) if (Date.now() >= socket.data.expiresAt) { socket.emit('authRequired'); socket.disconnect(true); }
    try { await durable(() => world.tick(Date.now())); broadcast(); }
    catch (err) { console.error('Tick paused: database unavailable', err); io.emit('serverMessage', 'Hra je pozastavená: úložisko je nedostupné.'); }
  });
  const timer = options.manualTicks ? null : setInterval(() => {
    if (tickPending) return; tickPending = true;
    tick().catch(err => console.error(err)).finally(() => { tickPending = false; });
  }, CFG.tick);
  async function close() {
    stopping = true; if (timer) clearInterval(timer);
    await tail; await new Promise(resolve => io.close(resolve)); await tail; await store.close();
  }
  return { app, server, io, world, store, tick, close };
}
if (require.main === module) createGame().then(game => {
  game.server.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => console.log('MiniScape ready'));
  let closing = false;
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { if (!closing) { closing = true; game.close().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); }); } });
}).catch(err => { console.error(err); process.exitCode = 1; });
module.exports = { createGame };
