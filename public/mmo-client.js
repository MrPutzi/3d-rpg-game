// Canvas renderer + input. No gameplay authority lives in this client.
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const TILE=32;let socket,me=null,world=null,walls=new Set(),joined=false,style='melee';
let effects=[],lastMove=0,moveQueue=[],lastTarget=null;
const skills=['attack','strength','defence','hitpoints','ranged','woodcutting','mining'];
const icons={attack:'⚔',strength:'💪',defence:'🛡',hitpoints:'❤',ranged:'🏹',woodcutting:'🪓',mining:'⛏'};
$('skills').innerHTML=skills.map(k=>'<div class="skill">'+icons[k]+' '+k[0].toUpperCase()+k.slice(1)+' <strong id="skill-'+k+'">1</strong></div>').join('');
function send(message){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(message));}
function message(text){const el=document.createElement('div');el.textContent=text;$('messages').append(el);while($('messages').children.length>60)$('messages').firstChild.remove();$('messages').scrollTop=$('messages').scrollHeight;}
function connect(){
 const protocol=location.protocol==='https:'?'wss:':'ws:';
 socket=new WebSocket(protocol+'//'+location.host);
 socket.onopen=()=>{$('status').textContent='● Online';if(joined)send({type:'name',name:$('name').value});};
 socket.onclose=()=>{$('status').textContent='● Offline — reconnecting';setTimeout(connect,2500);};
 socket.onerror=()=>{$('status').textContent='Connection error';};
 socket.onmessage=event=>{
  let data;try{data=JSON.parse(event.data);}catch{return;}
  if(data.type==='welcome'){me=data.id;walls=new Set(data.walls);}
  if(data.type==='state'){
   world=data;
   const p=data.players.find(x=>x.id===me);
   if(p){$('char-name').textContent=p.name;$('health').textContent=p.hp+' / '+p.maxHp+' HP';$('hp-fill').style.width=(p.hp/p.maxHp*100)+'%';
    for(const [k,lvl] of Object.entries(p.levels))if($('skill-'+k))$('skill-'+k).textContent=lvl;}
  }
  if(data.type==='message')message(data.text);
  if(data.type==='xp')message('+'+data.amount+' '+data.skill+' XP · Level '+data.level);
  if(data.type==='loot')message('Looted '+data.gold+' gold.');
  if(data.type==='gather')message('Collected '+data.item+'.');
  if(data.type==='hurt')message('A goblin hit you for '+data.damage+'.');
  if(data.type==='inventory')$('inventory').textContent='🪙 '+data.gold+' gold · 🪵 '+data.items.logs+' logs · ⛏ '+data.items.ore+' ore';
  if(data.type==='effect')effects.push({...data,age:0});
 };
}
$('join').addEventListener('submit',e=>{e.preventDefault();joined=true;$('login').hidden=true;$('login').style.display='none';send({type:'name',name:$('name').value});canvas.focus();});
$('melee').onclick=()=>setStyle('melee');$('ranged').onclick=()=>setStyle('ranged');
function setStyle(next){style=next;send({type:'style',style});$('melee').classList.toggle('active',style==='melee');$('ranged').classList.toggle('active',style==='ranged');}
$('chat-form').onsubmit=e=>{e.preventDefault();const input=$('chat-input');if(input.value.trim())send({type:'chat',text:input.value.trim()});input.value='';};
function move(dx,dy){if(!joined)return;send({type:'move',dx,dy});}
document.addEventListener('keydown',e=>{
 if(!joined||document.activeElement?.tagName==='INPUT')return;
 const key=e.key.toLowerCase();const directions={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
 if(directions[key]){e.preventDefault();const now=Date.now();if(now-lastMove>135){move(...directions[key]);lastMove=now;}}
});
document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>move(...b.dataset.dir.split(',').map(Number))));
canvas.addEventListener('click',e=>{
 if(!joined||!world)return;
 const box=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-box.left)*canvas.width/box.width/TILE),y=Math.floor((e.clientY-box.top)*canvas.height/box.height/TILE);
 const mob=world.mobs.filter(m=>m.alive).find(m=>m.x===x&&m.y===y);
 if(mob){send({type:'attack',id:mob.id});return;}
 const node=world.nodes.find(n=>n.x===x&&n.y===y);
 if(node)send({type:'gather',id:node.id});
});
const palette={grass:'#254c3b',grass2:'#2a5541',path:'#806d4c',wall:'#536474',tree:'#377747',rock:'#87929a'};
function render(now){
 requestAnimationFrame(render);
 ctx.clearRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<24;y++)for(let x=0;x<32;x++){
  ctx.fillStyle=walls.has(x+','+y)?palette.wall:(y===11||x===12)?palette.path:(x+y)%2?palette.grass:palette.grass2;
  ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
  ctx.strokeStyle='rgba(0,0,0,.07)';ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);
 }
 if(world){
  for(const n of world.nodes){ctx.globalAlpha=n.ready?1:.35;ctx.fillStyle=n.type==='tree'?palette.tree:palette.rock;
   ctx.beginPath();ctx.arc(n.x*TILE+16,n.y*TILE+16,n.type==='tree'?14:11,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#f2f7f4';ctx.font='16px system-ui';ctx.textAlign='center';ctx.fillText(n.type==='tree'?'♣':'◆',n.x*TILE+16,n.y*TILE+22);ctx.globalAlpha=1;}
  for(const mob of world.mobs){if(!mob.alive)continue;circle(mob.x,mob.y,'#b86145',11);label('Goblin',mob.x,mob.y-13,'#ffd0aa');bar(mob.x,mob.y,mob.hp/mob.maxHp);}
  for(const p of world.players){circle(p.x,p.y,p.id===me?'#e7c477':'#6da9df',11);
   ctx.fillStyle=p.style==='ranged'?'#9fe58b':'#e4e9ec';ctx.fillRect(p.x*TILE+12,p.y*TILE+11,8,9);
   label(p.name+(p.id===me?' (you)':''),p.x,p.y-13,p.id===me?'#ffe7aa':'#e5f0fa');bar(p.x,p.y,p.hp/p.maxHp);}
  ctx.fillStyle='rgba(4,12,17,.7)';ctx.fillRect(7,7,252,29);ctx.fillStyle='#d9e8ec';ctx.textAlign='left';ctx.font='13px system-ui';ctx.fillText('Players online: '+world.players.length+' · Goblins: '+world.mobs.filter(m=>m.alive).length,15,26);
 }
 const dt=.016;effects=effects.filter(f=>(f.age+=dt)<.35);
 for(const f of effects){const alpha=1-f.age/.35;ctx.strokeStyle=f.style==='ranged'?'rgba(153,255,122,'+alpha+')':'rgba(255,222,130,'+alpha+')';
  ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(f.from.x*TILE+16,f.from.y*TILE+16);ctx.lineTo(f.to.x*TILE+16,f.to.y*TILE+16);ctx.stroke();
  label(String(f.damage),f.to.x,f.to.y-28,'#fff4a5');}
}
function circle(x,y,color,r){ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x*TILE+16,y*TILE+26,r,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x*TILE+16,y*TILE+15,r,0,Math.PI*2);ctx.fill();}
function label(t,x,y,color){ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#0a1720';ctx.strokeText(t,x*TILE+16,y*TILE+16);ctx.fillStyle=color;ctx.fillText(t,x*TILE+16,y*TILE+16);}
function bar(x,y,ratio){ctx.fillStyle='#4c2932';ctx.fillRect(x*TILE+4,y*TILE+29,24,3);ctx.fillStyle='#68c87b';ctx.fillRect(x*TILE+4,y*TILE+29,24*Math.max(0,ratio),3);}
connect();requestAnimationFrame(render);
