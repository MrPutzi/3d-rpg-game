'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},5000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live nearby sweep handles competing clients without duplicating player drops',{timeout:20000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'loot-sweep-')),sockets=[];let child;
 try{
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:path.join(dir,'players.json'),PORT:String(port)},stdio:'ignore'});
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
  const profiles=new Map();
  for(const name of ['First','Second']){
   const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');s.on('profile',p=>profiles.set(s,p));
   const logged=event(s,'profile');s.emit('guestLogin',{name});await logged;
   const dropped=event(s,'profile');s.emit('dropItem','bread');await dropped;
  }
  const protectedView=await event(sockets[0],'nearbyLoot',drops=>drops.length===2);
  assert.equal(protectedView.filter(g=>g.access==='reserved').length,1);
  assert.equal(protectedView.filter(g=>g.access==='yours').length,1);
  const restored=sockets.map(s=>event(s,'profile',p=>p.inventory.filter(i=>i.id==='bread').reduce((n,i)=>n+i.qty,0)===2));
  const replies=sockets.map(s=>event(s,'serverMessage',m=>/nearby drops|within reach/.test(m)));
  for(const s of sockets)s.emit('takeNearby');await Promise.all(replies);await Promise.all(restored);
  const total=[...profiles.values()].reduce((n,p)=>n+p.inventory.filter(i=>i.id==='bread').reduce((n,i)=>n+i.qty,0),0);assert.equal(total,4);
  const empty=event(sockets[0],'nearbyLoot',drops=>drops.length===0);await empty;
  for(const s of sockets)s.emit('takeNearby');
  assert.equal([...profiles.values()].reduce((n,p)=>n+p.inventory.filter(i=>i.id==='bread').reduce((n,i)=>n+i.qty,0),0),4);
 }finally{for(const s of sockets)s.disconnect();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await exited;}fs.rmSync(dir,{recursive:true,force:true});}
});
