'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const {SKILLS,QUESTS}=require('../game/progression');
const {ENEMY_TEMPLATES}=require('../game/content');
const {skill,xpForLevel}=require('../game/rules');
const {hashPassword}=require('../game/accounts');
function until(s,event,predicate=()=>true){return new Promise((ok,fail)=>{const t=setTimeout(()=>{s.off(event,listener);fail(Error('Timeout '+event));},10000);function listener(v){if(predicate(v)){clearTimeout(t);s.off(event,listener);ok(v);}}s.on(event,listener);});}
test('magic assist and melee finish share gold, quest progress, private loot and saved progression',{timeout:30000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'shared-combat-'));
 const d=ENEMY_TEMPLATES.find(n=>n.kind==='goblin'),x=d.region[0]+31,y=d.region[1]+43;
 const hash=await hashPassword('TestPassword123');
 const accounts=['mage','warrior'].map((username,i)=>({id:'account-'+i,username,usernameKey:username,passwordHash:hash,profile:{
  x:x-100,y,hp:i?20:1,maxHp:20,gold:0,inventory:[{id:'bread',qty:5},{id:'air_rune',qty:10},{id:'mind_rune',qty:10},{id:'bronze_scimitar',qty:1}],
  equipment:{weapon:'bronze_scimitar'},skills:Object.fromEntries(SKILLS.map(k=>[k,skill(xpForLevel(k==='hitpoints'?10:i?99:1))])),
  quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:'active',progress:0,goal:q.goal}]))
 }}));
 const file=path.join(dir,'accounts.json');await fs.writeFile(file,JSON.stringify({accounts,sessions:[]}));
 // Deterministic combat only inside this isolated test process.
 const seed=path.join(dir,'random.cjs');await fs.writeFile(seed,'Math.random=()=>0.25;');
 const portServer=net.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
 const child=spawn(process.execPath,['-r',seed,'server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATABASE_URL:'',LOCAL_DB_PATH:file},stdio:['ignore','pipe','pipe']});
 const sockets=[];let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
 try{
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
  for(const username of ['mage','warrior']){const s=io('http://127.0.0.1:'+port,{autoConnect:false,transports:['websocket'],reconnection:false});sockets.push(s);const c=until(s,'connect');s.connect();await c;const p=until(s,'profile');s.emit('signIn',{username,password:'TestPassword123'});await p;}
  const [mage,warrior]=sockets;
  const fed=until(mage,'profile',p=>p.hp===8);
  for(let i=0;i<20;i++)mage.emit('useItem','bread');
  const meal=await fed;assert.equal(meal.inventory.find(e=>e.id==='bread').qty,4);
  mage.emit('castSpell','goblin_0');
  const delayed=await until(mage,'state');assert.equal(delayed.npcs.goblin_0.hp,10);
  await new Promise(r=>setTimeout(r,1850));

  const hp=until(mage,'state',v=>v.npcs.goblin_0.hp===9),target=until(mage,'combatTarget',v=>v?.id==='goblin_0'&&v.damage===1);
  mage.emit('castSpell','goblin_0');await hp;assert.equal((await target).qualifies,true);
  const a=until(mage,'combatReward'),b=until(warrior,'combatReward');
  const pa=until(mage,'profile',p=>p.quests.goblin_hunt.progress===1),pb=until(warrior,'profile',p=>p.quests.goblin_hunt.progress===1);
  warrior.emit('attack','goblin_0');const rewards=await Promise.all([a,b]);assert.equal(rewards[0].gold+rewards[1].gold,6);assert.equal(rewards[1].lootOwner,true);
  await Promise.all([pa,pb]);
  const lootState=await until(mage,'state',v=>Object.values(v.groundItems).length>0);
  assert.ok(Object.values(lootState.groundItems).every(g=>g.ownerId===warrior.id));
  const nearby=await until(mage,'nearbyLoot',rows=>rows.some(g=>g.access==='reserved'));
  assert.ok(nearby.every(g=>g.qty>0&&g.expiresIn>0));
  const locked=until(mage,'serverMessage',v=>/another player|belongs|reserved|protected/i.test(v));
  mage.emit('pickup',Object.values(lootState.groundItems)[0].id);await locked;
  for(const s of sockets)s.disconnect();
  await new Promise(r=>setTimeout(r,300));const saved=JSON.parse(await fs.readFile(file,'utf8'));
  assert.equal(saved.accounts.reduce((n,a)=>n+a.profile.gold,0),6);assert.ok(saved.accounts.every(a=>a.profile.quests.goblin_hunt.progress===1));
 }finally{for(const s of sockets)s.disconnect();child.kill('SIGTERM');await new Promise(r=>{if(child.exitCode!==null||child.signalCode)return r();child.once('exit',r);});await fs.rm(dir,{recursive:true,force:true});}
});
