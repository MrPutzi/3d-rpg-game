'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { io } = require('socket.io-client');
const { createGame } = require('../server');
const { Store } = require('../persistence/store');
const wait = (socket, event) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, handler); reject(new Error('Timeout: ' + event)); }, 4000);
  function handler(data) { clearTimeout(timer); resolve(data); }
  socket.once(event, handler);
});
async function start(options) { const g = await createGame({ manualTicks: true, ...options }); await new Promise(r => g.server.listen(0, '127.0.0.1', r)); g.url = 'http://127.0.0.1:' + g.server.address().port; return g; }
async function auth(g, username, mode = 'register', password = 'long-password-123') {
  const response = await fetch(g.url + '/api/auth/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], data: await response.json() };
}
function connect(g, cookie) { return io(g.url, { autoConnect: false, reconnection: false, extraHeaders: { Cookie: cookie || '' }, transports: ['websocket'] }); }
async function joinGame(g, cookie) { const s = connect(g, cookie); const p = wait(s, 'state'); s.connect(); return { socket: s, state: await p }; }
const command = (s, event, data) => new Promise((resolve, reject) => s.timeout(4000).emit(event, data, (err, ack) => err ? reject(err) : resolve(ack)));
test('account, XP, equipment and inventory survive reconnect and a full process/store restart', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'miniscape-')); const filename = join(dir, 'test.sqlite');
  let g = await start({ filename }); t.after(async () => { await g.close(); await rm(dir, { recursive: true, force: true }); });
  const user = await auth(g, 'alice'); assert.equal(user.status, 200);
  let { socket, state } = await joinGame(g, user.cookie); const id = state.me.id;
  assert.equal((await command(socket, 'item', { actionId: 'equip-bow-123', action: 'equip', item: 'bow' })).ok, true);
  g.world.players[id].skills.attack.xp = 400; await g.store.save(Object.values(g.world.players));
  const disconnected = wait(socket, 'disconnect'); socket.disconnect(); await disconnected;
  await g.close(); g = await start({ filename });
  ({ socket, state } = await joinGame(g, user.cookie)); t.after(() => socket.disconnect());
  assert.equal(state.me.id, id); assert.equal(state.me.skills.attack.xp, 400); assert.equal(state.me.equipment.weapon, 'bow');
  assert.equal(state.me.inventory.bread, 3);
  const duplicate = connect(g, user.cookie), rejected = wait(duplicate, 'serverMessage'); duplicate.connect();
  assert.match(await rejected, /inom okne/); duplicate.disconnect();
  const wrong = await auth(g, 'alice', 'login', 'incorrect-password'); assert.equal(wrong.status, 400);
  const response = await fetch(g.url + '/api/logout', { method: 'POST', headers: { Cookie: user.cookie, 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(response.status, 200);
  const me = await fetch(g.url + '/api/me', { headers: { Cookie: user.cookie } }); assert.equal(me.status, 401);
});
test('database outage rolls back item consumption and tick; same action succeeds once after recovery', async t => {
  const g = await start({ filename: ':memory:' }); t.after(() => g.close());
  const user = await auth(g, 'bob'); const { socket, state } = await joinGame(g, user.cookie); t.after(() => socket.disconnect());
  const id = state.me.id; g.world.players[id].hp = 2; await g.store.save(Object.values(g.world.players));
  const save = g.store.save.bind(g.store); g.store.save = async () => { throw new Error('simulated outage'); };
  const action = { actionId: 'consume-once-123', action: 'use', item: 'bread' };
  assert.equal((await command(socket, 'item', action)).ok, false);
  assert.equal(g.world.players[id].hp, 2); assert.equal(g.world.players[id].inventory.bread, 3);
  const before = g.world.snapshot(); await g.tick(); assert.deepEqual(g.world.snapshot(), before);
  g.store.save = save; assert.equal((await command(socket, 'item', action)).ok, true); assert.equal((await command(socket, 'item', action)).ok, true);
  assert.equal(g.world.players[id].inventory.bread, 2); assert.equal((await g.store.load(id)).inventory.bread, 2);
});
test('unauthenticated sockets and cross-origin auth are rejected', async t => {
  const g = await start({ filename: ':memory:' }); t.after(() => g.close());
  const socket = connect(g); const rejected = wait(socket, 'authRequired'); socket.connect(); await rejected; socket.disconnect();
  const response = await fetch(g.url + '/api/auth/register', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'alice', password: 'password-12345' }) });
  assert.equal(response.status, 403);
});
test('PostgreSQL persistence roundtrip (requires TEST_DATABASE_URL)', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const store = await new Store().init({ databaseUrl: process.env.TEST_DATABASE_URL });
  try {
    const user = await store.authenticate('test_' + Date.now(), 'postgres-test-password', true);
    const p = await store.load(user.id); p.inventory.coin = 17; await store.save([p]);
    assert.equal((await store.load(user.id)).inventory.coin, 17); assert.equal((await store.session(user.token)).id, user.id);
    await store.logout(user.token); assert.equal(await store.session(user.token), null);
    await store.serial(() => store.transaction(async () => { await store.query('DELETE FROM characters WHERE account_id=$1', [user.id]); await store.query('DELETE FROM accounts WHERE id=$1', [user.id]); }));
  } finally { await store.close(); }
});
