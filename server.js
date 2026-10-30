'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
app.disable('x-powered-by');
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 2048, cors: { origin: false } });
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/health', (_, res) => res.json({ ok: true, players: Object.keys(GameState.players).length }));

const CONFIG = Object.freeze({
  TICK_RATE: 600,
  MAP_SIZE: 800,
  XP_MULTIPLIER: 4,
  MOVE_SPEED: 35,
  NPC_RESPAWN_MS: 5000,
  MAX_PLAYERS: 100,
  MAX_LEVEL: 99
});

function getLevelFromXp(xp) {
  return Math.min(CONFIG.MAX_LEVEL, Math.max(1, Math.floor(1 + Math.sqrt(Math.max(0, xp) / 25))));
}
const startingXpForLevel10 = 25 * 9 * 9;
const GameState = {
  players: Object.create(null),
  npcs: {
    goblin_1: { id: 'goblin_1', name: 'Goblin', x: 300, y: 300, hp: 30, maxHp: 30, respawnTime: 0 },
    goblin_2: { id: 'goblin_2', name: 'Goblin', x: 500, y: 400, hp: 30, maxHp: 30, respawnTime: 0 }
  },
  projectiles: []
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const skill = (xp = 0) => ({ xp, level: getLevelFromXp(xp) });
const validPosition = pos => pos && Number.isFinite(pos.x) && Number.isFinite(pos.y);
function addXp(player, skillName, amount) {
  const stat = player.skills[skillName];
  if (!stat || !Number.isFinite(amount) || amount <= 0) return;
  stat.xp += amount;
  stat.level = getLevelFromXp(stat.xp);
}
function publicState() {
  // Never serialize socket connections or other private session fields.
  return {
    players: GameState.players,
    npcs: GameState.npcs,
    projectiles: GameState.projectiles
  };
}

io.on('connection', socket => {
  if (Object.keys(GameState.players).length >= CONFIG.MAX_PLAYERS) {
    socket.emit('serverMessage', 'The world is full. Please try again later.');
    socket.disconnect(true);
    return;
  }
  GameState.players[socket.id] = {
    id: socket.id, x: 400, y: 300, targetX: 400, targetY: 300,
    combatStyle: 'attack', targetNpc: null,
    skills: {
      attack: skill(), strength: skill(), ranging: skill(), hitpoints: skill(startingXpForLevel10)
    }
  };
  socket.emit('serverMessage', 'Welcome to MiniScape! Click the ground to move and a goblin to fight.');

  socket.on('move', pos => {
    const p = GameState.players[socket.id];
    if (!p || !validPosition(pos)) return;
    p.targetX = clamp(pos.x, 20, CONFIG.MAP_SIZE - 20);
    p.targetY = clamp(pos.y, 20, CONFIG.MAP_SIZE - 20);
    p.targetNpc = null;
  });

  socket.on('attack', npcId => {
    const p = GameState.players[socket.id];
    if (!p || typeof npcId !== 'string') return;
    const npc = Object.hasOwn(GameState.npcs, npcId) ? GameState.npcs[npcId] : null;
    if (npc && npc.hp > 0) p.targetNpc = npcId;
  });

  socket.on('setStyle', style => {
    const p = GameState.players[socket.id];
    if (p && ['attack', 'strength', 'ranging'].includes(style)) p.combatStyle = style;
  });

  socket.on('disconnect', () => { delete GameState.players[socket.id]; });
});

setInterval(() => {
  const now = Date.now();
  GameState.projectiles = [];

  for (const npc of Object.values(GameState.npcs)) {
    if (npc.hp <= 0 && now >= npc.respawnTime) {
      npc.hp = npc.maxHp;
      npc.respawnTime = 0;
    }
  }

  for (const p of Object.values(GameState.players)) {
    if (p.targetNpc) {
      const npc = Object.hasOwn(GameState.npcs, p.targetNpc) ? GameState.npcs[p.targetNpc] : null;
      if (!npc || npc.hp <= 0) {
        p.targetNpc = null;
      } else {
        const distance = Math.hypot(npc.x - p.x, npc.y - p.y);
        const range = p.combatStyle === 'ranging' ? 180 : 45;
        if (distance <= range) {
          p.targetX = p.x;
          p.targetY = p.y;
          let maxHit = 2;
          let hitChance;
          if (p.combatStyle === 'ranging') {
            maxHit += Math.floor(p.skills.ranging.level * 1.5);
            hitChance = Math.min(0.9, 0.5 + p.skills.ranging.level * 0.03);
            GameState.projectiles.push({ fromX: p.x, fromY: p.y, toX: npc.x, toY: npc.y });
          } else {
            maxHit += Math.floor(p.skills.strength.level * 1.5);
            hitChance = Math.min(0.9, 0.5 + p.skills.attack.level * 0.03);
          }
          const hit = Math.random() < hitChance ? Math.floor(Math.random() * maxHit) + 1 : 0;
          if (hit > 0) {
            const actualDamage = Math.min(npc.hp, hit);
            npc.hp -= actualDamage;
            addXp(p, p.combatStyle, actualDamage * CONFIG.XP_MULTIPLIER);
            addXp(p, 'hitpoints', Math.floor(actualDamage * 1.33));
            if (npc.hp <= 0) {
              npc.respawnTime = now + CONFIG.NPC_RESPAWN_MS;
              p.targetNpc = null;
            }
          }
        } else {
          p.targetX = npc.x;
          p.targetY = npc.y;
        }
      }
    }

    const dx = p.targetX - p.x, dy = p.targetY - p.y;
    const distance = Math.hypot(dx, dy);
    if (distance > CONFIG.MOVE_SPEED) {
      p.x += dx / distance * CONFIG.MOVE_SPEED;
      p.y += dy / distance * CONFIG.MOVE_SPEED;
    } else {
      p.x = p.targetX;
      p.y = p.targetY;
    }
  }

  io.emit('state', publicState());
}, CONFIG.TICK_RATE);

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('MiniScape server listening on port ' + PORT));
