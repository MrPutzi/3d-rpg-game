// Minimal authoritative multiplayer RPG world. All combat, movement and XP live on the server.
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(root, 'public')));
app.get('/', (_, res) => res.sendFile(path.join(root, 'public/index.html')));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 2048 });
const WIDTH = 32, HEIGHT = 24, TILE = 32;
const MAX_PLAYERS = 60;
const LEVELS = ['attack','strength','defence','hitpoints','ranged','woodcutting','mining'];
const xpForLevel = lvl => Math.floor((Math.pow(lvl, 2.2) - 1) * 55);
const levelOf = xp => { let level = 1; while(level < 99 && xp >= xpForLevel(level + 1)) level++; return level; };
const walls = new Set();
for(let x=0;x<WIDTH;x++){walls.add(x+',0');walls.add(x+','+(HEIGHT-1));}
for(let y=0;y<HEIGHT;y++){walls.add('0,'+y);walls.add((WIDTH-1)+','+y);}
for(let x=5;x<12;x++) walls.add(x+',7');
for(let x=20;x<28;x++) walls.add(x+',15');
const nodes = [
  {id:'tree1',type:'tree',x:5,y:4},{id:'tree2',type:'tree',x:7,y:5},
  {id:'tree3',type:'tree',x:9,y:4},{id:'tree4',type:'tree',x:4,y:14},
  {id:'rock1',type:'rock',x:23,y:5},{id:'rock2',type:'rock',x:26,y:7},
  {id:'rock3',type:'rock',x:25,y:10},{id:'rock4',type:'rock',x:20,y:4}
].map(n=>({...n,readyAt:0}));
const mobs = Array.from({length:10},(_,i)=>({
 id:'goblin'+i,x:14+(i%5)*3,y:5+Math.floor(i/5)*10,
 homeX:14+(i%5)*3,homeY:5+Math.floor(i/5)*10,
 hp:22,maxHp:22,alive:true,respawnAt:0,lastAttack:0
}));
const players = new Map();
const blocked=(x,y)=>x<1||y<1||x>=WIDTH-1||y>=HEIGHT-1||walls.has(x+','+y);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const send=(ws,msg)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));};
function addXP(p,skill,amount){p.xp[skill]+=amount;send(p.ws,{type:'xp',skill,amount,level:levelOf(p.xp[skill])});}
function publicPlayer(p){return {id:p.id,name:p.name,x:p.x,y:p.y,hp:p.hp,maxHp:p.maxHp,style:p.style,levels:Object.fromEntries(LEVELS.map(k=>[k,levelOf(p.xp[k])]))};}
function state(){return {type:'state',players:[...players.values()].map(publicPlayer),mobs:mobs.map(({id,x,y,hp,maxHp,alive})=>({id,x,y,hp,maxHp,alive})),nodes:nodes.map(({id,type,x,y,readyAt})=>({id,type,x,y,ready:Date.now()>=readyAt}))};}
function chat(text){for(const p of players.values())send(p.ws,{type:'message',text});}
function hit(p,mob){
 if(!mob||!mob.alive||dist(p,mob)>(p.style==='ranged'?5.2:1.6))return;
 const now=Date.now();if(now-p.lastAttack<950)return;p.lastAttack=now;
 const skill=p.style==='ranged'?'ranged':'attack';
 const accuracy=levelOf(p.xp[skill]),power=levelOf(p.xp[p.style==='ranged'?'ranged':'strength']);
 const damage=Math.random()<Math.min(.94,.72+accuracy*.006)?1+Math.floor(Math.random()*(3+power*.5)):0;
 mob.hp=Math.max(0,mob.hp-damage);addXP(p,skill,damage*4+1);
 if(p.style==='melee')addXP(p,'strength',damage*3+1);
 addXP(p,'hitpoints',damage+1);
 for(const other of players.values())send(other.ws,{type:'effect',from:{x:p.x,y:p.y},to:{x:mob.x,y:mob.y},style:p.style,damage});
 if(mob.hp===0){mob.alive=false;mob.respawnAt=now+6500;p.gold+=6;send(p.ws,{type:'loot',gold:6});}
}
function gather(p,node){
 if(!node||dist(p,node)>1.6||Date.now()<node.readyAt)return;
 const skill=node.type==='tree'?'woodcutting':'mining';
 node.readyAt=Date.now()+5000;addXP(p,skill,16);p.items[node.type==='tree'?'logs':'ore']++;
 send(p.ws,{type:'gather',item:node.type==='tree'?'logs':'ore'});
}
wss.on('connection',ws=>{
 if(players.size>=MAX_PLAYERS){ws.close(1013,'World full');return;}
 const id=crypto.randomUUID();
 const p={id,ws,name:'Adventurer',x:3,y:3,hp:20,maxHp:20,style:'melee',
 xp:Object.fromEntries(LEVELS.map(k=>[k,k==='hitpoints'?xpForLevel(10):0])),
 gold:0,items:{logs:0,ore:0},lastAttack:0,lastMove:0,lastMessage:0};
 players.set(id,p);
 send(ws,{type:'welcome',id,width:WIDTH,height:HEIGHT,walls:[...walls],skills:LEVELS});
 chat('An adventurer entered the world.');
 ws.on('message',raw=>{
  let msg;try{msg=JSON.parse(raw.toString());}catch{return;}
  if(!msg||typeof msg.type!=='string')return;
  if(msg.type==='name'){
   p.name=String(msg.name||'Adventurer').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18)||'Adventurer';
  }else if(msg.type==='move'){
   if(Date.now()-p.lastMove<125)return;
   const dx=Number(msg.dx),dy=Number(msg.dy);
   if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return;
   const x=p.x+dx,y=p.y+dy;if(!blocked(x,y)){p.x=x;p.y=y;p.lastMove=Date.now();}
  }else if(msg.type==='style'){if(['melee','ranged'].includes(msg.style))p.style=msg.style;
  }else if(msg.type==='attack'){hit(p,mobs.find(m=>m.id===msg.id));
  }else if(msg.type==='gather'){gather(p,nodes.find(n=>n.id===msg.id));
  }else if(msg.type==='chat'){
   if(Date.now()-p.lastMessage<900)return;p.lastMessage=Date.now();
   const text=String(msg.text||'').replace(/[<>]/g,'').slice(0,120).trim();
   if(text)chat(p.name+': '+text);
  }
 });
 ws.on('close',()=>players.delete(id));ws.on('error',()=>players.delete(id));
});
setInterval(()=>{
 const now=Date.now();
 for(const mob of mobs){
  if(!mob.alive){if(now>=mob.respawnAt){mob.alive=true;mob.hp=mob.maxHp;mob.x=mob.homeX;mob.y=mob.homeY;}continue;}
  const near=[...players.values()].filter(p=>dist(p,mob)<1.6).sort((a,b)=>dist(a,mob)-dist(b,mob))[0];
  if(near&&now-mob.lastAttack>1700){
   mob.lastAttack=now;const damage=Math.max(1,3-Math.floor(levelOf(near.xp.defence)/12));
   near.hp-=damage;addXP(near,'defence',2);
   send(near.ws,{type:'hurt',damage});
   if(near.hp<=0){near.hp=near.maxHp;near.x=3;near.y=3;send(near.ws,{type:'message',text:'You respawned at the village.'});}
  }
 }
 const snapshot=state();for(const p of players.values()){send(p.ws,snapshot);send(p.ws,{type:'inventory',gold:p.gold,items:p.items});}
},200);
const port=Number(process.env.PORT)||3000;
server.listen(port,'0.0.0.0',()=>console.log('MMO world listening on '+port));
