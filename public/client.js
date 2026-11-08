'use strict';
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let state = { players: {}, npcs: {}, projectiles: [] };
let catalog = {}, entered = false;

socket.on('connect', () => {
  document.getElementById('connection').textContent = '● Online';
  if (entered) { entered = false; document.getElementById('login-overlay').hidden = false; }
});
socket.on('disconnect', () => {
  document.getElementById('connection').textContent = '● Odpojené — pripájam sa…';
});
socket.on('serverMessage', text => {
  document.getElementById('notice').textContent = String(text).slice(0, 180);
});
socket.on('catalog', data => { catalog = data.items || {}; });
socket.on('loginSuccess', () => { entered = true; document.getElementById('login-overlay').hidden = true; });
document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  if (!socket.connected) return;
  socket.emit('login', {name:document.getElementById('character-name').value});
});
socket.on('state', serverState => {
  if (!serverState || typeof serverState !== 'object') return;
  state = serverState;
  updateUI();
});

function setStyle(style) {
  socket.emit('setStyle', style);
  ['attack', 'strength', 'ranging'].forEach(s => {
    document.getElementById('btn-' + s).classList.toggle('active', s === style);
  });
}
['attack', 'strength', 'ranging'].forEach(style => {
  document.getElementById('btn-' + style).addEventListener('click', () => setStyle(style));
});

function updateUI() {
  const me = state.players?.[socket.id];
  if (!me || !entered) return;
  document.getElementById('gold').textContent = me.gold;
  const inv = document.getElementById('inventory');
  inv.replaceChildren();
  for(const id of me.inventory || []){
    const item=catalog[id];if(!item)continue;
    const row=document.createElement('div');row.className='item';
    const name=document.createElement('span');name.textContent=item.name;
    row.append(name);
    const button=document.createElement('button');
    button.textContent=item.slot==='consumable'?'Použiť':'Nasadiť';
    button.onclick=()=>socket.emit(item.slot==='consumable'?'useItem':'equip',id);
    row.append(button);inv.append(row);
  }
  const equipped=document.getElementById('equipment');
  equipped.textContent='Zbraň: '+(catalog[me.equipment?.weapon]?.name||'Žiadna')+
    ' · Štít: '+(catalog[me.equipment?.offhand]?.name||'Žiadny');
  const quests=document.getElementById('quests');quests.replaceChildren();
  const questNames={welcome:'Prvý rozhovor: nájdi staršinu',goblin_hunt:'Hrozba goblinov: poraz 3 goblinov'};
  for(const [id,q] of Object.entries(me.quests||{})){
    const row=document.createElement('div');row.className='quest';
    row.textContent=questNames[id]+' — '+(q.status==='locked'?'Zamknuté':q.status==='complete'?'Splnené':q.progress+'/'+q.goal);
    quests.append(row);
  }
  const skillsDiv = document.getElementById('skills-list');
  // The server controls skill keys, but render as text nodes instead of HTML.
  skillsDiv.replaceChildren();
  for (const [name, data] of Object.entries(me.skills)) {
    const row = document.createElement('div');
    row.className = 'skill-row';
    const label = document.createElement('span');
    label.textContent = name.toUpperCase();
    const value = document.createElement('span');
    value.textContent = 'Lvl ' + data.level + ' (' + data.xp + ' XP)';
    row.append(label, value);
    skillsDiv.append(row);
  }
}

canvas.addEventListener('pointerdown', e => {
  if (!socket.connected || !entered) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * canvas.width / rect.width;
  const clickY = (e.clientY - rect.top) * canvas.height / rect.height;
  for (const [id, npc] of Object.entries(state.npcs || {})) {
    if (npc.hp > 0 && Math.hypot(npc.x - clickX, npc.y - clickY) < 20) {
      socket.emit('attack', id);
      return;
    }
  }
  socket.emit('move', { x: clickX, y: clickY });
});

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const village=state.village;
  if(village){
    ctx.fillStyle='#9a855a';
    for(const road of village.roads)ctx.fillRect(road.x,road.y,road.w,road.h);
    for(const b of village.buildings){
      ctx.fillStyle='#6d4d30';ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.fillStyle='#aa784a';ctx.fillRect(b.x+5,b.y+5,b.w-10,b.h-10);
      ctx.fillStyle='#3a251d';ctx.fillRect(b.x+b.w/2-10,b.y+b.h-15,20,15);
      ctx.fillStyle='#f8e7bc';ctx.textAlign='center';ctx.font='bold 12px monospace';
      ctx.fillText(b.label,b.x+b.w/2,b.y+25);
    }
    const f=village.fountain;ctx.fillStyle='#8d9c9d';ctx.beginPath();ctx.arc(f.x,f.y,22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#52a7c7';ctx.beginPath();ctx.arc(f.x,f.y,16,0,Math.PI*2);ctx.fill();
    for(const n of village.villagers){
      ctx.fillStyle='#e0b77c';ctx.beginPath();ctx.arc(n.x,n.y,13,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff2ca';ctx.textAlign='center';ctx.font='11px monospace';ctx.fillText(n.name,n.x,n.y-20);
    }
  }
  // Subtle grid keeps the primitive art legible.
  ctx.strokeStyle = 'rgba(0,0,0,.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  for (const npc of Object.values(state.npcs || {})) {
    if (npc.hp <= 0) continue;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(npc.x, npc.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'red'; ctx.fillRect(npc.x - 20, npc.y - 28, 40, 5);
    ctx.fillStyle = '#2ecc71'; ctx.fillRect(npc.x - 20, npc.y - 28, npc.hp / npc.maxHp * 40, 5);
    ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(npc.name, npc.x, npc.y + 28);
  }

  for (const [id, p] of Object.entries(state.players || {})) {
    ctx.fillStyle = id === socket.id ? '#3498db' : '#ecf0f1';
    ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffff00'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText((p.name||'Player')+' · '+p.combatStyle.toUpperCase(), p.x, p.y - 20);
  }

  ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3;
  for (const proj of state.projectiles || []) {
    ctx.beginPath(); ctx.moveTo(proj.fromX, proj.fromY); ctx.lineTo(proj.toX, proj.toY); ctx.stroke();
  }
  requestAnimationFrame(render);
}
render();
