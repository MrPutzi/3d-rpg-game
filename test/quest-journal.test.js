'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {QUESTS}=require('../game/progression'),{VILLAGE}=require('../game/content');
const {questReadiness,questJournal,turnInQuest}=require('../game/activities');
const player=()=>({gold:0,inventory:[],quests:Object.fromEntries(Object.entries(QUESTS).map(([id,d])=>[id,{status:'active',progress:0,goal:d.goal}]))});
test('every quest has an existing turn-in NPC and journal never exposes inventory candidates',()=>{
 const p=player(),before=JSON.stringify(p);for(const d of Object.values(QUESTS))assert.ok(VILLAGE.villagers.some(n=>n.id===d.giver));
 const journal=questJournal(p);assert.equal(JSON.stringify(p),before);assert.ok(Object.values(journal).every(g=>!Object.hasOwn(g,'inventory')));
});
test('journal distinguishes prerequisite, objective, missing delivery and reward capacity',()=>{
 const p=player();p.quests.cooked_supplies.status='locked';assert.match(questReadiness(p,'cooked_supplies').message,/Fisherman/);
 p.quests.cooked_supplies.status='active';assert.match(questReadiness(p,'cooked_supplies').message,/0 \/ 3/);
 p.quests.cooked_supplies.progress=3;assert.match(questReadiness(p,'cooked_supplies').message,/Bring 3/);
 p.inventory=Array.from({length:28},()=>({id:'bones',qty:1}));p.quests.goblin_hunt.progress=3;assert.match(questReadiness(p,'goblin_hunt').message,/Free inventory/);
});
test('readiness and turn-in agree, consume deliveries once, and stay isolated per player',()=>{
 const a=player(),b=player();a.quests.cooked_supplies.progress=3;a.inventory=Array.from({length:3},()=>({id:'cooked_shrimp',qty:1}));
 assert.equal(questReadiness(a,'cooked_supplies').ok,true);assert.equal(questReadiness(b,'cooked_supplies').ok,false);
 assert.equal(turnInQuest(a,'cooked_supplies','elder'),null);assert.equal(turnInQuest(a,'cooked_supplies','fisher').ok,true);assert.equal(a.gold,20);assert.equal(a.inventory.length,0);
 assert.equal(turnInQuest(a,'cooked_supplies','fisher'),null);assert.equal(a.gold,20);assert.equal(questReadiness(a,'cooked_supplies').message,'Complete');
});
