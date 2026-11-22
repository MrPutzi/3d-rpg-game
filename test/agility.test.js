'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../game/agility'),P=require('../game/production');
const {SKILLS,QUESTS}=require('../game/progression');
const {skill,makePath,collides}=require('../game/rules');
const {questProgress,turnInQuest,questJournal}=require('../game/activities');
function player(){return {loggedIn:true,hp:20,...A.START,path:[],inventory:[],gold:0,skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function lap(p,now){assert.equal(A.start(p,now).ok,true);for(const [i,point] of A.POINTS.entries()){Object.assign(p,point);const r=A.advance(p,now+(i+1)*1000);assert.equal(r.ok,true);if(r.completed)questProgress(p,'course','oakvale_lap');}}
test('ordered checkpoints award XP once; standing, skipping, duplicate starts and repeated ticks do not',()=>{
 const p=player();assert.equal(A.start(p,0).ok,true);assert.equal(A.start(p,1).ok,false);
 assert.equal(A.advance(p,10000),null);Object.assign(p,A.POINTS[2]);assert.equal(A.advance(p,11000),null);assert.equal(p.skills.agility.xp,0);
 for(const [i,point] of A.POINTS.entries()){Object.assign(p,point);const r=A.advance(p,12000+i*1000);assert.equal(r.completed,i===3);}
 assert.equal(p.skills.agility.xp,40);assert.equal(A.advance(p,20000),null);assert.equal(p.skills.agility.xp,40);
 assert.equal(P.start(p,'run_course',28,22000).ok,false);
});
test('course validates start radius and reachable path for every checkpoint',()=>{
 const p=player();p.x+=24;assert.equal(A.start(p,0).ok,true);A.cancel(p);p.x+=.01;assert.equal(A.start(p,0).ok,false);
 let from=A.START;for(const point of A.POINTS){assert.equal(collides(point),false);assert.ok(makePath(from,point).length);from=point;}
});
test('leaving, timeout, combat, production and death cancel without XP; players remain isolated',()=>{
 for(const mode of ['leave','timeout','combat','production','death']){
  const a=player(),b=player();A.start(a,0);A.start(b,0);
  if(mode==='leave')a.x=1000;if(mode==='combat')a.intent={type:'attack'};if(mode==='production')a.production={};if(mode==='death')a.hp=0;
  assert.equal(A.advance(a,mode==='timeout'?120000:1000).ok,false);assert.equal(a.agility,null);assert.equal(a.skills.agility.xp,0);
  Object.assign(b,A.POINTS[0]);assert.equal(A.advance(b,1000).ok,true);assert.equal(b.agility.next,1);
 }
});
test('scout quest unlocks after welcome, requires three laps and rewards the correct NPC only once',()=>{
 const p=player();lap(p,0);assert.equal(p.quests.oakvale_laps.progress,0);
 questProgress(p,'talk','elder');turnInQuest(p,'welcome','elder');assert.equal(p.quests.oakvale_laps.status,'active');
 for(let i=0;i<3;i++)lap(p,10000+i*10000);
 assert.equal(p.quests.oakvale_laps.progress,3);assert.equal(questJournal(p).oakvale_laps.target.kind,'npc');
 assert.equal(turnInQuest(p,'oakvale_laps','guard'),null);assert.equal(turnInQuest(p,'oakvale_laps','elder').ok,true);assert.equal(p.gold,30);
 assert.equal(turnInQuest(p,'oakvale_laps','elder'),null);assert.equal(p.gold,30);
});
test('private course status and UI map tracking follow only the next checkpoint',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const a=player(),b=player();A.start(a,0);
 const status=A.status(a);status.target.x=0;assert.equal(A.POINTS[0].x,650);assert.equal(A.status(b),null);
 const ctx=vm.createContext({profile:{agility:A.status(a)},trackedRecipe:null,trackedQuest:null});
 const source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');vm.runInContext(source.match(/function trackedTarget\(\)\{[^\n]+\}/)[0],ctx);
 assert.equal(vm.runInContext('trackedTarget().x',ctx),650);
});
