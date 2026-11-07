'use strict';
const { randomUUID } = require('node:crypto');
const ITEMS = Object.freeze({
  sword: { name: 'Železný meč', slot: 'weapon', bonus: 2, style: 'melee' },
  bow: { name: 'Krátky luk', slot: 'weapon', bonus: 2, style: 'ranging' },
  bread: { name: 'Chlieb', heal: 6 },
  coin: { name: 'Mince' }
});
const CFG = Object.freeze({ width: 800, height: 600, tick: 600, speed: 35, capacity: 28, respawn: 5000 });
const level = xp => Math.min(99, Math.max(1, Math.floor(1 + Math.sqrt(Math.max(0, xp) / 25))));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function character(id, name) {
  return { id, name, x: 400, y: 300, targetX: 400, targetY: 300, combatStyle: 'attack', targetNpc: null,
    hp: 10, maxHp: 10, deadUntil: 0, attackAt: 0, foodAt: 0,
    skills: Object.fromEntries(['attack', 'strength', 'ranging', 'hitpoints'].map(k => [k, { xp: k === 'hitpoints' ? 2025 : 0, level: k === 'hitpoints' ? 10 : 1 }])),
    inventory: { sword: 1, bow: 1, bread: 3, coin: 0 }, equipment: { weapon: 'sword' },
    pendingLoot: [], recentActions: [] };
}
function npc(id, x, y) {
  return { id, name: 'Goblin', x, y, homeX: x, homeY: y, hp: 30, maxHp: 30,
    targetId: null, mode: 'idle', attackAt: 0, respawnTime: 0, contributions: {} };
}
class World {
  constructor(random = Math.random) {
    this.random = random;
    this.players = {};
    this.npcs = { goblin_1: npc('goblin_1', 300, 300), goblin_2: npc('goblin_2', 500, 400) };
    this.events = [];
  }
  snapshot() { return structuredClone({ players: this.players, npcs: this.npcs, events: this.events }); }
  restore(s) { Object.assign(this, s); }
  join(p) {
    p.targetNpc = null; p.targetX = p.x; p.targetY = p.y;
    this.players[p.id] = p;
  }
  leave(id) {
    delete this.players[id];
    for (const n of Object.values(this.npcs)) {
      delete n.contributions[id];
      if (n.targetId === id) n.targetId = null;
    }
  }
  addXp(p, key, amount) {
    p.skills[key].xp += amount; p.skills[key].level = level(p.skills[key].xp);
    const max = p.skills.hitpoints.level;
    if (max > p.maxHp) { p.hp += max - p.maxHp; p.maxHp = max; }
  }
  addItem(p, item, count) {
    const used = Object.entries(p.inventory).reduce((n, [k, v]) => n + (k === 'coin' ? 0 : v), 0);
    if (!ITEMS[item] || count < 1 || (item !== 'coin' && used + count > CFG.capacity)) return false;
    p.inventory[item] = (p.inventory[item] || 0) + count;
    return true;
  }
  command(id, type, payload, now = Date.now()) {
    const p = this.players[id];
    if (!p) throw new Error('Postava nie je pripojená.');
    if (p.hp <= 0) throw new Error('Počkaj na oživenie postavy.');
    if (type === 'move') {
      if (!payload || !Number.isFinite(payload.x) || !Number.isFinite(payload.y)) throw new Error('Neplatná pozícia.');
      p.targetX = clamp(payload.x, 20, CFG.width - 20); p.targetY = clamp(payload.y, 20, CFG.height - 20); p.targetNpc = null;
    } else if (type === 'attack') {
      if (typeof payload !== 'string' || !Object.hasOwn(this.npcs, payload) || this.npcs[payload].hp <= 0) throw new Error('Cieľ už nie je dostupný.');
      p.targetNpc = payload;
    } else if (type === 'setStyle') {
      if (!['attack', 'strength', 'ranging'].includes(payload)) throw new Error('Neplatný štýl.');
      p.combatStyle = payload;
    } else if (type === 'item') {
      const { actionId, action, item, lootId } = payload || {};
      if (typeof actionId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(actionId)) throw new Error('Neplatná akcia.');
      if (p.recentActions.includes(actionId)) return;
      if (action === 'claim') {
        const i = p.pendingLoot.findIndex(l => l.id === lootId);
        if (i < 0) throw new Error('Korisť už bola prevzatá.');
        const loot = p.pendingLoot[i];
        if (!this.addItem(p, loot.item, loot.count)) throw new Error('Inventár je plný.');
        p.pendingLoot.splice(i, 1);
      } else {
        if (typeof item !== 'string' || !Object.hasOwn(ITEMS, item) || !(p.inventory[item] > 0)) throw new Error('Predmet nemáš v inventári.');
        if (action === 'equip' && ITEMS[item].slot) p.equipment.weapon = item;
        else if (action === 'use' && ITEMS[item].heal) {
          if (now < p.foodAt) throw new Error('Jedlo môžeš použiť každé 2 sekundy.');
          if (p.hp >= p.maxHp) throw new Error('Máš plné zdravie.');
          p.inventory[item]--; p.hp = Math.min(p.maxHp, p.hp + ITEMS[item].heal); p.foodAt = now + 2000;
        } else throw new Error('Túto akciu predmet nepodporuje.');
      }
      p.recentActions.push(actionId); p.recentActions = p.recentActions.slice(-100);
    } else throw new Error('Neznáma akcia.');
  }
  step(entity, target, speed) {
    const d = distance(entity, target);
    if (d === 0) return;
    const ratio = Math.min(1, speed / d);
    entity.x = clamp(entity.x + (target.x - entity.x) * ratio, 20, CFG.width - 20);
    entity.y = clamp(entity.y + (target.y - entity.y) * ratio, 20, CFG.height - 20);
  }
  reward(n) {
    // Highest damage wins; stable character ID breaks ties. Exactly one award per death.
    const winner = Object.entries(n.contributions).filter(([id]) => this.players[id])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (winner) {
      const p = this.players[winner[0]];
      this.addItem(p, 'coin', 5);
      if (!this.addItem(p, 'bread', 1)) {
        if (p.pendingLoot.length < 28) p.pendingLoot.push({ id: randomUUID(), item: 'bread', count: 1 });
        else { this.addItem(p, 'coin', 2); this.events.push({ kind: 'notice', playerId: p.id, text: 'Úschovňa je plná: chlieb sa zmenil na 2 mince.' }); }
      }
      this.events.push({ kind: 'loot', playerId: p.id, text: '+5 mincí, +1 chlieb (alebo náhrada pri plnej úschovni)' });
    }
    n.contributions = {};
  }
  tick(now) {
    this.events = [];
    for (const n of Object.values(this.npcs)) {
      if (n.hp <= 0 && now >= n.respawnTime) Object.assign(n, npc(n.id, n.homeX, n.homeY));
    }
    for (const p of Object.values(this.players)) {
      if (p.hp <= 0) {
        if (now >= p.deadUntil) { p.hp = p.maxHp; p.x = p.targetX = 400; p.y = p.targetY = 300; p.deadUntil = 0; }
        continue;
      }
      const n = this.npcs[p.targetNpc];
      if (n && n.hp > 0 && n.mode !== 'return') {
        const ranged = p.combatStyle === 'ranging';
        const range = ranged ? 180 : 45;
        if (distance(p, n) > range) { p.targetX = n.x; p.targetY = n.y; }
        else {
          p.targetX = p.x; p.targetY = p.y;
          if (now >= p.attackAt) {
            p.attackAt = now + 1200;
            const accuracy = ranged ? p.skills.ranging.level : p.skills.attack.level;
            const power = ranged ? p.skills.ranging.level : p.skills.strength.level;
            const weapon = ITEMS[p.equipment.weapon];
            const bonus = weapon && weapon.style === (ranged ? 'ranging' : 'melee') ? weapon.bonus : 0;
            const hit = this.random() < Math.min(.9, .5 + accuracy * .03) ? Math.floor(this.random() * (2 + Math.floor(power * 1.5) + bonus)) + 1 : 0;
            const damage = Math.min(n.hp, hit);
            n.hp -= damage;
            n.contributions[p.id] = (n.contributions[p.id] || 0) + damage;
            if (!n.targetId) n.targetId = p.id;
            this.events.push({ kind: 'hit', targetId: n.id, damage, x: n.x, y: n.y });
            this.addXp(p, p.combatStyle, damage * 4); this.addXp(p, 'hitpoints', Math.floor(damage * 1.33));
            if (n.hp <= 0) { n.respawnTime = now + CFG.respawn; n.targetId = null; n.mode = 'dead'; this.reward(n); }
          }
        }
      } else p.targetNpc = null;
      this.step(p, { x: p.targetX, y: p.targetY }, CFG.speed);
    }
    for (const n of Object.values(this.npcs)) {
      if (n.hp <= 0) continue;
      const home = { x: n.homeX, y: n.homeY };
      if (n.mode === 'return') {
        this.step(n, home, 25);
        if (distance(n, home) < 1) { n.mode = 'idle'; n.hp = n.maxHp; }
        continue;
      }
      let target = this.players[n.targetId];
      if (!target || target.hp <= 0 || distance(target, home) > 220) {
        target = Object.values(this.players).filter(p => p.hp > 0 && distance(p, home) <= 220 && distance(p, n) < 110)
          .sort((a, b) => distance(a, n) - distance(b, n))[0];
      }
      if (!target || distance(n, home) > 220) {
        n.targetId = null;
        if (n.mode !== 'idle' || distance(n, home) > 1) { n.mode = 'return'; n.contributions = {}; }
        continue;
      }
      n.targetId = target.id;
      if (distance(n, target) > 42) { n.mode = 'chase'; this.step(n, target, 22); }
      else {
        n.mode = 'attack';
        if (now >= n.attackAt) {
          n.attackAt = now + 1800;
          const damage = 1 + Math.floor(this.random() * 3);
          target.hp = Math.max(0, target.hp - damage);
          this.events.push({ kind: 'hit', targetId: target.id, damage, x: target.x, y: target.y });
          if (target.hp === 0) { target.deadUntil = now + CFG.respawn; target.targetNpc = null; target.targetX = target.x; target.targetY = target.y; n.targetId = null; }
        }
      }
    }
  }
  state(id) {
    return { now: Date.now(), map: CFG, items: ITEMS, me: this.players[id] ? (() => { const { recentActions, ...p } = this.players[id]; return p; })() : null,
      players: Object.fromEntries(Object.values(this.players).map(p => [p.id, { id: p.id, name: p.name, x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, combatStyle: p.combatStyle }])),
      npcs: Object.fromEntries(Object.values(this.npcs).map(({ contributions, ...n }) => [n.id, n])),
      events: this.events.filter(e => !e.playerId || e.playerId === id) };
  }
}
module.exports = { World, character, ITEMS, CFG };
