'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { World, character, CFG } = require('../game/world');
test('movement stays inside the visible 800x600 map; invalid inputs are rejected', () => {
  const w = new World(); w.join(character('a', 'alice'));
  w.command('a', 'move', { x: 9999, y: 9999 });
  assert.equal(w.players.a.targetY, 580); assert.equal(w.players.a.targetX, 780);
  assert.throws(() => w.command('a', 'move', { x: NaN, y: 20 }));
  assert.throws(() => w.command('a', 'attack', '__proto__'));
});
test('food is server validated, capped and idempotent, including replay after cooldown', () => {
  const w = new World(); const p = character('a', 'alice'); w.join(p); p.hp = 2;
  const action = { actionId: 'eat-once-123', action: 'use', item: 'bread' };
  w.command('a', 'item', action, 10000); assert.equal(p.hp, 8); assert.equal(p.inventory.bread, 2);
  w.command('a', 'item', action, 13000); assert.equal(p.inventory.bread, 2);
  assert.throws(() => w.command('a', 'item', { ...action, actionId: 'eat-twice-123' }, 11000));
  w.command('a', 'item', { ...action, actionId: 'eat-twice-123' }, 13000); assert.equal(p.hp, 10);
  assert.throws(() => w.command('a', 'item', { ...action, actionId: 'eat-third-123' }, 16000));
  assert.throws(() => w.command('a', 'item', { ...action, item: '__proto__', actionId: 'bad-item-123' }, 16000));
});
test('two attackers receive one loot award for a kill, based on damage contribution', () => {
  const w = new World(() => 0); const a = character('a', 'alice'), b = character('b', 'bob');
  w.join(a); w.join(b); a.x = b.x = 300; a.y = b.y = 300;
  const n = w.npcs.goblin_1; n.hp = 1; n.contributions = { a: 10, b: 20 };
  a.targetNpc = b.targetNpc = n.id; w.tick(10000);
  assert.equal(a.inventory.coin, 0); assert.equal(b.inventory.coin, 5); assert.equal(b.inventory.bread, 4);
  w.tick(10600); assert.equal(b.inventory.coin, 5); assert.equal(n.hp, 0);
  w.tick(16000); assert.equal(n.hp, n.maxHp);
});
test('full inventory moves loot into persistent pending storage and claims exactly once', () => {
  const w = new World(() => 0); const p = character('a', 'alice'); w.join(p);
  p.inventory.bread = 26; p.x = p.y = 300; p.targetNpc = 'goblin_1'; w.npcs.goblin_1.hp = 1;
  w.tick(10000); assert.equal(p.pendingLoot.length, 1); assert.equal(p.inventory.coin, 5);
  const action = { actionId: 'claim-loot-1', action: 'claim', lootId: p.pendingLoot[0].id };
  assert.throws(() => w.command('a', 'item', action, 12000), /plný/);
  p.hp = 1; w.command('a', 'item', { actionId: 'eat-for-room', action: 'use', item: 'bread' }, 12000);
  w.command('a', 'item', action, 13000); w.command('a', 'item', action, 14000);
  assert.equal(p.pendingLoot.length, 0); assert.equal(p.inventory.bread, 26);
});
test('NPC retargets after disconnect and returns home when players escape', () => {
  const w = new World(() => 0); const a = character('a', 'alice'), b = character('b', 'bob');
  a.x = b.x = 300; a.y = b.y = 300; a.targetX = b.targetX = 300; a.targetY = b.targetY = 300;
  w.join(a); w.join(b); const n = w.npcs.goblin_1;
  w.tick(10000); assert.equal(n.targetId, 'a'); w.leave('a'); w.tick(10600); assert.equal(n.targetId, 'b');
  b.x = b.targetX = 780; b.y = b.targetY = 580; w.tick(11200); assert.equal(n.mode, 'return');
  w.tick(11800); assert.equal(n.mode, 'idle'); assert.equal(n.hp, n.maxHp);
});
test('death prevents actions, respawns, and does not destroy inventory', () => {
  const w = new World(() => 0); const p = character('a', 'alice'); p.x = p.y = 300; w.join(p); p.hp = 1;
  w.tick(10000); assert.equal(p.hp, 0); assert.equal(p.deadUntil, 10000 + CFG.respawn);
  assert.throws(() => w.command('a', 'move', { x: 100, y: 100 }));
  w.tick(16000); assert.equal(p.hp, 10); assert.equal(p.x, 400); assert.equal(p.inventory.bread, 3);
});
test('public snapshots do not expose another player inventory, XP or action IDs', () => {
  const w = new World(); w.join(character('a', 'alice')); w.join(character('b', 'bob'));
  const s = w.state('a'); assert.equal(s.me.name, 'alice'); assert.equal(s.players.b.inventory, undefined); assert.equal(s.me.recentActions, undefined);
});
