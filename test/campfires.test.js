'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Fires=require('../game/campfires'),P=require('../game/production');
const {stationReady}=require('../game/activities'),{SKILLS}=require('../game/progression');
const {skill,addItem,count}=require('../game/rules');
function player(id,x=2200){return {id,x,y:1800,gold:0,inventory:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),quests:{},path:[],intent:null};}
test('lighting logs creates a timed shared fire only after production completes',()=>{
 const a=player('a'),b=player('b',2280);addItem(a.inventory,'logs');
 assert.equal(P.start(a,'firemaking_logs',1,0).ok,true);assert.equal(Fires.nearby(b,1799),null);
 P.advance(a,1800);assert.equal(count(a.inventory,'logs'),0);assert.equal(a.skills.firemaking.xp,40);
 assert.ok(Fires.nearby(b,1800));b.x=2280.01;assert.equal(Fires.nearby(b,1800),null);
 const visible=Fires.snapshot(1800);assert.equal(visible.length,1);assert.equal(visible[0].remainingMs,60000);assert.equal('owner' in visible[0],false);
 assert.equal(Fires.nearby(a,61800),null);
});
test('campfire cooking consumes food and credits existing quest objectives independently',()=>{
 const now=100000,a=player('cook-a'),b=player('cook-b');Fires.light(a,now);
 for(const p of [a,b]){p.quests.cooked_supplies={status:'active',progress:0,goal:3};addItem(p.inventory,'raw_shrimp');assert.equal(P.start(p,'cook_shrimp',1,now).ok,true);}
 P.advance(a,now+1800);P.advance(b,now+1800);P.advance(a,now+1800);
 for(const p of [a,b]){assert.equal(count(p.inventory,'cooked_shrimp'),1);assert.equal(p.skills.cooking.xp,30);assert.equal(p.quests.cooked_supplies.progress,1);}
 assert.equal(stationReady(a,'tavern',now+1800),false); // Brewing still requires the tavern.
});
test('fire expiry or movement cancels cooking without consuming ingredients',()=>{
 const now=200000,a=player('expires');Fires.light(a,now);addItem(a.inventory,'raw_shrimp');
 assert.equal(P.start(a,'cook_shrimp',1,now+59000).ok,true);assert.equal(P.advance(a,now+60800).ok,false);
 assert.equal(count(a.inventory,'raw_shrimp'),1);assert.equal(a.skills.cooking.xp,0);
 Fires.light(a,now+61000);P.start(a,'cook_shrimp',1,now+61000);a.path=[{x:2400,y:1800}];P.advance(a,now+62800);
 assert.equal(count(a.inventory,'raw_shrimp'),1);
});
test('one active fire per player, expiry cleanup and tavern fallback remain bounded',()=>{
 const now=400000,a=player('renew');Fires.light(a,now);a.x=2300;Fires.light(a,now+1);
 assert.equal(Fires.snapshot(now+1).length,1);assert.equal(Fires.snapshot(now+1)[0].x,2300);
 assert.equal(Fires.snapshot(now+60001).length,0);
 a.x=250;a.y=330;a.openBuilding='tavern';assert.equal(stationReady(a,'cooking',now+60001),true);
});
