'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {gather}=require('../game/gathering'),{RESOURCE_TEMPLATES}=require('../game/content');
const {SKILLS,QUESTS}=require('../game/progression'),{skill,addItem,count}=require('../game/rules');
const P=require('../game/production'),{turnInQuest}=require('../game/activities'),{targetFor}=require('../game/quest-targets');
function player(){return {x:1370,y:1390,gold:0,inventory:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
const node=()=>({...RESOURCE_TEMPLATES.find(n=>n.kind==='essence'),readyAt:0});
test('shared essence depletion permits one winner and respawns at the exact boundary',()=>{
 const a=player(),b=player(),n=node();for(const p of [a,b])addItem(p.inventory,'bronze_pickaxe');
 assert.equal(gather(a,n,100).ok,true);assert.equal(gather(b,n,100).ok,false);
 assert.equal(count(a.inventory,'rune_essence'),1);assert.equal(b.skills.mining.xp,0);
 assert.equal(gather(b,n,7599).ok,false);assert.equal(gather(b,n,7600).ok,true);assert.equal(b.skills.mining.xp,10);
});
test('missing pickaxe or full inventory cannot consume the shared resource',()=>{
 const p=player(),n=node();assert.equal(gather(p,n,0).ok,false);assert.equal(n.readyAt,0);
 addItem(p.inventory,'bronze_pickaxe');addItem(p.inventory,'bread',27);
 assert.equal(gather(p,n,0).ok,false);assert.equal(n.readyAt,0);assert.equal(p.skills.mining.xp,0);
});
test('essence to air to mind runes unlocks and completes the elder delivery only once',()=>{
 const p=player();p.quests.goblin_hunt.status='active';p.quests.goblin_hunt.progress=3;
 assert.equal(turnInQuest(p,'goblin_hunt','elder').ok,true);assert.equal(p.quests.altar_supplies.status,'active');
 addItem(p.inventory,'mind_rune',6);assert.equal(turnInQuest(p,'altar_supplies','elder'),null);
 p.inventory=[];assert.match(targetFor(p,'altar_supplies').label,/Essence Rock/);
 addItem(p.inventory,'rune_essence',5);
 for(let i=0;i<3;i++){assert.equal(P.start(p,'craft_air_runes',1,i*2000).ok,true);P.advance(p,i*2000+1800);}
 assert.equal(p.skills.runecrafting.level,2);
 for(let i=0;i<2;i++){assert.equal(P.start(p,'craft_mind_runes',1,6000+i*2000).ok,true);P.advance(p,7800+i*2000);}
 assert.equal(p.quests.altar_supplies.progress,2);assert.equal(count(p.inventory,'air_rune'),15);
 assert.equal(turnInQuest(p,'altar_supplies','guard'),null);assert.equal(turnInQuest(p,'altar_supplies','elder').ok,true);
 assert.equal(count(p.inventory,'mind_rune'),0);assert.equal(p.gold,55);assert.equal(turnInQuest(p,'altar_supplies','elder'),null);
});
