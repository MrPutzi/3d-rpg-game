'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{io}=require('socket.io-client');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {accountStore}=require('../game/accounts'),A=require('../game/agility');
function event(s,name,predicate=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,on);reject(Error('Timeout '+name));},7000);function on(v){if(predicate(v)){clearTimeout(timer);s.off(name,on);resolve(v);}}s.on(name,on);});}
test('live authoritative movement completes a lap, saves quest credit and drops unfinished laps on session replacement',{timeout:30000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agility-live-')),filename=path.join(dir,'players.json'),sockets=[];let child;
 try{
  const db=accountStore({filename,databaseUrl:''});await db.init();
  const registered=await db.register('CourseRunner','TestOnlyPassword2026',{...A.START,quests:{welcome:{status:'complete',progress:1,goal:1},oakvale_laps:{status:'active',progress:2,goal:3}}});await db.close();
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const url='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:filename,PORT:String(port)},stdio:'ignore'});
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(url+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
  async function connect(){const s=io(url,{transports:['websocket'],reconnection:false});sockets.push(s);await event(s,'connect');return s;}
  const a=await connect(),b=await connect();let pending=event(a,'profile');a.emit('resumeSession',{token:registered.token});await pending;
  pending=event(b,'profile');b.emit('guestLogin',{name:'Observer'});const other=await pending;assert.equal(other.agility,null);
  pending=event(b,'serverMessage',m=>m.includes('course start'));b.emit('startAgility');await pending;
  pending=event(a,'profile',p=>p.agility?.completed===0);a.emit('startAgility');await pending;
  for(let i=0;i<A.POINTS.length;i++){
   pending=event(a,'profile',p=>i===3?p.skills.agility.xp===40:p.agility?.completed===i+1);
   // No client completion event: only ordinary move requests.
   const begun=i===0?event(a,'profile',p=>!!p.agility?.action):null;
   a.emit('move',A.POINTS[i]);
   if(begun){
    const first=await begun;const reset=event(a,'profile',p=>p.agility?.completed===0&&!p.agility.action);
    const restarted=event(a,'profile',p=>p.agility?.action?.startedAt>first.agility.action.startedAt);
    a.emit('move',{x:A.POINTS[i].x+1,y:A.POINTS[i].y});await reset;await restarted;
   }
   const p=await pending;
   if(i===3){assert.equal(p.agility,null);assert.equal(p.quests.oakvale_laps.progress,3);assert.equal(p.questJournal.oakvale_laps.ready,true);}
  }
  await event(a,'state',s=>{const p=s.players[a.id];return p&&Math.hypot(p.x-A.START.x,p.y-A.START.y)<2;});
  pending=event(a,'profile',p=>!!p.agility);a.emit('startAgility');await pending;
  const replacement=await connect();pending=event(replacement,'profile');replacement.emit('resumeSession',{token:registered.token});const restored=await pending;
  assert.equal(restored.agility,null);assert.equal(restored.skills.agility.xp,40);assert.equal(restored.quests.oakvale_laps.progress,3);
  assert.equal(JSON.parse(fs.readFileSync(filename,'utf8')).accounts[0].profile.skills.agility.xp,40);
 }finally{for(const s of sockets)s.disconnect();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await exited;}fs.rmSync(dir,{recursive:true,force:true});}
});
