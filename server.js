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
const ITEMS = Object.freeze({
  bronze_sword: { id:'bronze_sword', name:'Bronze Sword', slot:'weapon', style:'melee', power:2 },
  shortbow: { id:'shortbow', name:'Shortbow', slot:'weapon', style:'ranging', power:2 },
  wooden_shield: { id:'wooden_shield', name:'Wooden Shield', slot:'offhand', power:0 },
  bread: { id:'bread', name:'Bread', slot:'consumable', heal:5 }
});
const SPAWN = {x:140,y:150};
const VILLAGE = {
  buildings:[{x:50,y:55,w:125,h:85,label:'Inn'},{x:215,y:55,w:135,h:85,label:'Smithy'},{x:50,y:230,w:130,h:95,label:'Store'}],
  roads:[{x:0,y:165,w:800,h:48},{x:165,y:0,w:45,h:600}],
  villagers:[{id:'elder',name:'Village Elder',x:290,y:190},{id:'guard',name:'Guard',x:360,y:190}],
  fountain:{x:190,y:190}
};
const GameState = {
  players: Object.create(null),
  village: VILLAGE,
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
    village: GameState.village,
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
    id: socket.id, name: 'Adventurer', loggedIn:false,
    x: SPAWN.x, y: SPAWN.y, targetX: SPAWN.x, targetY: SPAWN.y,
    hp:20,maxHp:20,combatStyle: 'attack', targetNpc: null, inventory: ['bronze_sword','shortbow','bread'],
    equipment: {weapon:'bronze_sword',offhand:null}, gold:0,
    quests: {welcome:{status:'active',progress:0,goal:1},goblin_hunt:{status:'locked',progress:0,goal:3}},
    skills: {
      attack: skill(), strength: skill(), ranging: skill(), hitpoints: skill(startingXpForLevel10)
    }
  };
  socket.emit('catalog', {items:ITEMS});
  socket.emit('serverMessage', 'Enter a character name to begin your adventure.');
  socket.on('login', payload => {
    const p=GameState.players[socket.id]; if(!p||p.loggedIn)return;
    const name=typeof payload?.name==='string'?payload.name.trim().replace(/[^\\p{L}\\p{N} _-]/gu,'').slice(0,18):'';
    if(name.length<2){socket.emit('serverMessage','Name must be at least 2 characters.');return;}
    p.name=name;p.loggedIn=true;socket.emit('loginSuccess',{id:p.id});
    socket.emit('serverMessage','Welcome to Oakvale! Speak with the Village Elder.');
  });
  socket.on('interact', id => {
    const p=GameState.players[socket.id];
    const npc=VILLAGE.villagers.find(v=>v.id===id);
    if(!p?.loggedIn||!npc||Math.hypot(npc.x-p.x,npc.y-p.y)>85)return;
    if(id==='elder'){
      if(p.quests.welcome.status==='active'){
        p.quests.welcome={status:'complete',progress:1,goal:1};
        p.quests.goblin_hunt.status='active';p.gold+=10;
        socket.emit('serverMessage','Elder: Welcome to Oakvale! +10 gold. Defeat 3 goblins east of town.');
      }else if(p.quests.goblin_hunt.status==='active'&&p.quests.goblin_hunt.progress>=3){
        p.quests.goblin_hunt.status='complete';p.gold+=40;p.inventory.push('wooden_shield','bread');
        socket.emit('serverMessage','Elder: Well done! +40 gold, Wooden Shield and Bread.');
      }else socket.emit('serverMessage','Elder: Explore the village and finish your current quest.');
    }else socket.emit('serverMessage','Guard: Equip your sword or bow from the inventory. Goblins roam east.');
  });
  socket.on('equip', itemId => {
    const p=GameState.players[socket.id];
    if(!p?.loggedIn||typeof itemId!=='string'||!p.inventory.includes(itemId))return;
    const item=Object.hasOwn(ITEMS,itemId)?ITEMS[itemId]:null;
    if(!item||!['weapon','offhand'].includes(item.slot))return;
    p.equipment[item.slot]=itemId;
    if(item.slot==='weapon')p.combatStyle=item.style==='ranging'?'ranging':'attack';
    socket.emit('serverMessage','Equipped '+item.name+'.');
  });
  socket.on('useItem', itemId => {
    const p=GameState.players[socket.id];
    if(!p?.loggedIn||itemId!=='bread')return;
    const idx=p.inventory.indexOf('bread');if(idx<0)return;
    if(p.hp>=p.maxHp){socket.emit('serverMessage','You already have full health.');return;}
    p.inventory.splice(idx,1);p.hp=Math.min(p.maxHp,p.hp+5);
    socket.emit('serverMessage','You ate bread and recovered 5 HP.');
  });

  socket.on('move', pos => {
    const p = GameState.players[socket.id];
    if (!p?.loggedIn || !validPosition(pos)) return;
    p.targetX = clamp(pos.x, 20, CONFIG.MAP_SIZE - 20);
    p.targetY = clamp(pos.y, 20, CONFIG.MAP_SIZE - 20);
    p.targetNpc = null;
  });

  socket.on('attack', npcId => {
    const p = GameState.players[socket.id];
    if (!p?.loggedIn || typeof npcId !== 'string') return;
    const npc = Object.hasOwn(GameState.npcs, npcId) ? GameState.npcs[npcId] : null;
    if (npc && npc.hp > 0) p.targetNpc = npcId;
  });

  socket.on('setStyle', style => {
    const p = GameState.players[socket.id];
    if (p?.loggedIn && ['attack', 'strength', 'ranging'].includes(style)) {
      p.combatStyle = p.equipment.weapon==='shortbow'?'ranging':style==='ranging'?'attack':style;
    }
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
      npc.lastRetaliation = 0;
    }
  }

  for (const p of Object.values(GameState.players)) {
    if (!p.loggedIn) continue;
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
          // Goblins retaliate at a controlled cadence, never on client request.
          if(distance<55 && (!npc.lastRetaliation || now-npc.lastRetaliation>=1800)){
            npc.lastRetaliation=now;
            p.hp=Math.max(0,p.hp-(1+Math.floor(Math.random()*3)));
            if(p.hp===0){
              p.hp=p.maxHp;p.x=SPAWN.x;p.y=SPAWN.y;
              p.targetX=p.x;p.targetY=p.y;p.targetNpc=null;
              io.to(p.id).emit('serverMessage','You were defeated and respawned in Oakvale.');
              continue;
            }
          }
          let maxHit = 2 + (ITEMS[p.equipment.weapon]?.power || 0);
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
              if(p.quests.goblin_hunt.status==='active'&&p.quests.goblin_hunt.progress<3){
                p.quests.goblin_hunt.progress++;
                io.to(p.id).emit('serverMessage','Goblin defeated: '+p.quests.goblin_hunt.progress+'/3');
              }
              p.gold+=5;
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
    // Prevent walking through the solid village buildings.
    if(VILLAGE.buildings.some(b=>p.x>b.x-12&&p.x<b.x+b.w+12&&p.y>b.y-12&&p.y<b.y+b.h+12)){
      p.x=clamp(p.x,20,CONFIG.MAP_SIZE-20);
      p.y=clamp(p.y,20,CONFIG.MAP_SIZE-20);
      p.targetX=p.x;p.targetY=p.y;
    }
  }

  io.emit('state', publicState());
}, CONFIG.TICK_RATE);

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('MiniScape server listening on port ' + PORT));
