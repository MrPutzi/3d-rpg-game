'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},5000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live max production exposes availability and respects cancellation',{timeout:30000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bank-batch-')),sockets=[];let child;
 try{
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:path.join(dir,'players.json'),PORT:String(port)},stdio:'ignore'});
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
  const profiles=new Map();
  for(const name of ['First','Second']){
   const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');s.on('profile',p=>profiles.set(s,p));
   const logged=event(s,'profile');s.emit('guestLogin',{name});await logged;
  }
  for(const s of sockets)assert.equal(profiles.get(s).productionOptions.pickpocket.max,28);
  const started=sockets.map(s=>event(s,'profile',p=>p.production?.total===28));
  for(const s of sockets)s.emit('craft',{id:'pickpocket',qty:'max'});await Promise.all(started);
  for(const s of sockets){assert.equal(profiles.get(s).gold,130);assert.equal(profiles.get(s).productionOptions.pickpocket.max,0);}
  const cancelled=event(sockets[0],'profile',p=>!p.production);sockets[0].emit('cancelProduction');await cancelled;
  const completed=event(sockets[1],'profile',p=>p.production?.completed===1);await completed;
  assert.equal(profiles.get(sockets[0]).gold,130);assert.equal(profiles.get(sockets[1]).gold,134);
  const stopped=event(sockets[1],'profile',p=>!p.production);sockets[1].emit('cancelProduction');await stopped;
 }finally{for(const s of sockets)s.disconnect();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await exited;}fs.rmSync(dir,{recursive:true,force:true});}
});
