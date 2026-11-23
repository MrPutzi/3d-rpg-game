'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../game/agility'),{skill}=require('../game/rules');
const player=()=>({loggedIn:true,hp:20,...A.START,path:[],skills:{agility:skill()}});
test('obstacles require full server time and one completion per tick, even after stalls',()=>{
 const p=player();A.start(p,0);Object.assign(p,A.POINTS[0]);
 assert.equal(A.advance(p,1000).completed,false);assert.equal(p.agility.next,0);assert.equal(A.status(p).action.endsAt,2800);
 assert.equal(A.advance(p,2799),null);assert.equal(A.advance(p,2800).completed,false);assert.equal(p.agility.next,1);
 assert.equal(A.advance(p,2800),null);Object.assign(p,A.POINTS[1]);A.advance(p,4000);A.advance(p,50000);
 assert.equal(p.agility.next,2);assert.equal(p.skills.agility.xp,0);
});
test('moving within the marker or leaving its range resets only the unfinished obstacle',()=>{
 for(const mode of ['path','range']){
  const p=player();A.start(p,0);Object.assign(p,A.POINTS[0]);A.advance(p,1000);
  if(mode==='path')p.path=[{x:p.x+1,y:p.y}];else p.x+=20.01;
  assert.equal(A.advance(p,2000).ok,false);assert.equal(A.status(p).action,null);assert.equal(p.agility.next,0);
  p.path=[];Object.assign(p,A.POINTS[0]);A.advance(p,3000);assert.equal(A.advance(p,4799),null);A.advance(p,4800);assert.equal(p.agility.next,1);
 }
});
test('two players have isolated timers; snapshots cannot change authoritative deadlines',()=>{
 const a=player(),b=player();for(const p of [a,b]){A.start(p,0);Object.assign(p,A.POINTS[0]);}
 A.advance(a,1000);A.advance(b,2000);const view=A.status(a);view.action.endsAt=0;view.obstacle.duration=0;
 A.advance(a,2800);assert.equal(a.agility.next,1);assert.equal(b.agility.next,0);assert.equal(A.advance(b,3799),null);A.advance(b,3800);assert.equal(b.agility.next,1);
});
test('accepted navigation resets a timer even if the short path completes within one server step',()=>{
 const p=player();A.start(p,0);Object.assign(p,A.POINTS[0]);A.advance(p,1000);
 assert.equal(A.interrupt(p),true);p.x+=1;p.path=[];A.advance(p,2700);
 assert.equal(A.status(p).action.endsAt,4500);assert.equal(A.advance(p,2800),null);assert.equal(p.agility.next,0);
});
test('timeout during obstacle grants no XP or completion',()=>{
 const p=player();A.start(p,0);Object.assign(p,A.POINTS[0]);A.advance(p,119000);
 assert.equal(A.advance(p,120000).ok,false);assert.equal(p.agility,null);assert.equal(p.skills.agility.xp,0);
});
test('UI progress is bounded and does not itself advance the course',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({});vm.runInContext(source.match(/function obstacleProgress\(lap,now\)\{[^\n]+\}/)[0],ctx);
 for(const [now,value] of [[0,0],[1000,0],[1900,.5],[2800,1],[5000,1]])assert.equal(vm.runInContext('obstacleProgress({action:{startedAt:1000,endsAt:2800}},'+now+')',ctx),value);
 assert.equal(vm.runInContext('obstacleProgress(null,1000)',ctx),0);
});
