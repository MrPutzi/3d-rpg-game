'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {accountStore}=require('../game/accounts');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},8000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live Prayer uses server position, persists points and drains independently per player',{timeout:25000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prayer-live-')),filename=path.join(dir,'players.json'),sockets=[];let child;
 try{
  const db=accountStore({filename,databaseUrl:''});await db.init();
  const near=await db.register('PrayerNear','TestOnlyPassword2026',{x:390,y:390,prayerPoints:0,skills:{prayer:{xp:0,level:1}}});
  const far=await db.register('PrayerFar','TestOnlyPassword2026',{x:100,y:100,prayerPoints:0,skills:{prayer:{xp:0,level:1}}});await db.close();
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:filename,PORT:String(port)},stdio:'ignore'});
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
  async function resume(token){const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');const pending=event(s,'profile');s.emit('resumeSession',{token});return {s,p:await pending};}
  const a=await resume(near.token),b=await resume(far.token);
  const restored=event(a.s,'profile',p=>p.prayerPoints===1);a.s.emit('rechargePrayer');await restored;
  const denied=event(b.s,'serverMessage',m=>m.includes('Oakvale shrine'));b.s.emit('rechargePrayer',{x:390,y:390});await denied;
  const activated=event(a.s,'profile',p=>p.activePrayer==='stone_ward');a.s.emit('togglePrayer','stone_ward');await activated;
  const drained=event(a.s,'profile',p=>p.prayerPoints===0&&p.activePrayer===null);await drained;
  assert.equal(b.p.prayerPoints,0);assert.equal(b.p.activePrayer,null);
  const disconnected=event(a.s,'disconnect');a.s.disconnect();await disconnected;
  const resumed=await resume(near.token);assert.equal(resumed.p.prayerPoints,0);assert.equal(resumed.p.activePrayer,null);
 }finally{for(const s of sockets)s.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}fs.rmSync(dir,{recursive:true,force:true});}
});
