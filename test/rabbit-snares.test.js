'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production');
const {SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count}=require('../game/rules');
const {recipeTarget,targetFor}=require('../game/quest-targets');
function player(){return {x:2520,y:2050,inventory:[],bank:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),gold:0,path:[],quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:'active',progress:0,goal:q.goal}]))};}
test('one log makes two nonstacking snares; capacity failures preserve inputs and XP',()=>{
 const p=player();addItem(p.inventory,'logs');addItem(p.inventory,'bread',27);
 assert.equal(P.start(p,'craft_rabbit_snare',1,0).ok,false);assert.equal(count(p.inventory,'logs'),1);assert.equal(p.skills.crafting.xp,0);
 p.inventory.pop();assert.equal(P.start(p,'craft_rabbit_snare',1,0).ok,true);assert.equal(P.advance(p,1799),null);
 assert.equal(P.advance(p,1800).ok,true);assert.equal(count(p.inventory,'rabbit_snare'),2);assert.equal(p.inventory.length,28);assert.equal(p.skills.crafting.xp,10);
});
test('hunt requires a snare and six seconds for every catch, including after stalls',()=>{
 const p=player();assert.equal(P.start(p,'hunt_rabbit',1,0).ok,false);
 addItem(p.inventory,'rabbit_snare',3);assert.equal(P.start(p,'hunt_rabbit','max',0).ok,true);assert.equal(p.production.total,3);
 assert.equal(P.advance(p,5999),null);assert.equal(count(p.inventory,'rabbit_snare'),3);
 assert.equal(P.advance(p,6000).ok,true);assert.equal(P.advance(p,6000),null);assert.equal(p.production.endsAt,12000);
 P.advance(p,100000);assert.equal(count(p.inventory,'raw_rabbit'),2);assert.equal(p.production.endsAt,106000);
 assert.equal(P.advance(p,105999),null);P.advance(p,106000);assert.equal(p.production,null);assert.equal(p.skills.hunter.xp,135);assert.equal(count(p.inventory,'rabbit_snare'),0);
});
test('simultaneous hunters cannot consume each others snares; cancel, movement and missing inputs give no reward',()=>{
 for(const mode of ['cancel','move','remove','leave']){
  const a=player(),b=player();for(const p of [a,b]){addItem(p.inventory,'rabbit_snare');P.start(p,'hunt_rabbit',1,0);}
  if(mode==='cancel')P.cancel(a);if(mode==='move')a.path=[{x:1,y:1}];if(mode==='remove')a.inventory=[];if(mode==='leave')a.x=0;
  P.advance(a,6000);P.advance(b,6000);P.advance(b,6000);
  assert.equal(a.skills.hunter.xp,0);assert.equal(count(a.inventory,'raw_rabbit'),0);assert.equal(count(a.inventory,'rabbit_snare'),mode==='remove'?0:1);
  assert.equal(b.skills.hunter.xp,45);assert.equal(count(b.inventory,'raw_rabbit'),1);
 }
});
test('full bag replaces completed snare with catch; wrong region rejects before consumption',()=>{
 const p=player();addItem(p.inventory,'rabbit_snare');addItem(p.inventory,'bread',27);p.x=0;
 assert.equal(P.start(p,'hunt_rabbit',1,0).ok,false);p.x=2520;
 assert.equal(P.availability(p,'hunt_rabbit').max,1);P.start(p,'hunt_rabbit',1,0);P.advance(p,6000);
 assert.equal(p.inventory.length,28);assert.equal(count(p.inventory,'raw_rabbit'),1);
});
test('Rusk quest guidance follows logs, snare crafting, banked snares, hunting and cooking',()=>{
 const p=player();assert.match(targetFor(p,'patrol_provisions').label,/Gather Logs/);
 addItem(p.inventory,'logs');assert.match(targetFor(p,'patrol_provisions').label,/Weave rabbit snares/);
 p.inventory=[];p.bank=[{id:'rabbit_snare',qty:1}];assert.match(recipeTarget(p,'hunt_rabbit').label,/Withdraw Rabbit snare/);
 p.bank=[];addItem(p.inventory,'rabbit_snare');assert.match(targetFor(p,'patrol_provisions').label,/Set a rabbit snare at hunt/);
 p.inventory=[{id:'raw_rabbit',qty:1}];assert.match(targetFor(p,'patrol_provisions').label,/Roast rabbit/);
});
