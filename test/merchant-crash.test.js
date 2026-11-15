'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {accountStore}=require('../game/accounts'),{VILLAGE}=require('../game/content');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},7000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live merchant transactions conserve resale items across concurrent buyers and process death',{timeout:30000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'merchant-live-')),filename=path.join(dir,'players.json');
 const sockets=[];let child;
 try{
  const db=accountStore({filename,databaseUrl:''});await db.init();
  const door=VILLAGE.buildings.find(b=>b.id==='tavern').door;
  const tokens=[];
  for(const [i,name] of ['Seller','BuyerOne','BuyerTwo'].entries()){
   const r=await db.register(name,'test-password-only',{...door,gold:100,inventory:i===0?[{id:'cooked_rabbit',qty:1}]:[]});tokens.push(r.token);
  }
  await db.close();
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:filename,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let logs='';child.stderr.on('data',d=>logs+=d);
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
  async function login(token){const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');const p=event(s,'profile');s.emit('resumeSession',{token});await p;const opened=event(s,'buildingOpen');s.emit('visitBuilding','tavern');await opened;return s;}
  const [seller,b1,b2]=await Promise.all(tokens.map(login));
  function trade(s,side){const finished=event(s,'tradeStatus',v=>v.state==='done');s.emit(side,{id:'cooked_rabbit',qty:1});return finished;}
  const sold=trade(seller,'sell');
  // These packets arrive while the account transaction is pending and cannot alter its snapshot.
  seller.emit('dropItem','cooked_rabbit');seller.emit('sell',{id:'cooked_rabbit',qty:1});seller.emit('saveProgress');
  assert.equal((await sold).ok,true);
  const bought=await Promise.all([trade(b1,'buy'),trade(b2,'buy')]);assert.equal(bought.filter(r=>r.ok).length,1);
  // Session replacement must load the committed revision, and its checkpoint must remain valid.
  const replacement=await login(tokens[0]);const saved=event(replacement,'saveStatus',v=>v.state==='saved');replacement.emit('saveProgress');await saved;
  // Lose the acknowledgement: disconnect as soon as the server announces the pending write.
  const pending=event(replacement,'tradeStatus',v=>v.state==='pending');
  replacement.emit('buy',{id:'bread',qty:1});await pending;replacement.disconnect();
  const restored=await login(tokens[0]);
  const checkpoint=event(restored,'saveStatus',v=>v.state==='saved');restored.emit('saveProgress');await checkpoint;
  const exited=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await exited;
  const disk=JSON.parse(fs.readFileSync(filename,'utf8'));
  const copies=disk.accounts.reduce((n,a)=>n+a.profile.inventory.filter(e=>e.id==='cooked_rabbit').reduce((n,e)=>n+e.qty,0),0);
  assert.equal(copies,1);assert.equal(disk.merchants.tavern.cooked_rabbit,0);
  const reopened=accountStore({filename,databaseUrl:''});await reopened.init();
  const sellerAccount=await reopened.resume(tokens[0]);assert.equal(sellerAccount.tradeRevision,2);assert.deepEqual(sellerAccount.profile.inventory,[{id:'bread',qty:1}]);
  assert.equal((await reopened.merchantStock()).tavern.cooked_rabbit,0);await reopened.close();
 }finally{for(const s of sockets)s.disconnect();if(child&&child.exitCode===null)child.kill('SIGKILL');fs.rmSync(dir,{recursive:true,force:true});}
});
