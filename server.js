'use strict';
const express=require('express'),http=require('http'),path=require('path'),crypto=require('crypto');
const {Server}=require('socket.io');
const {TICK_MS,WORLD_SIZE,BAG_SLOTS,ITEMS,VILLAGE,SHOPS,ENEMY_TEMPLATES,RESOURCE_TEMPLATES}=require('./game/content');
const {xpForLevel,skill,addXp,dist,clamp,count,addItem,removeItem,weaponOf,allowedStyles,equip,attackDelayMs,attackRange,combatRoll,awardCombatXp,collides,makePath}=require('./game/rules');
const app=express();app.disable('x-powered-by');app.use(express.static(path.join(__dirname,'public')));
const server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:4096});
const STEP_MS=100,STATE_MS=200,MOVE_PER_STEP=12,SPAWN={x:380,y:380};
const players=Object.create(null),enemies=Object.create(null),nodes=Object.create(null),groundItems=Object.create(null);
let effects=[];
for(const d of ENEMY_TEMPLATES)for(let i=0;i<d.count;i++){
 const id=d.kind+'_'+i;
 enemies[id]={id,kind:d.kind,name:d.name,level:d.level,
 x:d.region[0]+(i*83+31)%(d.region[2]-d.region[0]),y:d.region[1]+(i*109+43)%(d.region[3]-d.region[1]),
 hp:d.hp,maxHp:d.hp,damage:d.damage,defence:d.defence,weakness:d.weakness,aggressive:d.aggressive,color:d.color,targetPlayer:null,respawnAt:0,lastHit:0};
}
for(const d of RESOURCE_TEMPLATES)for(let i=0;i<d.count;i++){
 const id=d.kind+'_'+i;
 nodes[id]={id,kind:d.kind,name:d.name,skill:d.skill,item:d.item,level:d.level,xp:d.xp,tool:d.tool,
 x:d.region[0]+(i*97+23)%(d.region[2]-d.region[0]),y:d.region[1]+(i*127+17)%(d.region[3]-d.region[1]),readyAt:0};
}
const safeId=id=>typeof id==='string'&&id.length<80;
const has=(obj,id)=>safeId(id)&&Object.hasOwn(obj,id);
const send=(p,msg)=>io.to(p.id).emit('serverMessage',msg);
function playerProfile(p){
 return {id:p.id,name:p.name,hp:p.hp,maxHp:p.maxHp,gold:p.gold,inventory:p.inventory,equipment:p.equipment,
 bank:p.bank,quests:p.quests,skills:p.skills,combatStyle:p.combatStyle,openBuilding:p.openBuilding,autoRetaliate:p.autoRetaliate};
}
function pushProfile(p){io.to(p.id).emit('profile',playerProfile(p));}
function newPlayer(id){
 const inventory=[];for(const [item,qty] of [['bronze_scimitar',1],['shortbow',1],['bronze_arrow',120],['bronze_axe',1],['bronze_pickaxe',1],['small_net',1],['bread',2]])addItem(inventory,item,qty);
 return {id,name:'Adventurer',loggedIn:false,x:SPAWN.x,y:SPAWN.y,hp:20,maxHp:20,gold:130,inventory,
 equipment:{weapon:'bronze_scimitar',offhand:null,ammo:'bronze_arrow'},bank:[],
 quests:{welcome:{status:'active',progress:0,goal:1},goblin_hunt:{status:'locked',progress:0,goal:3}},
 skills:Object.fromEntries(['attack','strength','defence','ranging','hitpoints','woodcutting','mining','fishing'].map(k=>[k,skill(k==='hitpoints'?xpForLevel(10):0)])),
 combatStyle:'accurate',autoRetaliate:false,path:[],intent:null,nextAttack:0,openBuilding:null};
}
function stop(p){p.path=[];p.intent=null;}
function navigate(p,point,intent=null){
 const dest={x:clamp(point.x,18,WORLD_SIZE-18),y:clamp(point.y,18,WORLD_SIZE-18)};
 const path=makePath(p,dest);
 if(!path.length&&dist(p,dest)>24){send(p,'That location is unreachable.');return false;}
 p.path=path;p.intent=intent;p.openBuilding=null;return true;
}
function reachable(p,entity,radius=85){return dist(p,entity)<=radius;}
function buildingById(id){return VILLAGE.buildings.find(b=>b.id===id);}
function openBuilding(p,b){
 if(!b||!reachable(p,b.door,90))return false;
 stop(p);p.openBuilding=b.id;
 io.to(p.id).emit('buildingOpen',{id:b.id,name:b.name});
 pushProfile(p);return true;
}
function merchant(p){return p.openBuilding&&SHOPS[p.openBuilding]&&buildingById(p.openBuilding)&&reachable(p,buildingById(p.openBuilding).door,110)?SHOPS[p.openBuilding]:null;}
function bankReady(p){return p.openBuilding==='bank'&&reachable(p,buildingById('bank').door,110);}
function ensureEquipped(p){
 for(const slot of ['weapon','offhand','ammo'])if(p.equipment[slot]&&count(p.inventory,p.equipment[slot])<1)p.equipment[slot]=null;
 if(!p.equipment.weapon){p.combatStyle='accurate';p.intent=null;}
}
function handleElder(p,id){
 const npc=VILLAGE.villagers.find(v=>v.id===id);if(!npc||!reachable(p,npc,90))return;
 if(id==='guard'){send(p,'Guard: Beware! Wolves, skeletons and orcs roam far beyond Oakvale.');return;}
 if(p.quests.welcome.status==='active'){
  p.quests.welcome={status:'complete',progress:1,goal:1};p.quests.goblin_hunt.status='active';p.gold+=10;
  send(p,'Elder: Welcome to Oakvale! +10 gold. Defeat three goblins and return.');
 }else if(p.quests.goblin_hunt.status==='active'&&p.quests.goblin_hunt.progress>=3){
  if(p.inventory.length+2>BAG_SLOTS){send(p,'You need two free inventory slots for the reward.');return;}
  p.quests.goblin_hunt.status='complete';p.gold+=40;addItem(p.inventory,'bronze_shield');addItem(p.inventory,'bread');
  send(p,'Quest complete! +40 gold, Bronze Shield and Bread.');
 }else send(p,'Elder: Train your skills, defeat goblins and return for your reward.');
 pushProfile(p);
}
function actionDone(p,now){
 const action=p.intent;if(!action)return;
 if(action.type==='building'){
  const b=buildingById(action.id);if(b&&reachable(p,b.door,88))openBuilding(p,b);
 }else if(action.type==='talk'){
  const v=VILLAGE.villagers.find(n=>n.id===action.id);
  if(v&&reachable(p,v,85)){stop(p);handleElder(p,v.id);}
 }else if(action.type==='pickup'){
  const g=groundItems[action.id];if(!g){stop(p);return;}
  if(reachable(p,g,48)){
   if(addItem(p.inventory,g.item,g.qty)){delete groundItems[g.id];send(p,'Picked up '+ITEMS[g.item].name+'.');pushProfile(p);}
   else send(p,'Your inventory is full.');
   stop(p);
  }
 }else if(action.type==='gather'){
  const n=nodes[action.id];if(!n){stop(p);return;}
  if(!reachable(p,n,65))return;
  if(now<p.nextGather)return;
  p.nextGather=now+TICK_MS*3;
  if(p.skills[n.skill].level<n.level){send(p,'Requires '+n.skill+' level '+n.level+'.');stop(p);return;}
  const toolId=n.tool==='axe'?(count(p.inventory,'iron_axe')?'iron_axe':'bronze_axe'):n.tool==='pickaxe'?(count(p.inventory,'iron_pickaxe')?'iron_pickaxe':'bronze_pickaxe'):n.tool;
  if(!count(p.inventory,toolId)){send(p,'You need a '+(ITEMS[toolId]?.name||'tool')+'.');stop(p);return;}
  if(now<n.readyAt){send(p,'This resource has been depleted.');stop(p);return;}
  if(!addItem(p.inventory,n.item)){send(p,'Inventory full (28 slots).');stop(p);return;}
  addXp(p,n.skill,n.xp);n.readyAt=now+7500;send(p,'Gathered '+ITEMS[n.item].name+' · +'+n.xp+' '+n.skill+' XP');
  stop(p);pushProfile(p);
 }else if(action.type==='attack'){
  const n=enemies[action.id];if(!n||n.hp<=0){stop(p);return;}
  if(!reachable(p,n,attackRange(p)))return;
  p.path=[];
  if(now<p.nextAttack)return;
  const w=weaponOf(p);
  if(w.ammo){
   const ammo=ITEMS[p.equipment.ammo];
   if(!ammo||ammo.ammo!==w.ammo||count(p.inventory,ammo.id)<1){send(p,'You have no compatible ammunition equipped.');stop(p);return;}
  }
  const outcome=combatRoll(p,n);
  if(w.ammo){removeItem(p.inventory,p.equipment.ammo,1);ensureEquipped(p);}p.nextAttack=now+attackDelayMs(p);
  const actual=Math.min(n.hp,outcome.hit);n.hp-=actual;n.targetPlayer=p.id;awardCombatXp(p,actual);
  effects.push({x:n.x,y:n.y,damage:actual,style:w.type==='ranged'?'ranged':outcome.type,fromX:p.x,fromY:p.y});
  if(n.hp<=0){
   n.targetPlayer=null;n.respawnAt=now+6500;p.gold+=Math.max(2,n.level*2);
   if(n.kind==='goblin'&&p.quests.goblin_hunt.status==='active')p.quests.goblin_hunt.progress=Math.min(3,p.quests.goblin_hunt.progress+1);
   send(p,'Defeated '+n.name+' (level '+n.level+').');
   stop(p);
  }
  pushProfile(p);
 }
}
function stepMove(p){
 if(!p.path.length)return;
 let move=MOVE_PER_STEP;
 while(move>0&&p.path.length){
  const waypoint=p.path[0],d=dist(p,waypoint);
  if(d<=move+0.001){const before={x:p.x,y:p.y};p.x=waypoint.x;p.y=waypoint.y;move-=d;p.path.shift();if(collides(p)){p.x=before.x;p.y=before.y;stop(p);return;}}
  else {const before={x:p.x,y:p.y};p.x+=(waypoint.x-p.x)/d*move;p.y+=(waypoint.y-p.y)/d*move;move=0;if(collides(p)){p.x=before.x;p.y=before.y;stop(p);return;}}
 }
 p.x=clamp(p.x,18,WORLD_SIZE-18);p.y=clamp(p.y,18,WORLD_SIZE-18);
}
app.get('/health',(_,res)=>res.json({ok:true,players:Object.keys(players).length}));
io.on('connection',socket=>{
 if(Object.keys(players).length>=100){socket.emit('serverMessage','World is full.');socket.disconnect(true);return;}
 const p=newPlayer(socket.id);players[socket.id]=p;
 socket.emit('catalog',{items:ITEMS,shops:SHOPS,village:VILLAGE,size:WORLD_SIZE,tickMs:TICK_MS});
 socket.on('login',data=>{
  if(p.loggedIn)return;const raw=typeof data?.name==='string'?data.name:'';
  const name=raw.trim().replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,18);
  if(name.length<2){send(p,'Character name must be at least two letters.');return;}
  p.name=name;p.loggedIn=true;socket.emit('loginSuccess',{id:p.id});send(p,'Welcome to Oakvale! Visit a building, equip a weapon or gather resources.');pushProfile(p);
 });
 socket.on('move',pos=>{
  if(!p.loggedIn||!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return;
  navigate(p,pos);
 });
 socket.on('visitBuilding',id=>{
  if(!p.loggedIn||!safeId(id))return;
  const b=buildingById(id);if(!b)return;
  if(!openBuilding(p,b))navigate(p,b.door,{type:'building',id});
 });
 socket.on('interact',id=>{
  if(!p.loggedIn||!safeId(id))return;
  const v=VILLAGE.villagers.find(x=>x.id===id);if(!v)return;
  if(reachable(p,v,85))handleElder(p,id);else navigate(p,v,{type:'talk',id});
 });
 socket.on('attack',id=>{
  if(!p.loggedIn||!has(enemies,id)||enemies[id].hp<=0)return;
  const n=enemies[id];if(reachable(p,n,attackRange(p))){p.path=[];p.intent={type:'attack',id};p.openBuilding=null;}
  else navigate(p,n,{type:'attack',id});
 });
 socket.on('gather',id=>{
  if(!p.loggedIn||!has(nodes,id))return;
  const n=nodes[id];if(reachable(p,n,65)){p.path=[];p.intent={type:'gather',id};p.openBuilding=null;}
  else navigate(p,n,{type:'gather',id});
 });
 socket.on('toggleRetaliate',enabled=>{if(!p.loggedIn||typeof enabled!=='boolean')return;p.autoRetaliate=enabled;pushProfile(p);});
 socket.on('setStyle',style=>{
  if(!p.loggedIn||!safeId(style)||!allowedStyles(weaponOf(p)).includes(style))return;
  p.combatStyle=style;pushProfile(p);
 });
 socket.on('equip',id=>{
  if(!p.loggedIn||!has(ITEMS,id))return;
  const outcome=equip(p,id);send(p,outcome.message);if(outcome.ok)pushProfile(p);
 });
 socket.on('unequip',slot=>{
  if(!p.loggedIn||!['weapon','offhand','ammo'].includes(slot))return;
  p.equipment[slot]=null;if(slot==='weapon'){p.combatStyle='accurate';stop(p);}pushProfile(p);
 });
 socket.on('useItem',id=>{
  if(!p.loggedIn||!has(ITEMS,id))return;
  const item=ITEMS[id];if(item.category!=='food'||p.hp>=p.maxHp||count(p.inventory,id)<1)return;
  removeItem(p.inventory,id,1);p.hp=Math.min(p.maxHp,p.hp+item.heal);send(p,'You eat '+item.name+' (+'+item.heal+' HP).');pushProfile(p);
 });
 socket.on('dropItem',id=>{
  if(!p.loggedIn||!has(ITEMS,id)||!removeItem(p.inventory,id,1))return;
  ensureEquipped(p);const dropId=crypto.randomUUID();
  groundItems[dropId]={id:dropId,item:id,qty:1,x:p.x+12,y:p.y+12,expires:Date.now()+180000};pushProfile(p);
 });
 socket.on('pickup',id=>{
  if(!p.loggedIn||!has(groundItems,id))return;
  const g=groundItems[id];if(reachable(p,g,48)){p.intent={type:'pickup',id};actionDone(p,Date.now());}
  else navigate(p,g,{type:'pickup',id});
 });
 socket.on('buy',data=>{
  const shop=merchant(p);if(!p.loggedIn||!shop||!has(ITEMS,data?.id)||!shop.items.includes(data.id))return;
  const qty=Number(data.qty);if(![1,5,10,50].includes(qty))return;
  const item=ITEMS[data.id],price=item.price*qty;if(p.gold<price){send(p,'Not enough gold.');return;}
  if(!addItem(p.inventory,item.id,qty)){send(p,'Inventory full.');return;}
  p.gold-=price;send(p,'Purchased '+qty+' × '+item.name+'.');pushProfile(p);
 });
 socket.on('sell',data=>{
  const shop=merchant(p);if(!p.loggedIn||!shop||!has(ITEMS,data?.id))return;
  const qty=Number(data.qty);if(![1,5,10,50].includes(qty))return;
  if(!removeItem(p.inventory,data.id,qty)){send(p,'You do not have enough items.');return;}
  p.gold+=Math.max(1,Math.floor(ITEMS[data.id].price/2))*qty;ensureEquipped(p);
  send(p,'Sold '+qty+' × '+ITEMS[data.id].name+'.');pushProfile(p);
 });
 socket.on('rest',()=>{
  if(!p.loggedIn||p.openBuilding!=='tavern'||!reachable(p,buildingById('tavern').door,110))return;
  if(p.gold<10){send(p,'You need 10 gold to rest.');return;}
  if(p.hp>=p.maxHp){send(p,'You are already fully healed.');return;}
  p.gold-=10;p.hp=p.maxHp;send(p,'You rested and restored your health.');pushProfile(p);
 });
 socket.on('bankDeposit',data=>{
  if(!p.loggedIn||!bankReady(p)||!has(ITEMS,data?.id))return;
  const qty=Number(data.qty);if(![1,5,10,50].includes(qty))return;
  if(!removeItem(p.inventory,data.id,qty))return;
  if(!addItem(p.bank,data.id,qty,200)){addItem(p.inventory,data.id,qty);send(p,'Bank is full.');return;}
  ensureEquipped(p);pushProfile(p);
 });
 socket.on('bankWithdraw',data=>{
  if(!p.loggedIn||!bankReady(p)||!has(ITEMS,data?.id))return;
  const qty=Number(data.qty);if(![1,5,10,50].includes(qty))return;
  if(count(p.bank,data.id)<qty)return;
  if(!addItem(p.inventory,data.id,qty)){send(p,'Inventory full.');return;}
  removeItem(p.bank,data.id,qty);pushProfile(p);
 });
 socket.on('disconnect',()=>delete players[socket.id]);
});
let lastSnapshot=0;
setInterval(()=>{
 const now=Date.now();
 for(const n of Object.values(enemies))if(n.hp<=0&&now>=n.respawnAt){n.hp=n.maxHp;n.lastHit=0;n.targetPlayer=null;}
 for(const [id,g] of Object.entries(groundItems))if(now>=g.expires)delete groundItems[id];
 for(const p of Object.values(players)){
  if(!p.loggedIn)continue;
  const intent=p.intent;
  if(intent?.type==='attack'){
   const n=enemies[intent.id];if(!n||n.hp<=0){stop(p);continue;}
   if(reachable(p,n,attackRange(p)))p.path=[];
   else if(!p.path.length)navigate(p,n,intent);
  }
  if(intent?.type==='gather'){
   const n=nodes[intent.id];if(!n){stop(p);continue;}
   if(reachable(p,n,65))p.path=[];
   else if(!p.path.length)navigate(p,n,intent);
  }
  if(intent?.type==='building'||intent?.type==='talk'||intent?.type==='pickup')actionDone(p,now);
  if(p.path.length)stepMove(p);
  if(p.intent)actionDone(p,now);
  for(const n of Object.values(enemies))if(n.hp>0&&(n.aggressive||n.targetPlayer===p.id)&&reachable(p,n,48)&&now-n.lastHit>=2400){
   n.lastHit=now;p.hp=Math.max(0,p.hp-Math.max(1,n.damage-Math.floor(p.skills.defence.level/12)-(p.equipment.offhand?1:0)));
   if(p.autoRetaliate&&p.hp>0&&!p.intent){p.intent={type:'attack',id:n.id};p.path=[];}
   if(!p.hp){p.hp=p.maxHp;p.x=SPAWN.x;p.y=SPAWN.y;stop(p);p.openBuilding=null;send(p,'You respawned in Oakvale.');}
   pushProfile(p);
  }
  if(p.openBuilding&&!reachable(p,buildingById(p.openBuilding)?.door||SPAWN,130)){p.openBuilding=null;pushProfile(p);}
 }
 const state={players:Object.fromEntries(Object.values(players).filter(p=>p.loggedIn).map(p=>[p.id,{id:p.id,name:p.name,x:p.x,y:p.y,hp:p.hp,maxHp:p.maxHp,combatStyle:p.combatStyle,weapon:p.equipment.weapon}])),
 npcs:enemies,nodes,groundItems,projectiles:effects};
 if(now-lastSnapshot>=STATE_MS){io.emit('state',state);effects=[];lastSnapshot=now;}
},STEP_MS);
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('MiniScape server online'));
