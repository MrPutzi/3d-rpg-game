'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {accountStore}=require('../game/accounts'),{VILLAGE}=require('../game/content');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},7000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live thieving rejects remote and forged attempts and preserves cooldown on replacement',{timeout:20000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slayer-live-')),filename=path.join(dir,'players.json'),sockets=[];let child;
 try{
  const db=accountStore({filename,databaseUrl:''});await db.init();
  const door={x:635,y:385};
  const pendingTask=await db.register('ThiefLocal','TestOnlyPassword2026',{...door});
  const finishedTask=await db.register('ThiefRemote','TestOnlyPassword2026',{x:100,y:100});await db.close();
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:filename,PORT:String(port)},stdio:'ignore'});
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
  async function resume(token){const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');const pending=event(s,'profile');s.emit('resumeSession',{token});return {s,p:await pending};}
  let a=await resume(pendingTask.token);
  let saved=event(a.s,'saveStatus',v=>v.state==='saved'),done=event(a.s,'profile',p=>p.nextThieve>Date.now());a.s.emit('pickpocket','guard');const attempted=await done;await saved;
  a=await resume(pendingTask.token);assert.equal(a.p.nextThieve,attempted.nextThieve);assert.equal(a.p.gold,attempted.gold);assert.equal(a.p.skills.thieving.xp,attempted.skills.thieving.xp);
  done=event(a.s,'serverMessage',m=>m.includes('Wait before'));a.s.emit('pickpocket','guard');await done;
  done=event(a.s,'serverMessage',m=>m.includes('Stand beside'));a.s.emit('pickpocket',{id:'guard',now:Date.now()+999999,success:true});await done;
  const b=await resume(finishedTask.token);done=event(b.s,'serverMessage',m=>m.includes('Stand beside'));b.s.emit('pickpocket','guard');await done;assert.equal(b.p.nextThieve,0);
 }finally{for(const s of sockets)s.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}fs.rmSync(dir,{recursive:true,force:true});}
});
