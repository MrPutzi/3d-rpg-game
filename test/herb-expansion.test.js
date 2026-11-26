'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {DROPS,rollDrops,QUESTS}=require('../game/progression');
const {targetFor}=require('../game/quest-targets');
const {turnInQuest}=require('../game/activities');
const {skill,addItem,count}=require('../game/rules');
const Farming=require('../game/farming');
test('swamp trolls can supply marentill seeds for the next herb tier',()=>{
 assert.ok(DROPS.swamp_troll.some(d=>d.id==='marentill_seed'&&d.chance===.2));
 assert.ok(rollDrops('swamp_troll',()=>0).some(d=>d.id==='marentill_seed'));
});
test('Quiet Hands supplies a seed and unlocks the marsh remedy delivery quest',()=>{
 const p={gold:0,inventory:[],quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};
 p.quests.quiet_hands.status='active';p.quests.quiet_hands.progress=3;
 assert.equal(turnInQuest(p,'quiet_hands','ranger').ok,true);
 assert.equal(count(p.inventory,'marentill_seed'),1);assert.equal(p.quests.marsh_remedies.status,'active');
});
test('marsh quest guidance leads to swamp trolls before the seed and the farm afterwards',()=>{
 const p={x:380,y:380,inventory:[],bank:[],farmPatch:null,quests:{marsh_remedies:{status:'active',progress:0,goal:2}}};
 const source=targetFor(p,'marsh_remedies');assert.equal(source.kind,'area');assert.match(source.label,/Swamp Troll/);
 p.inventory=[{id:'marentill_seed',qty:1}];const farm=targetFor(p,'marsh_remedies');
 assert.equal(farm.kind,'station');assert.equal(farm.x,1010);
});
test('two farmers grow separate marentill crops without sharing patch state',()=>{
 const make=()=>({loggedIn:true,hp:20,x:1010,y:890,inventory:[{id:'marentill_seed',qty:1}],skills:{farming:{...skill(),level:5}},farmPatch:null});
 const a=make(),b=make();assert.ok(Farming.plant(a,'marentill',1000).ok);assert.ok(Farming.plant(b,'marentill',2000).ok);
 assert.notEqual(a.farmPatch.readyAt,b.farmPatch.readyAt);
 assert.ok(Farming.harvest(a,91000).ok);assert.equal(b.farmPatch.kind,'marentill');
});
