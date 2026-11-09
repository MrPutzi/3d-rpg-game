'use strict';
const express=require('express'),http=require('http'),path=require('path'),crypto=require('crypto');
const {Server}=require('socket.io');
const {TICK_MS,WORLD_SIZE,BAG_SLOTS,ITEMS,VILLAGE,SHOPS,ENEMY_TEMPLATES,RESOURCE_TEMPLATES}=require('./game/content');
const {xpForLevel,skill,addXp,dist,clamp,count,addItem,removeItem,weaponOf,allowedStyles,equip,attackDelayMs,attackRange,combatRoll,awardCombatXp,collides,makePath}=require('./game/rules');
const {SKILLS,RECIPES,QUESTS,REGIONS,rollDrops}=require('./game/progression');
const {stationLocation,questProgress,turnInQuest}=require('./game/activities');
const Production=require('./game/production');
const Encounters=require('./game/encounters');
const Economy=require('./game/economy');
const {accountStore}=require('./game/accounts');
const accountDb=accountStore(),activeAccounts=new Map(),saving=new Map();
const PAPER_SLOTS=['head','cape','neck','weapon','body','offhand','legs','hands','feet','ring','ammo'];
const app=express();app.disable('x-powered-by');app.use(express.static(path.join(__dirname,'public')));
const server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:4096});
const STEP_MS=100,STATE_MS=200,MOVE_PER_STEP=12,SPAWN={x:380,y:380};
const players=Object.create(null),enemies=Object.create(null),nodes=Object.create(null),groundItems=Object.create(null);
let effects=[];
for(const d of ENEMY_TEMPLATES)for(let i=0;i<d.count;i++){
 const id=d.kind+'_'+i;
 enemies[id]={id,kind:d.kind,name:d.name,level:d.level,
 x:d.region[0]+(i*83+31)%(d.region[2]-d.region[0]),y:d.region[1]+(i*109+43)%(d.region[3]-d.region[1]),
 hp:d.hp,maxHp:d.hp,damage:d.damage,defence:d.defence,weakness:d.weakness,aggressive:d.aggressive,color:d.color,targetPlayer:null,respawnAt:0,lastHit:0,
 homeX:d.region[0]+(i*83+31)%(d.region[2]-d.region[0]),homeY:d.region[1]+(i*109+43)%(d.region[3]-d.region[1]),territoryRadius:Math.min(105,50+d.level*1.2),nextWander:0,wanderX:0,wanderY:0};
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
 bank:p.bank,quests:p.quests,skills:p.skills,combatStyle:p.combatStyle,openBuilding:p.openBuilding,autoRetaliate:p.autoRetaliate,slayerKills:p.slayerKills,production:p.production||null,serverNow:Date.now()};
}
function pushProfile(p){io.to(p.id).emit('profile',playerProfile(p));}
function storedProfile(p){return{x:p.x,y:p.y,hp:p.hp,maxHp:p.maxHp,gold:p.gold,inventory:p.inventory,
 equipment:p.equipment,bank:p.bank,quests:p.quests,skills:p.skills,combatStyle:p.combatStyle,
 autoRetaliate:p.autoRetaliate,slayerKills:p.slayerKills};}
function hydrate(p,account){
 const d=account.profile||{},fresh=newPlayer(p.id);
 for(const field of ['x','y','hp','maxHp','gold','inventory','equipment','bank','quests','skills','combatStyle','autoRetaliate','slayerKills']){
  if(Object.hasOwn(d,field))fresh[field]=d[field];
 }
 for(const k of SKILLS)fresh.skills[k]=fresh.skills[k]||skill(k==='hitpoints'?xpForLevel(10):0);
 for(const [id,def] of Object.entries(QUESTS))fresh.quests[id]=fresh.quests[id]||{status:def.after&&fresh.quests[def.after]?.status!=='complete'?'locked':'active',progress:0,goal:def.goal};
 fresh.equipment={...newPlayer(p.id).equipment,...fresh.equipment};
 fresh.x=Number.isFinite(fresh.x)?clamp(fresh.x,30,WORLD_SIZE-30):SPAWN.x;
 fresh.y=Number.isFinite(fresh.y)?clamp(fresh.y,30,WORLD_SIZE-30):SPAWN.y;
 fresh.hp=Math.max(1,Math.min(fresh.maxHp,fresh.hp||20));
 if(!Array.isArray(fresh.inventory))fresh.inventory=newPlayer(p.id).inventory;
 if(!Array.isArray(fresh.bank))fresh.bank=[];
 if(fresh.inventory.length>BAG_SLOTS)fresh.inventory=fresh.inventory.slice(0,BAG_SLOTS);
 if(collides(fresh)){fresh.x=SPAWN.x;fresh.y=SPAWN.y;}
 Object.assign(p,fresh,{id:p.id,name:account.username,loggedIn:true,accountId:account.id,path:[],intent:null,openBuilding:null,nextAttack:0});
}
function persist(p){
 if(!p.accountId)return Promise.resolve();
 const id=p.accountId,snapshot=structuredClone(storedProfile(p));
 const next=(saving.get(id)||Promise.resolve()).catch(()=>{}).then(()=>accountDb.save(id,snapshot));
 saving.set(id,next);next.catch(e=>console.error('Profile save failed',e.message));return next;
}
function newPlayer(id){
 const inventory=[];for(const [item,qty] of [['bronze_scimitar',1],['shortbow',1],['bronze_arrow',120],['bronze_axe',1],['bronze_pickaxe',1],['small_net',1],['bread',2]])addItem(inventory,item,qty);
 return {id,name:'Adventurer',loggedIn:false,x:SPAWN.x,y:SPAWN.y,hp:20,maxHp:20,gold:130,inventory,
 equipment:{head:null,cape:null,neck:null,weapon:'bronze_scimitar',body:null,offhand:null,legs:null,hands:null,feet:null,ring:null,ammo:'bronze_arrow'},bank:[],
 quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}])),
 skills:Object.fromEntries(SKILLS.map(k=>[k,skill(k==='hitpoints'?xpForLevel(10):0)])),
 combatStyle:'accurate',autoRetaliate:false,path:[],intent:null,nextAttack:0,openBuilding:null,slayerKills:0};
}
function stop(p){p.path=[];p.intent=null;if(Production.cancel(p))pushProfile(p);}
function navigate(p,point,intent=null){
 const dest={x:clamp(point.x,18,WORLD_SIZE-18),y:clamp(point.y,18,WORLD_SIZE-18)};
 const path=makePath(p,dest);
 if(!path.length&&dist(p,dest)>24){send(p,'That location is unreachable.');return false;}
 Production.cancel(p);p.path=path;p.intent=intent;p.openBuilding=null;pushProfile(p);return true;
}
function reachable(p,entity,radius=85){return dist(p,entity)<=radius;}
function buildingById(id){return VILLAGE.buildings.find(b=>b.id===id);}
function openBuilding(p,b){
 if(!b||!reachable(p,b.door,90))return false;
 stop(p);p.openBuilding=b.id;
 io.to(p.id).emit('buildingOpen',{id:b.id,name:b.name});
 if(SHOPS[b.id])io.to(p.id).emit('shopState',{id:b.id,...Economy.snapshot(b.id)});
 pushProfile(p);return true;
}
function merchant(p){return p.openBuilding&&SHOPS[p.openBuilding]&&buildingById(p.openBuilding)&&reachable(p,buildingById(p.openBuilding).door,110)?SHOPS[p.openBuilding]:null;}
function bankReady(p){return p.openBuilding==='bank'&&reachable(p,buildingById('bank').door,110);}
function ensureEquipped(p){
 for(const slot of PAPER_SLOTS)if(p.equipment[slot]&&count(p.inventory,p.equipment[slot])<1)p.equipment[slot]=null;
 if(!p.equipment.weapon){p.combatStyle='accurate';p.intent=null;}
}
function handleElder(p,id){
 const npc=VILLAGE.villagers.find(v=>v.id===id);if(!npc||!reachable(p,npc,90))return;
 const messages={guard:'Guard: Beware of the Eastern Wilds; bring armour and provisions.',
 forester:'Thorin: Chop five logs and return for a reward.',
 fisher:'Mara: Catch three shrimp at Moonwater Lake. After your first catch, cook three at the Oakvale tavern and bring the meals for our frontier patrol.',
 ranger:'Captain Rusk: Defeat two wolves to keep the frontier safe.'};
 if(id==='elder'&&p.quests.welcome.status==='active')questProgress(p,'talk','elder',1);
 const eligible=id==='elder'?['welcome','goblin_hunt']:id==='forester'?['forest_supplies']:id==='fisher'?['first_catch','cooked_supplies']:id==='ranger'?['wilds_patrol']:[];
 for(const questId of eligible){
  const outcome=turnInQuest(p,questId,id);
  if(outcome){send(p,outcome.message);pushProfile(p);return;}
 }
 send(p,messages[id]||'No tasks available at the moment.');pushProfile(p);
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
   if(g.ownerId&&g.ownerId!==p.id&&now<g.privateUntil){send(p,'Loot is reserved for another player.');stop(p);return;}
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
  addXp(p,n.skill,n.xp);questProgress(p,'gather',n.item,1);n.readyAt=now+7500;send(p,'Gathered '+ITEMS[n.item].name+' · +'+n.xp+' '+n.skill+' XP');
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
  const actual=Math.min(n.hp,outcome.hit);n.hp-=actual;Encounters.record(n,p,actual,now);n.targetPlayer=p.id;awardCombatXp(p,actual);
  effects.push({x:n.x,y:n.y,damage:actual,style:w.type==='ranged'?'ranged':outcome.type,fromX:p.x,fromY:p.y});
  if(n.hp<=0){finishEnemy(n,now);stop(p);}
  pushProfile(p);
 }
}
function finishEnemy(n,now){
 const outcome=Encounters.settle(n,players,now);if(!outcome)return;
 n.targetPlayer=null;n.respawnAt=now+6500;
 for(const reward of outcome.rewards){
  const p=players[reward.id];p.gold+=reward.gold;
  questProgress(p,'kill',n.kind,1);
  if(n.kind==='wolf')p.slayerKills++;
  io.to(p.id).emit('combatReward',{name:n.name,gold:reward.gold,damage:reward.damage,lootOwner:outcome.ownerId===p.id});
  pushProfile(p);
 }
 if(outcome.ownerId)for(const drop of rollDrops(n.kind)){
  if(!ITEMS[drop.id])continue;
  const id=crypto.randomUUID();
  groundItems[id]={id,item:drop.id,qty:drop.qty,
   x:clamp(n.x+(Math.random()-.5)*25,20,WORLD_SIZE-20),y:clamp(n.y+(Math.random()-.5)*25,20,WORLD_SIZE-20),
   ownerId:outcome.ownerId,privateUntil:now+15000,expires:now+180000};
 }
 for(const p of Object.values(players))if(p.selectedEnemyId===n.id)p.selectedEnemyId=null;
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
 socket.emit('catalog',{items:ITEMS,shops:SHOPS,village:VILLAGE,regions:REGIONS,recipes:RECIPES,quests:QUESTS,stations:stationLocation,size:WORLD_SIZE,tickMs:TICK_MS,accountsMode:accountDb.mode});
 let authAttempts=0,authWindow=Date.now();
 async function authenticate(operation,data){
  if(p.loggedIn)return;
  if(Date.now()-authWindow>60000){authAttempts=0;authWindow=Date.now();}
  if(++authAttempts>12){send(p,'Too many login attempts. Try again in a minute.');return;}
  try{
   let result;
   if(operation==='register'){const username=String(data?.username||'').trim();
    result=await accountDb.register(username,data?.password,storedProfile(newPlayer(p.id)));
   }else if(operation==='signIn')result=await accountDb.login(String(data?.username||''),data?.password);
   else if(operation==='resume'){
    const account=await accountDb.resume(data?.token);
    if(!account){socket.emit('authFailed','Session expired. Please log in again.');return;}
    result={account,token:data.token};
   }else return;
   const previous=activeAccounts.get(result.account.id);
   if(previous&&previous!==p.id){io.to(previous).emit('sessionReplaced');io.sockets.sockets.get(previous)?.disconnect(true);}
   hydrate(p,result.account);p.sessionToken=result.token;
   activeAccounts.set(p.accountId,p.id);
   socket.emit('loginSuccess',{id:p.id,username:p.name,token:result.token,registered:true});
   send(p,'Welcome to Oakvale, '+p.name+'! Your progress is linked to your account.');
   pushProfile(p);
  }catch(err){socket.emit('authFailed',err.message||'Authentication failed.');}
 }
 socket.on('register',data=>{authenticate('register',data).catch(e=>console.error('Registration failed',e.message));});
 socket.on('signIn',data=>{authenticate('signIn',data).catch(e=>console.error('Sign-in failed',e.message));});
 socket.on('resumeSession',data=>{authenticate('resume',data).catch(e=>console.error('Resume failed',e.message));});
 socket.on('guestLogin',data=>{
  if(p.loggedIn)return;
  const raw=typeof data?.name==='string'?data.name:'';
  const name=raw.trim().replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,18);
  if(name.length<2){send(p,'Guest name must be at least two characters.');return;}
  p.name=name;p.loggedIn=true;socket.emit('loginSuccess',{id:p.id,username:name,guest:true});
  send(p,'Guest mode: progress will not be saved.');pushProfile(p);
 });
 socket.on('logout',async()=>{
  if(!p.loggedIn)return;
  await persist(p);if(p.sessionToken)await accountDb.logout(p.sessionToken);
  if(p.accountId)activeAccounts.delete(p.accountId);
  socket.emit('loggedOut');socket.disconnect(true);
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
  const n=enemies[id];p.selectedEnemyId=id;if(reachable(p,n,attackRange(p))){p.path=[];p.intent={type:'attack',id};p.openBuilding=null;}
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
 socket.on('craft',data=>{
  if(!p.loggedIn)return;
  const id=typeof data==='string'?data:data?.id,qty=typeof data==='string'?1:data?.qty;
  const result=Production.start(p,id,qty,Date.now());
  send(p,result.message);if(result.ok)pushProfile(p);
 });
 socket.on('cancelProduction',()=>{if(p.loggedIn&&Production.cancel(p)){send(p,'Production cancelled. Completed items are kept.');pushProfile(p);}});
 socket.on('castSpell',id=>{
  if(!p.loggedIn||!has(enemies,id))return;
  const n=enemies[id],now=Date.now();
  if(Production.cancel(p))pushProfile(p);
  if(n.hp<=0||!reachable(p,n,210)||now<p.nextAttack)return;
  if(count(p.inventory,'air_rune')<1||count(p.inventory,'mind_rune')<1){send(p,'You need an Air rune and a Mind rune.');return;}
  p.selectedEnemyId=id;
  removeItem(p.inventory,'air_rune',1);removeItem(p.inventory,'mind_rune',1);
  const damage=Math.min(n.hp,Math.floor(Math.random()*5));
  n.hp-=damage;Encounters.record(n,p,damage,now);n.targetPlayer=p.id;p.nextAttack=now+TICK_MS*4;
  addXp(p,'magic',6+damage*2);if(damage)addXp(p,'hitpoints',damage*4/3);
  effects.push({x:n.x,y:n.y,damage,style:'magic',fromX:p.x,fromY:p.y});
  if(n.hp===0)finishEnemy(n,now);
  pushProfile(p);
 });
 socket.on('unequip',slot=>{
  if(!p.loggedIn||!PAPER_SLOTS.includes(slot))return;
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
  const shop=merchant(p);
  if(!p.loggedIn||!shop||!has(ITEMS,data?.id))return;
  const outcome=Economy.buy(p,p.openBuilding,data.id,Number(data.qty));
  send(p,outcome.message);
  if(outcome.ok){pushProfile(p);io.to(p.id).emit('shopState',{id:p.openBuilding,...Economy.snapshot(p.openBuilding)});}
 });
 socket.on('sell',data=>{
  const shop=merchant(p);
  if(!p.loggedIn||!shop||!has(ITEMS,data?.id))return;
  const outcome=Economy.sell(p,p.openBuilding,data.id,Number(data.qty));
  send(p,outcome.message);
  if(outcome.ok){ensureEquipped(p);pushProfile(p);io.to(p.id).emit('shopState',{id:p.openBuilding,...Economy.snapshot(p.openBuilding)});}
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
 socket.on('disconnect',()=>{
  if(p.accountId){
   if(activeAccounts.get(p.accountId)===p.id)activeAccounts.delete(p.accountId);
   persist(p);
  }
  delete players[socket.id];
 });
});
let lastSnapshot=0,lastRestock=0,lastSave=0;
setInterval(()=>{
 const now=Date.now();
 for(const n of Object.values(enemies)){
  if(n.hp<=0){
   if(now>=n.respawnAt){n.hp=n.maxHp;n.lastHit=0;n.targetPlayer=null;n.x=n.homeX;n.y=n.homeY;Encounters.reset(n);}
   continue;
  }
  if(!n.nextWander||now>=n.nextWander){
   n.nextWander=now+1500+Math.random()*5000;
   const theta=Math.random()*Math.PI*2,rad=Math.sqrt(Math.random())*n.territoryRadius;
   n.wanderX=clamp(n.homeX+Math.cos(theta)*rad,20,WORLD_SIZE-20);
   n.wanderY=clamp(n.homeY+Math.sin(theta)*rad,20,WORLD_SIZE-20);
  }
  const target=n.targetPlayer?players[n.targetPlayer]:null;
  const chase=target?.loggedIn&&dist(target,n)<150&&dist(target,{x:n.homeX,y:n.homeY})<n.territoryRadius+80;
  const destination=chase?target:{x:n.wanderX||n.homeX,y:n.wanderY||n.homeY};
  const dx=destination.x-n.x,dy=destination.y-n.y,d=Math.hypot(dx,dy);
  const speed=chase?2.8:1.2;
  if(d>3){
   const next={x:n.x+dx/d*Math.min(speed,d),y:n.y+dy/d*Math.min(speed,d)};
   if(dist(next,{x:n.homeX,y:n.homeY})<=n.territoryRadius+80&&!collides(next)){n.x=next.x;n.y=next.y;}
  }
  if(!chase&&n.targetPlayer)n.targetPlayer=null;
 }
 if(now-lastRestock>=60000){Economy.restock();lastRestock=now;}
 if(now-lastSave>=20000){for(const p of Object.values(players))if(p.loggedIn)persist(p);lastSave=now;}
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
  const productionResult=Production.advance(p,now);
  if(productionResult){send(p,productionResult.message);ensureEquipped(p);pushProfile(p);}
  for(const n of Object.values(enemies))if(n.hp>0&&(n.aggressive||n.targetPlayer===p.id)&&reachable(p,n,48)&&now-n.lastHit>=2400){
   Production.cancel(p);n.lastHit=now;p.hp=Math.max(0,p.hp-Math.max(1,n.damage-Math.floor(p.skills.defence.level/12)-Math.floor(Object.values(p.equipment).reduce((a,id)=>a+(ITEMS[id]?.defenceBonus||0),0)/6)));
   if(p.autoRetaliate&&p.hp>0&&!p.intent){p.intent={type:'attack',id:n.id};p.selectedEnemyId=n.id;p.path=[];}
   if(!p.hp){for(const enemy of Object.values(enemies))Encounters.forget(enemy,p.id);p.selectedEnemyId=null;p.hp=p.maxHp;p.x=SPAWN.x;p.y=SPAWN.y;stop(p);p.openBuilding=null;send(p,'You respawned in Oakvale.');}
   pushProfile(p);
  }
  if(p.openBuilding&&!reachable(p,buildingById(p.openBuilding)?.door||SPAWN,130)){p.openBuilding=null;pushProfile(p);}
 }
 const state={players:Object.fromEntries(Object.values(players).filter(p=>p.loggedIn).map(p=>[p.id,{id:p.id,name:p.name,x:p.x,y:p.y,hp:p.hp,maxHp:p.maxHp,combatStyle:p.combatStyle,weapon:p.equipment.weapon}])),
 npcs:enemies,nodes,groundItems,projectiles:effects};
 if(now-lastSnapshot>=STATE_MS){
  io.emit('state',state);
  for(const p of Object.values(players))if(p.loggedIn)io.to(p.id).emit('combatTarget',Encounters.target(enemies[p.selectedEnemyId],p,players,now));
  effects=[];lastSnapshot=now;
 }
},STEP_MS);
accountDb.init().then(()=>{
 server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('MiniScape online · account mode: '+accountDb.mode));
}).catch(err=>{console.error('Account database failed to initialize:',err);process.exitCode=1;});
