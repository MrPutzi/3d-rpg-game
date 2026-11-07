'use strict';
const $ = id => document.getElementById(id);
const socket = io({ autoConnect: false });
const canvas = $('gameCanvas'), ctx = canvas.getContext('2d');
let state = { players: {}, npcs: {} }, effects = [], lastInventory = '', lastSkills = '', serverOffset = 0;
const skillNames = { attack: 'Presnosť', strength: 'Sila', ranging: 'Streľba', hitpoints: 'Vitalita' };
function message(text) { $('message').textContent = text; }
function log(text) { const li = document.createElement('li'); li.textContent = text; $('log').prepend(li); while ($('log').children.length > 12) $('log').lastChild.remove(); }
async function api(url, body) {
  const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Požiadavka zlyhala.'); return data;
}
function loginScreen() { socket.disconnect(); state = { players: {}, npcs: {} }; $('game').hidden = true; $('logout').hidden = true; $('login-panel').hidden = false; $('connection').textContent = 'Neprihlásený'; }
function enter() { $('login-panel').hidden = true; $('game').hidden = false; $('logout').hidden = false; lastInventory = ''; lastSkills = ''; socket.connect(); }
$('auth-form').addEventListener('submit', async e => {
  e.preventDefault(); const buttons = [...e.currentTarget.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true); $('auth-error').textContent = '';
  try { await api('/api/auth/' + (e.submitter?.value || 'login'), { username: $('username').value.trim(), password: $('password').value }); $('password').value = ''; enter(); }
  catch (err) { $('auth-error').textContent = err.message; }
  finally { buttons.forEach(b => b.disabled = false); }
});
$('logout').onclick = async () => { try { await api('/api/logout', {}); loginScreen(); } catch (err) { message(err.message); } };
$('reconnect').onclick = () => { $('reconnect').hidden = true; socket.connect(); };
socket.on('connect', () => { $('connection').textContent = '● Online'; $('reconnect').hidden = true; });
socket.on('disconnect', reason => { $('connection').textContent = '● Odpojené'; if (reason === 'io server disconnect') $('reconnect').hidden = false; else message('Pripojenie sa obnovuje…'); });
socket.on('connect_error', () => { $('connection').textContent = '● Server nedostupný'; message('Nepodarilo sa pripojiť. Skúšam znova…'); });
socket.on('authRequired', () => { loginScreen(); $('auth-error').textContent = 'Relácia vypršala. Prihlás sa znova.'; });
socket.on('serverMessage', message);
socket.on('state', next => {
  state = next; serverOffset = next.now - Date.now(); updateUI();
  for (const e of next.events || []) {
    if (e.kind === 'hit') effects.push({ ...e, until: performance.now() + 850 });
    else if (e.text) { message(e.text); log(e.text); }
  }
});
function command(type, payload) {
  if (!socket.connected || !state.me) return message('Počkaj na pripojenie.');
  socket.timeout(8000).emit(type, payload, (err, result) => {
    if (err) message('Server nepotvrdil akciu. Počkaj na obnovenie stavu pred ďalším pokusom.');
    else if (!result?.ok) message(result?.error || 'Akcia zlyhala.');
  });
}
document.querySelectorAll('[data-style]').forEach(b => b.onclick = () => command('setStyle', b.dataset.style));
function itemButton(text, payload) { const b = document.createElement('button'); b.textContent = text; b.disabled = state.me.hp <= 0; b.onclick = () => { b.disabled = true; command('item', { ...payload, actionId: crypto.randomUUID() }); setTimeout(() => { if (b.isConnected) b.disabled = state.me?.hp <= 0; }, 2000); }; return b; }
function updateUI() {
  const p = state.me; if (!p) return;
  $('character-name').textContent = p.name; $('hp').max = p.maxHp; $('hp').value = p.hp; $('hp-text').textContent = p.hp + ' / ' + p.maxHp;
  $('online').textContent = Object.keys(state.players).length + ' online';
  const target = state.npcs[p.targetNpc]; $('target').textContent = target ? 'Cieľ: ' + target.name + ' · ' + target.hp + '/' + target.maxHp + ' HP' : 'Bez cieľa';
  document.querySelectorAll('[data-style]').forEach(b => { b.setAttribute('aria-pressed', String(p.combatStyle === b.dataset.style)); b.disabled = p.hp <= 0; });
  const inventoryKey = JSON.stringify([p.inventory, p.equipment, p.pendingLoot, p.hp <= 0]);
  if (inventoryKey !== lastInventory) {
    lastInventory = inventoryKey; $('inventory').replaceChildren(); $('pending').replaceChildren();
    $('capacity').textContent = Object.entries(p.inventory).reduce((n, [k, v]) => n + (k === 'coin' ? 0 : v), 0) + '/' + state.map.capacity;
    $('equipment').textContent = 'Výbava: ' + (state.items[p.equipment.weapon]?.name || 'Žiadna');
    for (const [key, count] of Object.entries(p.inventory)) {
      if (count <= 0) continue;
      const item = state.items[key], row = document.createElement('div'), label = document.createElement('span'); label.textContent = item.name + ' ×' + count; row.append(label);
      if (item.slot) row.append(itemButton(p.equipment.weapon === key ? 'Vybavené' : 'Vybaviť', { action: 'equip', item: key }));
      if (item.heal) row.append(itemButton('Zjesť +' + item.heal + ' HP', { action: 'use', item: key }));
      $('inventory').append(row);
    }
    for (const loot of p.pendingLoot) { const row = document.createElement('div'); const label = document.createElement('span'); label.textContent = 'Úschovňa: ' + state.items[loot.item].name; row.append(label, itemButton('Prevziať', { action: 'claim', lootId: loot.id })); $('pending').append(row); }
  }
  const skillsKey = JSON.stringify(p.skills);
  if (lastSkills !== skillsKey) {
    lastSkills = skillsKey; $('skills-list').replaceChildren();
    for (const [key, value] of Object.entries(p.skills)) { const row = document.createElement('div'); row.className = 'skill-row'; const label = document.createElement('span'), stat = document.createElement('strong'); label.textContent = skillNames[key]; stat.textContent = 'Lv. ' + value.level + ' · ' + value.xp + ' XP'; row.append(label, stat); $('skills-list').append(row); }
  }
}
canvas.addEventListener('pointerdown', e => {
  if (!state.me || state.me.hp <= 0) return;
  const rect = canvas.getBoundingClientRect(); const x = (e.clientX - rect.left) * canvas.width / rect.width, y = (e.clientY - rect.top) * canvas.height / rect.height;
  const npc = Object.values(state.npcs).find(n => n.hp > 0 && Math.hypot(n.x - x, n.y - y) < 24);
  command(npc ? 'attack' : 'move', npc ? npc.id : { x, y });
});
function actor(x, y, color, radius, name, hp, maxHp, selected) {
  ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(x, y + radius, radius, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (selected) { ctx.strokeStyle = '#ffe2a2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#18261d'; ctx.fillRect(x - 20, y - 31, 40, 5); ctx.fillStyle = hp / maxHp < .3 ? '#e88a7c' : '#a5ce85'; ctx.fillRect(x - 20, y - 31, 40 * hp / maxHp, 5);
  ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff4d7'; ctx.fillText(name, x, y + radius + 20);
}
function render() {
  ctx.clearRect(0, 0, 800, 600); ctx.strokeStyle = '#ffffff09'; ctx.lineWidth = 1;
  for (let x = 0; x <= 800; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke(); }
  for (let y = 0; y <= 600; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); }
  ctx.strokeStyle = '#d7bd7733'; ctx.beginPath(); ctx.arc(400, 300, 35, 0, Math.PI * 2); ctx.stroke();
  for (const n of Object.values(state.npcs)) if (n.hp > 0) actor(n.x, n.y, n.mode === 'return' ? '#9d9b83' : '#b77850', 16, n.name, n.hp, n.maxHp, state.me?.targetNpc === n.id);
  for (const p of Object.values(state.players)) if (p.hp > 0) actor(p.x, p.y, p.id === state.me?.id ? '#7fc6d1' : '#c3baa2', 14, p.name, p.hp, p.maxHp, false);
  effects = effects.filter(e => e.until > performance.now()); ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center';
  for (const e of effects) { ctx.fillStyle = e.damage ? '#fff0d0' : '#b8c7bc'; ctx.fillText(e.damage || 'Miss', e.x, e.y - 35 - (850 - (e.until - performance.now())) / 35); }
  $('death').hidden = !state.me || state.me.hp > 0;
  if (state.me?.hp <= 0) $('death').textContent = 'Padol si. Oživenie za ' + Math.max(0, Math.ceil((state.me.deadUntil - Date.now() - serverOffset) / 1000)) + ' s';
  requestAnimationFrame(render);
}
render();
api('/api/me').then(enter).catch(err => { loginScreen(); if (err.message !== 'Prihlás sa.') $('auth-error').textContent = err.message; });
