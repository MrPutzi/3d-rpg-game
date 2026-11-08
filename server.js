'use strict';
const express=require('express'),http=require('http'),path=require('path');
const {Server}=require('socket.io');
const app=express();app.disable('x-powered-by');app.use(express.static(path.join(__dirname,'public')));
const server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:2048});
const SIZE=2400,TICK=600,SPEED=42,SPAWN={x:380,y:380};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const xpLevel=xp=>{let level=1;while(level<99&&xp>=Math.floor((level+1)**2.6*38))level++;return level;};
const skill=(xp=0)=>({xp,level:xpLevel(xp)});
const ITEMS={
 bronze_sword:{name:'Bronze Sword',slot:'weapon',style:'melee',power:2},
 shortbow:{name:'Shortbow',slot:'weapon',style:'ranging',power:2},
 wooden_shield:{name:'Wooden Shield',slot:'offhand',power:1},
 bread:{name:'Bread',slot:'food',heal:7},
 logs:{name:'Logs',slot:'material'},oak_logs:{name:'Oak Logs',slot:'material'},
 copper_ore:{name:'Copper Ore',slot:'material'},iron_ore:{name:'Iron Ore',slot:'material'},
 raw_shrimp:{name:'Raw Shrimp',slot:'material'},raw_trout:{name:'Raw Trout',slot:'material'}
};
const VILLAGE={
 buildings:[{x:175,y:170,w:150,h:120,label:'Tavern'},{x:410,y:155,w:160,h:135,label:'Forge'},{x:165,y:490,w:165,h:125,label:'Market'},{x:465,y:500,w:150,h:120,label:'Guild'}],
 roads:[{x:0,y:352,w:900,h:65},{x:353,y:0,w:65,h:850}],
 villagers:[{id:'elder',name:'Village Elder',x:490,y:385},{id:'guard',name:'Guard',x:635,y:385}],
 fountain:{x:390,y:390}
};
const definitions=[
 {kind:'rat',name:'Rat',level:1,hp:12,count:5,region:[680,850,870,1200],color:'#8c796d',damage:1},
 {kind:'goblin',name:'Goblin',level:3,hp:30,count:9,region:[840,300,1280,830],color:'#88ad64',damage:3},
 {kind:'wolf',name:'Wolf',level:8,hp:55,count:7,region:[1250,750,1720,1240],color:'#9e9a90',damage:5},
 {kind:'skeleton',name:'Skeleton',level:15,hp:85,count:7,region:[1550,180,2150,690],color:'#d8d0b3',damage:8},
 {kind:'orc',name:'Orc',level:24,hp:145,count:6,region:[1730,1250,2240,2070],color:'#6c996b',damage:12}
];
const enemies=Object.create(null),nodes=Object.create(null),players=Object.create(null);
let index=0;
for(const d of definitions)for(let i=0;i<d.count;i++){
 const id=d.kind+'_'+i,x=d.region[0]+(i*83+31)%(d.region[2]-d.region[0]),y=d.region[1]+(i*109+43)%(d.region[3]-d.region[1]);
 enemies[id]={id,kind:d.kind,name:d.name,level:d.level,x,y,hp:d.hp,maxHp:d.hp,damage:d.damage,color:d.color,respawnAt:0,lastHit:0};
}
const resources=[
 {kind:'tree',name:'Tree',skill:'woodcutting',item:'logs',level:1,xp:25,region:[150,800,950,1420],count:15},
 {kind:'oak',name:'Oak Tree',skill:'woodcutting',item:'oak_logs',level:15,xp:55,region:[1000,1180,1750,1660],count:12},
 {kind:'copper',name:'Copper Rock',skill:'mining',item:'copper_ore',level:1,xp:18,region:[850,1450,1400,2180],count:12},
 {kind:'iron',name:'Iron Rock',skill:'mining',item:'iron_ore',level:15,xp:42,region:[1480,1650,2150,2200],count:10},
 {kind:'shrimp',name:'Shrimp Spot',skill:'fishing',item:'raw_shrimp',level:1,xp:20,region:[150,1600,650,2100],count:10},
 {kind:'trout',name:'Trout Spot',skill:'fishing',item:'raw_trout',level:20,xp:55,region:[680,1810,1180,2210],count:8}
];
for(const d of resources)for(let i=0;i<d.count;i++){
 const id=d.kind+'_'+i;
 nodes[id]={id,kind:d.kind,name:d.name,skill:d.skill,item:d.item,level:d.level,xp:d.xp,
 x:d.region[0]+(i*97+23)%(d.region[2]-d.region[0]),y:d.region[1]+(i*127+17)%(d.region[3]-d.region[1]),readyAt:0};
}
const obstacle=p=>VILLAGE.buildings.some(b=>p.x>b.x-17&&p.x<b.x+b.w+17&&p.y>b.y-17&&p.y<b.y+b.h+17);
function addXp(p,key,amount){const s=p.skills[key];if(!s)return;s.xp+=amount;s.level=xpLevel(s.xp);}
function tell(p,text){io.to(p.id).emit('serverMessage',text);}
function inventoryAdd(p,id){if(p.inventory.length>=28){tell(p,'Inventory full (28 slots).');return false;}p.inventory.push(id);return true;}
function newPlayer(id){return {id,name:'Adventurer',loggedIn:false,x:SPAWN.x,y:SPAWN.y,targetX:SPAWN.x,targetY:SPAWN.y,hp:20,maxHp:20,gold:0,
 combatStyle:'attack',targetNpc:null,targetNode:null,lastAction:0,inventory:['bronze_sword','shortbow','bread'],
 equipment:{weapon:'bronze_sword',offhand:null},
 quests:{welcome:{status:'active',progress:0,goal:1},goblin_hunt:{status:'locked',progress:0,goal:3}},
 skills:Object.fromEntries(['attack','strength','defence','ranging','hitpoints','woodcutting','mining','fishing'].map(k=>[k,skill(k==='hitpoints'?5000:0)]))};}
app.get('/health',(_,res)=>res.json({ok:true,players:Object.keys(players).length}));
io.on('connection',socket=>{
 if(Object.keys(players).length>=100){socket.disconnect(true);return;}
 const p=newPlayer(socket.id);players[socket.id]=p;
 socket.emit('catalog',{items:ITEMS,size:SIZE});
 socket.on('login',data=>{
  if(p.loggedIn)return;
  const name=typeof data?.name==='string'?data.name.trim().replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,18):'';
  if(name.length<2){tell(p,'Name must contain at least 2 letters.');return;}
  p.name=name;p.loggedIn=true;socket.emit('loginSuccess',{id:p.id});tell(p,'Welcome to Oakvale! Speak to the Village Elder.');
 });
 socket.on('move',pos=>{if(!p.loggedIn||!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return;
  p.targetX=clamp(pos.x,20,SIZE-20);p.targetY=clamp(pos.y,20,SIZE-20);p.targetNpc=null;p.targetNode=null;});
 socket.on('attack',id=>{if(!p.loggedIn||typeof id!=='string'||!Object.hasOwn(enemies,id)||enemies[id].hp<=0)return;
  p.targetNpc=id;p.targetNode=null;});
 socket.on('gather',id=>{if(!p.loggedIn||typeof id!=='string'||!Object.hasOwn(nodes,id))return;
  p.targetNode=id;p.targetNpc=null;});
 socket.on('setStyle',style=>{if(!p.loggedIn||!['attack','strength','ranging'].includes(style))return;
  p.combatStyle=ITEMS[p.equipment.weapon]?.style==='ranging'?'ranging':style==='ranging'?'attack':style;});
 socket.on('equip',id=>{if(!p.loggedIn||typeof id!=='string'||!p.inventory.includes(id))return;
  const item=ITEMS[id];if(!item||!['weapon','offhand'].includes(item.slot))return;
  if(item.slot==='offhand'&&ITEMS[p.equipment.weapon]?.style==='ranging'){tell(p,'A bow requires both hands.');return;}
  p.equipment[item.slot]=id;
  if(item.slot==='weapon'){p.combatStyle=item.style==='ranging'?'ranging':'attack';if(item.style==='ranging')p.equipment.offhand=null;}
  tell(p,'Equipped '+item.name);});
 socket.on('useItem',id=>{if(!p.loggedIn||id!=='bread'||p.hp>=p.maxHp)return;
  const idx=p.inventory.indexOf(id);if(idx<0)return;p.inventory.splice(idx,1);p.hp=Math.min(p.maxHp,p.hp+7);tell(p,'You eat some bread.');});
 socket.on('interact',id=>{
  const v=VILLAGE.villagers.find(n=>n.id===id);if(!p.loggedIn||!v||distance(p,v)>95)return;
  if(id==='guard'){tell(p,'Guard: The forest and mine are beyond the village. Stronger monsters live farther east.');return;}
  if(p.quests.welcome.status==='active'){p.quests.welcome={status:'complete',progress:1,goal:1};p.quests.goblin_hunt.status='active';p.gold+=10;tell(p,'Elder: Welcome! +10 gold. Defeat three goblins.');}
  else if(p.quests.goblin_hunt.status==='active'&&p.quests.goblin_hunt.progress>=3){p.quests.goblin_hunt.status='complete';p.gold+=40;inventoryAdd(p,'wooden_shield');inventoryAdd(p,'bread');tell(p,'Quest complete! +40 gold and starter equipment.');}
  else tell(p,'Elder: Train your skills and return when your task is done.');
 });
 socket.on('disconnect',()=>delete players[socket.id]);
});
const effects=[];
setInterval(()=>{
 const now=Date.now();effects.length=0;
 for(const npc of Object.values(enemies))if(npc.hp<=0&&now>=npc.respawnAt){npc.hp=npc.maxHp;npc.lastHit=0;}
 for(const p of Object.values(players)){
  if(!p.loggedIn)continue;
  const target=p.targetNpc?enemies[p.targetNpc]:null;
  const node=p.targetNode?nodes[p.targetNode]:null;
  if(target&&target.hp>0){
   const range=p.combatStyle==='ranging'?190:52;
   if(distance(p,target)<=range){
    p.targetX=p.x;p.targetY=p.y;
    if(now-p.lastAction>=1200){
     p.lastAction=now;
     const attack=p.skills[p.combatStyle==='ranging'?'ranging':'attack'].level;
     const power=p.skills[p.combatStyle==='ranging'?'ranging':'strength'].level;
     const chance=clamp(.58+(attack-target.level)*.012,.12,.94);
     const hit=Math.random()<chance?Math.floor(Math.random()*(3+power*.42+(ITEMS[p.equipment.weapon]?.power||0)))+1:0;
     const dmg=Math.min(target.hp,hit);target.hp-=dmg;
     if(dmg>0){addXp(p,p.combatStyle,dmg*4);addXp(p,'hitpoints',Math.max(1,Math.floor(dmg*1.33)));}
     effects.push({x:target.x,y:target.y,damage:dmg,style:p.combatStyle,fromX:p.x,fromY:p.y});
     if(target.hp<=0){target.respawnAt=now+6000;p.targetNpc=null;p.gold+=Math.max(1,target.level);
      if(target.kind==='goblin'&&p.quests.goblin_hunt.status==='active')p.quests.goblin_hunt.progress=Math.min(3,p.quests.goblin_hunt.progress+1);
      tell(p,'Defeated '+target.name+' (level '+target.level+').');}
    }
   }else{p.targetX=target.x;p.targetY=target.y;}
  }else if(p.targetNpc)p.targetNpc=null;
  if(node){
   if(distance(p,node)<=65){p.targetX=p.x;p.targetY=p.y;
    if(now-p.lastAction>=1800){
     p.lastAction=now;
     if(p.skills[node.skill].level<node.level){tell(p,'Requires '+node.skill+' level '+node.level+'.');p.targetNode=null;}
     else if(now<node.readyAt){tell(p,'Resource depleted. Wait for respawn.');p.targetNode=null;}
     else if(inventoryAdd(p,node.item)){addXp(p,node.skill,node.xp);node.readyAt=now+7000;tell(p,'Gathered '+ITEMS[node.item].name+' (+'+node.xp+' XP).');p.targetNode=null;}
     else p.targetNode=null;
    }
   }else{p.targetX=node.x;p.targetY=node.y;}
  }
  const before={x:p.x,y:p.y},dx=p.targetX-p.x,dy=p.targetY-p.y,d=Math.hypot(dx,dy);
  if(d>SPEED){p.x+=dx/d*SPEED;p.y+=dy/d*SPEED;}else{p.x=p.targetX;p.y=p.targetY;}
  p.x=clamp(p.x,18,SIZE-18);p.y=clamp(p.y,18,SIZE-18);
  if(obstacle(p)){p.x=before.x;p.y=before.y;p.targetX=p.x;p.targetY=p.y;p.targetNpc=null;p.targetNode=null;}
  for(const npc of Object.values(enemies))if(npc.hp>0&&distance(p,npc)<50&&now-npc.lastHit>2400){
   npc.lastHit=now;p.hp=Math.max(0,p.hp-Math.max(1,npc.damage-Math.floor(p.skills.defence.level/12)));
   addXp(p,'defence',2);
   if(p.hp<=0){p.hp=p.maxHp;p.x=SPAWN.x;p.y=SPAWN.y;p.targetX=p.x;p.targetY=p.y;p.targetNpc=null;p.targetNode=null;tell(p,'You respawned in Oakvale.');}
  }
 }
 const snapshot={size:SIZE,village:VILLAGE,players:Object.fromEntries(Object.values(players).filter(p=>p.loggedIn).map(p=>[p.id,p])),
  npcs:enemies,nodes,projectiles:effects};
 io.emit('state',snapshot);
},TICK);
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('MiniScape online'));
