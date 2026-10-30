'use strict';
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let state = { players: {}, npcs: {}, projectiles: [] };

socket.on('connect', () => {
  document.getElementById('connection').textContent = '● Online';
});
socket.on('disconnect', () => {
  document.getElementById('connection').textContent = '● Odpojené — pripájam sa…';
});
socket.on('serverMessage', text => {
  document.getElementById('connection').textContent = String(text).slice(0, 140);
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
  if (!me) return;
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
  if (!socket.connected) return;
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
    ctx.fillText(p.combatStyle.toUpperCase(), p.x, p.y - 20);
  }

  ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3;
  for (const proj of state.projectiles || []) {
    ctx.beginPath(); ctx.moveTo(proj.fromX, proj.fromY); ctx.lineTo(proj.toX, proj.toY); ctx.stroke();
  }
  requestAnimationFrame(render);
}
render();
