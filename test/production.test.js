'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production');
const {SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count}=require('../game/rules');
const {turnInQuest,processRecipe}=require('../game/activities');
function player(){return {x:250,y:330,openBuilding:'tavern',inventory:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),gold:0,path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:'active',progress:0,goal:q.goal}]))};}
test('batch delays rewards, rejects reentry, processes one unit per tick and stops when ingredients end',()=>{
 const p=player();addItem(p.inventory,'raw_shrimp',2);
 assert.equal(P.start(p,'cook_shrimp',5,1000).ok,true);
 assert.equal(P.start(p,'cook_shrimp',5,1001).ok,false);
 assert.equal(P.advance(p,2799),null);assert.equal(count(p.inventory,'cooked_shrimp'),0);
 assert.equal(P.advance(p,2800).ok,true);assert.equal(count(p.inventory,'cooked_shrimp'),1);
 assert.equal(P.advance(p,2800),null);
 P.advance(p,99999);assert.equal(count(p.inventory,'cooked_shrimp'),2);
 assert.equal(P.advance(p,101799).ok,false);assert.equal(p.production,null);assert.equal(p.skills.cooking.xp,60);
});
test('cancel, movement and leaving station never consume unfinished inputs',()=>{
 for(const mode of ['cancel','move','station']){
  const p=player();addItem(p.inventory,'raw_shrimp');P.start(p,'cook_shrimp',1,1000);
  if(mode==='cancel')P.cancel(p);if(mode==='move')p.path=[{x:300,y:300}];if(mode==='station')p.x=2000;
  P.advance(p,3000);assert.equal(count(p.inventory,'raw_shrimp'),1);assert.equal(p.skills.cooking.xp,0);assert.equal(p.production,null);
 }
});
test('players have independent production jobs and inventories',()=>{
 const a=player(),b=player();for(const p of [a,b]){addItem(p.inventory,'raw_shrimp',2);P.start(p,'cook_shrimp',2,1000);}
 P.cancel(a);P.advance(b,2800);assert.equal(count(a.inventory,'cooked_shrimp'),0);assert.equal(count(b.inventory,'cooked_shrimp'),1);
});
test('invalid recipe keys, quantities and missing skills fail without mutations',()=>{
 const p=player();addItem(p.inventory,'raw_shrimp');
 for(const id of ['__proto__','constructor','unknown']){assert.equal(P.start(p,id,1,0).ok,false);assert.equal(processRecipe(p,id,1000).ok,false);}
 for(const qty of [0,-1,29,1.5,'5',NaN])assert.equal(P.start(p,'cook_shrimp',qty,0).ok,false);
 delete p.skills.cooking;assert.equal(P.start(p,'cook_shrimp',1,0).ok,false);assert.equal(count(p.inventory,'raw_shrimp'),1);
});
test('full inventory conversion is atomic and failed output grants no XP',()=>{
 const p=player();addItem(p.inventory,'logs');addItem(p.inventory,'bread',27);
 P.start(p,'fletch_shafts',1,1000);assert.equal(P.advance(p,2800).ok,true);assert.equal(count(p.inventory,'arrow_shafts'),15);
 const b=player();b.x=2520;b.y=2050;addItem(b.inventory,'bread',28);
 const before=JSON.stringify(b.inventory);P.start(b,'hunt_rabbit',1,1000);
 assert.equal(P.advance(b,2800).ok,false);assert.equal(JSON.stringify(b.inventory),before);assert.equal(b.skills.hunter.xp,0);
});
test('frontier meals quest requires crafting and delivery; rewards only once',()=>{
 const p=player();addItem(p.inventory,'raw_shrimp',3);P.start(p,'cook_shrimp',3,1000);
 for(const now of [2800,4600,6400])P.advance(p,now);
 assert.equal(p.quests.cooked_supplies.progress,3);
 assert.equal(turnInQuest(p,'cooked_supplies','elder'),null);
 assert.equal(turnInQuest(p,'cooked_supplies','fisher').ok,true);
 assert.equal(count(p.inventory,'cooked_shrimp'),0);assert.equal(p.gold,20);
 assert.equal(turnInQuest(p,'cooked_supplies','fisher'),null);assert.equal(p.gold,20);
});
