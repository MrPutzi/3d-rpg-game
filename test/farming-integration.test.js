'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {accountStore}=require('../game/accounts'),{VILLAGE}=require('../game/content');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},7000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live crops persist across replacement and harvest once for their owner',{timeout:20000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slayer-live-')),filename=path.join(dir,'players.json'),sockets=[];let child;
 try{
  const db=accountStore({filename,databaseUrl:''});await db.init();
  const door={x:1010,y:890};
  const pendingTask=await db.register('FarmerPending','TestOnlyPassword2026',{...door,inventory:[{id:'guam_seed',qty:1}]});
  const finishedTask=await db.register('FarmerReady','TestOnlyPassword2026',{...door,farmPatch:{kind:'guam',readyAt:Date.now()-1000}});await db.close();
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:filename,PORT:String(port)},stdio:'ignore'});
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
  async function resume(token){const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');const pending=event(s,'profile');s.emit('resumeSession',{token});return {s,p:await pending};}
  let a=await resume(pendingTask.token);assert.equal(a.p.farmPatch,null);
  let saved=event(a.s,'saveStatus',v=>v.state==='saved'),done=event(a.s,'profile',p=>!!p.farmPatch);a.s.emit('plantGuam',{readyAt:0});const planted=await done;await saved;
  a=await resume(pendingTask.token);assert.deepEqual(a.p.farmPatch,planted.farmPatch);
  done=event(a.s,'serverMessage',m=>m.includes('not ready'));a.s.emit('harvestGuam',{now:Date.now()+999999});await done;
  const b=await resume(finishedTask.token);assert.ok(b.p.farmPatch);
  saved=event(b.s,'saveStatus',v=>v.state==='saved');done=event(b.s,'profile',p=>p.skills.farming.xp===55);b.s.emit('harvestGuam');const result=await done;await saved;assert.equal(result.farmPatch,null);
  done=event(b.s,'serverMessage',m=>m.includes('not ready'));b.s.emit('harvestGuam');await done;
  const c=await resume(finishedTask.token);assert.equal(c.p.skills.farming.xp,55);assert.equal(c.p.farmPatch,null);
  const d=await resume(pendingTask.token);assert.deepEqual(d.p.farmPatch,planted.farmPatch);
 }finally{for(const s of sockets)s.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}fs.rmSync(dir,{recursive:true,force:true});}
});
