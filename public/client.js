'use strict';
const socket=io(),canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let world={players:{},npcs:{},nodes:{},projectiles:[],size:2400},catalog={},entered=false;
let camera={x:0,y:0},scale=1,view={w:1000,h:720},lastFrame=performance.now();
const names={welcome:'First Steps: Speak with the Elder',goblin_hunt:'Goblin Menace: Defeat 3 Goblins'};
const icons={attack:'⚔️',strength:'💪',defence:'🛡️',ranging:'🏹',hitpoints:'❤️',woodcutting:'🪓',mining:'⛏️',fishing:'🎣'};
const colors={tree:'#2f8650',oak:'#3a7844',copper:'#b87947',iron:'#8299a1',shrimp:'#5da9d7',trout:'#4c88bf'};
const activeName=()=>$('character-name').value;
socket.on('connect',()=>{$('connection').textContent='● Connected';if(entered){entered=false;$('login-overlay').hidden=false;}});
socket.on('disconnect',()=>{$('connection').textContent='● Reconnecting…';});
socket.on('catalog',data=>{catalog=data.items||{};});
socket.on('serverMessage',text=>{$('notice').textContent=String(text).slice(0,180);if(!entered)$('login-error').textContent=String(text).slice(0,120);});
socket.on('loginSuccess',()=>{entered=true;$('login-overlay').hidden=true;$('login-error').textContent='';});
$('login-form').onsubmit=e=>{e.preventDefault();if(socket.connected)socket.emit('login',{name:activeName()});else $('login-error').textContent='Server is not connected yet.';};
socket.on('state',data=>{if(!data||!data.players)return;world=data;updateUI();});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab-pane').forEach(x=>x.hidden=x.id!=='pane-'+b.dataset.tab);});
for(const style of ['attack','strength','ranging'])$('btn-'+style).onclick=()=>socket.emit('setStyle',style);
function row(container,left,right,action){
 const r=document.createElement('div');r.className='item';const l=document.createElement('span');l.textContent=left;r.append(l);
 if(action){const b=document.createElement('button');b.textContent=right;b.onclick=action;r.append(b);}
 else {const v=document.createElement('span');v.textContent=right;r.append(v);}
 container.append(r);
}
function updateUI(){
 const p=world.players[socket.id];if(!p||!entered)return;
 $('player-name').textContent=p.name;$('health').textContent=p.hp+' / '+p.maxHp;$('hp-bar').style.width=(100*p.hp/p.maxHp)+'%';
 $('gold').textContent=p.gold;$('weapon').textContent=catalog[p.equipment.weapon]?.name||'None';
 $('offhand').textContent=catalog[p.equipment.offhand]?.name||'None';
 $('online').textContent=Object.keys(world.players).length+' players online';
 $('coords').textContent=Math.floor(p.x)+', '+Math.floor(p.y);
 $('zone').textContent=p.x<850&&p.y<850?'Oakvale Village':p.x>1600?'Eastern Wilds':p.y>1500?'Southern Frontier':'Oakvale Outskirts';
 for(const style of ['attack','strength','ranging'])$('btn-'+style).classList.toggle('active',p.combatStyle===style);
 const skills=$('skills-list');skills.replaceChildren();
 for(const [id,s] of Object.entries(p.skills)){const r=document.createElement('div');r.className='skill-row';r.textContent=(icons[id]||'✦')+' '+id[0].toUpperCase()+id.slice(1);const v=document.createElement('span');v.textContent='Lv '+s.level+' · '+s.xp+' XP';r.append(v);skills.append(r);}
 const inv=$('inventory');inv.replaceChildren();
 for(const id of p.inventory){const item=catalog[id];if(!item)continue;row(inv,item.name,item.slot==='food'?'Eat':item.slot==='material'?'Resource':'Equip',item.slot==='material'?null:()=>socket.emit(item.slot==='food'?'useItem':'equip',id));}
 if(!p.inventory.length)inv.textContent='Your inventory is empty.';
 const equip=$('equipment');equip.replaceChildren();row(equip,'Weapon',catalog[p.equipment.weapon]?.name||'None');row(equip,'Offhand',catalog[p.equipment.offhand]?.name||'None');
 const quests=$('quests');quests.replaceChildren();for(const [id,q] of Object.entries(p.quests)){const el=document.createElement('div');el.className='quest';const title=document.createElement('strong');title.textContent=names[id]||id;el.append(title);const info=document.createElement('div');info.className='muted';info.textContent=q.status==='complete'?'✓ Completed':q.status==='locked'?'Locked':'In progress · '+q.progress+'/'+q.goal;el.append(info);quests.append(el);}
}
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);view.w=r.width;view.h=r.height;ctx.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe(canvas);resize();
function worldPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-view.w/2)/scale+camera.x,y:(e.clientY-r.top-view.h/2)/scale+camera.y};}
canvas.addEventListener('pointerdown',e=>{
 if(!entered||!socket.connected)return;const pt=worldPoint(e);
 const villagers=world.village?.villagers||[];
 for(const v of villagers)if(Math.hypot(v.x-pt.x,v.y-pt.y)<26){socket.emit('interact',v.id);return;}
 for(const n of Object.values(world.npcs))if(n.hp>0&&Math.hypot(n.x-pt.x,n.y-pt.y)<24){socket.emit('attack',n.id);return;}
 for(const n of Object.values(world.nodes))if(Math.hypot(n.x-pt.x,n.y-pt.y)<24){socket.emit('gather',n.id);return;}
 socket.emit('move',pt);
});
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function label(text,x,y,color='#fff',size=12){ctx.font='600 '+size+'px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#10202c';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
function drawWorld(){
 const size=world.size||2400;rect(0,0,size,size,'#2c5943');
 const minX=Math.max(0,Math.floor((camera.x-view.w/scale/2)/64)*64),maxX=Math.min(size,camera.x+view.w/scale/2+64);
 const minY=Math.max(0,Math.floor((camera.y-view.h/scale/2)/64)*64),maxY=Math.min(size,camera.y+view.h/scale/2+64);
 for(let x=minX;x<maxX;x+=64)for(let y=minY;y<maxY;y+=64){
  const seed=(Math.floor(x/64)*37+Math.floor(y/64)*71)%11;
  rect(x,y,64,64,seed<4?'#2d5d46':'#305e47');
  if(seed===1){circle(x+15,y+21,3,'#4a8a5e');circle(x+36,y+40,2,'#76a96b');}
 }
 rect(70,1500,1150,760,'#315c62');rect(90,1530,1090,700,'#3d8092');
 const village=world.village;if(village){
  for(const road of village.roads)rect(road.x,road.y,road.w,road.h,'#ad926a');
  for(const b of village.buildings){
   rect(b.x+6,b.y+10,b.w,b.h,'#172d2c88');rect(b.x,b.y,b.w,b.h,'#77513d');rect(b.x+7,b.y+7,b.w-14,b.h-14,'#b98157');
   rect(b.x+b.w/2-13,b.y+b.h-22,26,22,'#49372d');label(b.label,b.x+b.w/2,b.y+31,'#ffe6b6',14);
  }
  circle(village.fountain.x,village.fountain.y,31,'#9baab2');circle(village.fountain.x,village.fountain.y,24,'#55a8c7');
  for(const v of village.villagers){circle(v.x,v.y,13,'#d9ad70');label('◆ '+v.name,v.x,v.y-22,'#ffdc9d',12);}
 }
 for(const n of Object.values(world.nodes||{})){
  const ready=Date.now()>=n.readyAt;ctx.globalAlpha=ready?1:.35;
  if(n.kind==='tree'||n.kind==='oak'){rect(n.x-4,n.y,8,19,'#6d5038');circle(n.x,n.y-8,n.kind==='oak'?22:17,colors[n.kind]);circle(n.x-7,n.y-15,8,'#58a66a');}
  else if(n.kind==='copper'||n.kind==='iron'){circle(n.x,n.y,17,'#556b6c');circle(n.x-4,n.y-5,11,colors[n.kind]);}
  else{circle(n.x,n.y,16,colors[n.kind]);label('≈',n.x,n.y+5,'#e3faff',17);}
  ctx.globalAlpha=1;
 }
 for(const n of Object.values(world.npcs||{})){
  if(n.hp<=0)continue;circle(n.x,n.y+9,16,'#12271d66');circle(n.x,n.y,15,n.color);
  circle(n.x-5,n.y-4,2,'#1d2d26');circle(n.x+5,n.y-4,2,'#1d2d26');
  label(n.name+' · Lv '+n.level,n.x,n.y-26,n.level>=15?'#ffc3a9':'#fff2ce',12);
  rect(n.x-18,n.y+20,36,5,'#633b42');rect(n.x-18,n.y+20,36*n.hp/n.maxHp,5,'#83d48d');
 }
 for(const [id,p] of Object.entries(world.players||{})){
  circle(p.x,p.y+9,16,'#14222a77');circle(p.x,p.y,14,id===socket.id?'#f1d08e':'#83b9e3');
  rect(p.x-4,p.y-1,8,12,p.combatStyle==='ranging'?'#8cda9b':'#dbe8ef');
  label(p.name,p.x,p.y-23,id===socket.id?'#ffe2a5':'#e5f6ff',13);
 }
 for(const e of world.projectiles||[]){
  ctx.strokeStyle=e.style==='ranging'?'#e9ed8a':'#ffb48d';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(e.fromX,e.fromY);ctx.lineTo(e.x,e.y);ctx.stroke();
  label(String(e.damage),e.x,e.y-31,'#ffdd95',14);
 }
}
function frame(now){
 requestAnimationFrame(frame);
 const me=world.players[socket.id];
 if(me){camera.x+=(me.x-camera.x)*.16;camera.y+=(me.y-camera.y)*.16;}else if(!camera.x){camera={x:380,y:380};}
 const dpr=canvas.width/view.w||1;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,view.w,view.h);
 ctx.save();ctx.translate(view.w/2,view.h/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);drawWorld();ctx.restore();
}
requestAnimationFrame(frame);
