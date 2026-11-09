'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {io}=require('socket.io-client');
const {spawn}=require('node:child_process');
const net=require('node:net');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
async function freePort(){
 const srv=net.createServer();await new Promise((ok,fail)=>srv.once('error',fail).listen(0,'127.0.0.1',ok));
 const port=srv.address().port;await new Promise(ok=>srv.close(ok));return port;
}
const event=(sock,name,timeout=7000)=>new Promise((resolve,reject)=>{
 const t=setTimeout(()=>{sock.off(name,on);reject(Error('Timeout: '+name));},timeout);
 function on(value){clearTimeout(t);resolve(value);}
 sock.once(name,on);
});
async function connected(url){
 const sock=io(url,{transports:['websocket'],reconnection:false,timeout:5000});
 await event(sock,'connect');return sock;
}
test('registered player can create account, restore session, and see expanded catalog', {timeout:30000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'miniscape-integration-'));
 const port=await freePort(),url='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.js'],{
  cwd:path.join(__dirname,'..'),
  env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:path.join(dir,'profiles.json'),PORT:String(port)},
  stdio:['ignore','pipe','pipe']});
 let output='';for(const st of [child.stdout,child.stderr])st.on('data',chunk=>{output+=String(chunk);});
 let sock=null;
 try{
  let ready=false;for(let i=0;i<60;i++){
   if(child.exitCode!==null)throw Error('Server exited unexpectedly: '+output);
   try{const r=await fetch(url+'/health');if(r.ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready,'Server did not become healthy: '+output);
  sock=await connected(url);
  // Registration returns a one-time client token and profile independently.
  const onLogin=event(sock,'loginSuccess');
  const profileReady=event(sock,'profile');
  sock.emit('register',{username:'TestKnight_98',password:'StrongerPass_2026'});
  const logged=await onLogin;
  const profile=await profileReady;
  assert.ok(logged.token?.length>32);
  assert.equal(profile.name,'TestKnight_98');
  assert.ok(profile.skills.smithing);
  assert.equal(profile.quests.guard_supplies.status,'locked');
  assert.ok(profile.skills.slayer);
  assert.equal(Object.keys(profile.equipment).length,11);
  assert.equal(profile.gold,130);
  let changed=event(sock,'profile');sock.emit('craft',{id:'pickpocket',qty:2});
  const queued=await changed;assert.equal(queued.gold,130);assert.equal(queued.production.remaining,2);
  const denied=event(sock,'serverMessage');sock.emit('craft',{id:'pickpocket',qty:2});
  assert.match(await denied,/Already producing/);
  changed=event(sock,'profile');sock.emit('cancelProduction');
  assert.equal((await changed).production,null);
  changed=event(sock,'profile');sock.emit('craft',{id:'pickpocket',qty:1});await changed;
  const completed=await event(sock,'profile');assert.equal(completed.gold,134);assert.equal(completed.production,null);

  const old=sock;const replaced=event(old,'sessionReplaced');
  sock=await connected(url);
  const loggedIn=event(sock,'loginSuccess');
  const resumedProfile=event(sock,'profile');
  sock.emit('resumeSession',{token:logged.token});
  const resumed=await loggedIn;
  const saved=await resumedProfile;
  assert.equal(resumed.username,'TestKnight_98');
  await replaced;assert.equal(old.connected,false);
  assert.equal(saved.gold,134);
  const confirmed=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Save acknowledgement missing')),3000);const listener=value=>{if(value.state==='saved'){clearTimeout(timer);sock.off('saveStatus',listener);resolve(value);}};sock.on('saveStatus',listener);});
  for(let i=0;i<20;i++)sock.emit('saveProgress');
  assert.ok((await confirmed).at>0);
  const disk=JSON.parse(fs.readFileSync(path.join(dir,'profiles.json'),'utf8'));assert.equal(disk.accounts[0].profile.gold,134);
  assert.equal(saved.skills.fishing.level,1);
  assert.equal(saved.quests.guard_supplies.status,'locked');
  // Invalid tokens are tested on a separate unauthenticated socket.
  sock.disconnect();
  sock=await connected(url);
  const fail=event(sock,'authFailed');
  sock.emit('resumeSession',{token:'invalid-session-token-invalid-session'});
  assert.ok((await fail).includes('Session'));
  sock.disconnect();
 }finally{
  sock?.disconnect();child.kill('SIGTERM');
  await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,1500);});
  await fs.promises.rm(dir,{recursive:true,force:true});
 }
});
