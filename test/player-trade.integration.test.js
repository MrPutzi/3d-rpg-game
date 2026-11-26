'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {accountStore}=require('../game/accounts');
function event(socket,name,predicate=()=>true,timeout=8000){
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(name,on);reject(Error('Timeout '+name));},timeout);function on(value){if(predicate(value)){clearTimeout(timer);socket.off(name,on);resolve(value);}}socket.on(name,on);});
}
async function freePort(){const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));return port;}
async function connect(url){const socket=io(url,{transports:['websocket'],reconnection:false,timeout:5000});await event(socket,'connect');return socket;}
async function resume(url,token){const socket=await connect(url),profile=event(socket,'profile'),logged=event(socket,'loginSuccess');socket.emit('resumeSession',{token});await logged;return {socket,profile:await profile};}
test('live players confirm one atomic trade; busy invites and disconnects cannot duplicate items',{timeout:45000},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'player-trade-live-')),filename=path.join(dir,'players.json'),sockets=[];let child;
 t.after(async()=>{for(const socket of sockets)socket.close();if(child){child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,2000);});}fs.rmSync(dir,{recursive:true,force:true});});
 const db=accountStore({filename,databaseUrl:''});await db.init();
 const a=await db.register('LiveTraderA','StrongPassword_2026',{x:380,y:380,gold:100,inventory:[{id:'iron_ore',qty:1},{id:'iron_ore',qty:1}]});
 const b=await db.register('LiveTraderB','StrongPassword_2026',{x:380,y:380,gold:100,inventory:[{id:'bread',qty:1},{id:'bread',qty:1}]});
 const c=await db.register('LiveTraderC','StrongPassword_2026',{x:380,y:380,gold:50,inventory:[{id:'raw_shrimp',qty:1}]});
 await db.close();
 const port=await freePort(),url='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:filename,PORT:String(port)},stdio:'ignore'});
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(ready,'server did not start');
 const A=await resume(url,a.token),B=await resume(url,b.token),C=await resume(url,c.token);sockets.push(A.socket,B.socket,C.socket);
 const inviteB=event(B.socket,'playerTradeInvite'),waitingA=event(A.socket,'playerTradeState',state=>state.status==='invited');
 A.socket.emit('requestPlayerTrade',B.socket.id);
 const [invitation,waitingState]=await Promise.all([inviteB,waitingA]);assert.equal(waitingState.partnerName,'LiveTraderB');
 const stateA=event(A.socket,'playerTradeState',state=>state.status==='open'),stateB=event(B.socket,'playerTradeState',state=>state.status==='open');
 B.socket.emit('respondPlayerTrade',{tradeId:invitation.tradeId,accept:true});
 await Promise.all([stateA,stateB]);
 const busy=event(C.socket,'serverMessage',message=>message.includes('unavailable'));
 C.socket.emit('requestPlayerTrade',A.socket.id);await busy;
 const offerA=event(A.socket,'playerTradeState',state=>state.ownOffer.gold===9);
 A.socket.emit('updatePlayerTradeOffer',{tradeId:invitation.tradeId,gold:9,itemId:'iron_ore',qty:1});await offerA;
 const offerB=event(B.socket,'playerTradeState',state=>state.ownOffer.gold===5);
 B.socket.emit('updatePlayerTradeOffer',{tradeId:invitation.tradeId,gold:5,itemId:'bread',qty:1});await offerB;
 const confirmedA=event(A.socket,'playerTradeState',state=>state.ownConfirmed);
 A.socket.emit('confirmPlayerTrade',{tradeId:invitation.tradeId});await confirmedA;
 const resetA=event(A.socket,'playerTradeState',state=>!state.ownConfirmed&&!state.otherConfirmed&&state.ownOffer.gold===8);
 A.socket.emit('updatePlayerTradeOffer',{tradeId:invitation.tradeId,gold:8,itemId:'iron_ore',qty:1});await resetA;
 const confirmAgainA=event(A.socket,'playerTradeState',state=>state.ownConfirmed);
 A.socket.emit('confirmPlayerTrade',{tradeId:invitation.tradeId});await confirmAgainA;
 const closedA=event(A.socket,'playerTradeClosed',data=>data.message==='Trade completed.');
 const closedB=event(B.socket,'playerTradeClosed',data=>data.message==='Trade completed.');
 B.socket.emit('confirmPlayerTrade',{tradeId:invitation.tradeId});
 await Promise.all([closedA,closedB]);
 A.socket.emit('confirmPlayerTrade',{tradeId:invitation.tradeId});
 const inviteCWaiting=event(A.socket,'playerTradeState',state=>state.status==='invited'),inviteC=event(C.socket,'playerTradeInvite');
 A.socket.emit('requestPlayerTrade',C.socket.id);
 const [cancelInvite,cWaiting]=await Promise.all([inviteC,inviteCWaiting]);
 const cancelledInvite=event(C.socket,'playerTradeClosed',data=>data.message==='Player trade cancelled.');
 A.socket.emit('cancelPlayerTrade',{tradeId:cancelInvite.tradeId});await cancelledInvite;
 const inviteCAgain=event(C.socket,'playerTradeInvite');
 A.socket.emit('requestPlayerTrade',C.socket.id);
 const invitationC=await inviteCAgain;
 const stateA2=event(A.socket,'playerTradeState'),stateC=event(C.socket,'playerTradeState');
 C.socket.emit('respondPlayerTrade',{tradeId:invitationC.tradeId,accept:true});
 await Promise.all([stateA2,stateC]);
 const cancelled=event(A.socket,'playerTradeClosed',data=>data.message.includes('disconnected'));
 C.socket.disconnect();await cancelled;
 A.socket.disconnect();B.socket.disconnect();
 const running=child;child=null;await new Promise(resolve=>{running.once('exit',resolve);running.kill('SIGTERM');});
 const verify=accountStore({filename,databaseUrl:''});await verify.init();
 try{
  const savedA=await verify.resume(a.token),savedB=await verify.resume(b.token),savedC=await verify.resume(c.token);
  assert.equal(savedA.profile.gold,97);assert.equal(savedB.profile.gold,103);
  assert.equal(savedA.tradeRevision,1);assert.equal(savedB.tradeRevision,1);
  assert.equal(savedA.profile.inventory.reduce((n,x)=>n+(x.id==='iron_ore'?x.qty:0),0),1);
  assert.equal(savedA.profile.inventory.reduce((n,x)=>n+(x.id==='bread'?x.qty:0),0),1);
  assert.equal(savedB.profile.inventory.reduce((n,x)=>n+(x.id==='iron_ore'?x.qty:0),0),1);
  assert.equal(savedB.profile.inventory.reduce((n,x)=>n+(x.id==='bread'?x.qty:0),0),1);
  assert.equal(savedC.profile.gold,50);assert.equal(savedC.profile.inventory[0].id,'raw_shrimp');
 }finally{await verify.close();}
});
