'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},5000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live bank batch enforces proximity, preserves gear and isolates simultaneous clients',{timeout:30000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bank-batch-')),sockets=[];let child;
 try{
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:path.join(dir,'players.json'),PORT:String(port)},stdio:'ignore'});
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
  const profiles=new Map();
  for(const name of ['First','Second']){
   const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');s.on('profile',p=>profiles.set(s,p));
   const logged=event(s,'profile');s.emit('guestLogin',{name});await logged;
   s.emit('bankDepositInventory','all');
  }
  const initial=sockets.map(s=>JSON.stringify(profiles.get(s).inventory));
  const opened=sockets.map(s=>event(s,'buildingOpen',v=>v.id==='bank'));
  for(const s of sockets)s.emit('visitBuilding','bank');await Promise.all(opened);
  for(let i=0;i<sockets.length;i++){assert.equal(JSON.stringify(profiles.get(sockets[i]).inventory),initial[i]);assert.equal(profiles.get(sockets[i]).bank.length,0);}
  const deposits=sockets.map(s=>event(s,'profile',p=>p.bank.length>0));
  sockets[0].emit('bankDepositInventory','spare');sockets[1].emit('bankDepositInventory','all');await Promise.all(deposits);
  const a=profiles.get(sockets[0]),b=profiles.get(sockets[1]);assert.equal(a.equipment.weapon,'bronze_scimitar');assert.ok(a.inventory.some(i=>i.id==='bronze_arrow'));assert.equal(b.inventory.length,0);assert.equal(b.equipment.weapon,null);assert.equal(b.equipment.ammo,null);
  const withdrawals=sockets.map(s=>event(s,'profile',p=>p.inventory.filter(i=>i.id==='bread').reduce((n,i)=>n+i.qty,0)===2));
  for(const s of sockets)s.emit('bankWithdraw',{id:'bread',qty:'max'});
  await Promise.all(withdrawals);
  for(const s of sockets)assert.equal(profiles.get(s).bank.filter(i=>i.id==='bread').length,0);
  const returned=event(sockets[1],'profile',p=>p.inventory.length===0);
  sockets[1].emit('bankDeposit',{id:'bread',qty:'max'});await returned;
  const bank=JSON.stringify(profiles.get(sockets[1]).bank);const rejected=event(sockets[1],'serverMessage',m=>m==='No items to deposit.');sockets[1].emit('bankDepositInventory','all');await rejected;assert.equal(JSON.stringify(profiles.get(sockets[1]).bank),bank);
 }finally{for(const s of sockets)s.disconnect();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await exited;}fs.rmSync(dir,{recursive:true,force:true});}
});
