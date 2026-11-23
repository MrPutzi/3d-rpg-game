'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {accountStore}=require('../game/accounts'),{VILLAGE}=require('../game/content');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},7000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live Slayer tasks survive session replacement and claim once without erasing legacy credits',{timeout:20000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slayer-live-')),filename=path.join(dir,'players.json'),sockets=[];let child;
 try{
  const db=accountStore({filename,databaseUrl:''});await db.init();
  const door=VILLAGE.buildings.find(b=>b.id==='guild').door;
  const pendingTask=await db.register('SlayerPending','TestOnlyPassword2026',{...door,slayerTask:{kind:'wolf',kills:2},slayerKills:9});
  const finishedTask=await db.register('SlayerReady','TestOnlyPassword2026',{...door,slayerTask:{kind:'wolf',kills:3},slayerKills:6});await db.close();
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:filename,PORT:String(port)},stdio:'ignore'});
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
  async function resume(token){const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');const pending=event(s,'profile');s.emit('resumeSession',{token});return {s,p:await pending};}
  let a=await resume(pendingTask.token);assert.equal(a.p.slayerTask.kills,2);assert.equal(a.p.slayerKills,9);
  a=await resume(pendingTask.token);assert.equal(a.p.slayerTask.kills,2);
  let done=event(a.s,'profile',p=>p.openBuilding==='guild');a.s.emit('visitBuilding','guild');await done;
  done=event(a.s,'serverMessage',m=>m.includes('Complete your assigned'));a.s.emit('claimSlayer');await done;
  const b=await resume(finishedTask.token);assert.equal(b.p.slayerTask.ready,true);
  done=event(b.s,'profile',p=>p.openBuilding==='guild');b.s.emit('visitBuilding','guild');await done;
  const saved=event(b.s,'saveStatus',v=>v.state==='saved');done=event(b.s,'profile',p=>p.skills.slayer.xp===65);b.s.emit('claimSlayer');const result=await done;await saved;
  assert.equal(result.slayerTask,null);assert.equal(result.slayerKills,6);
  done=event(b.s,'serverMessage',m=>m.includes('Complete your assigned'));b.s.emit('claimSlayer');await done;
  const c=await resume(finishedTask.token);assert.equal(c.p.skills.slayer.xp,65);assert.equal(c.p.slayerTask,null);assert.equal(c.p.slayerKills,6);
 }finally{for(const s of sockets)s.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}fs.rmSync(dir,{recursive:true,force:true});}
});
