'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production');
const {SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count,removeItem}=require('../game/rules');
const {turnInQuest}=require('../game/activities');
const {targetFor}=require('../game/quest-targets');
function player(){return {x:490,y:330,openBuilding:'forge',inventory:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),gold:0,path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function craft(p,id,qty,now){assert.equal(P.start(p,id,qty,now).ok,true);for(let i=1;i<=qty;i++)assert.equal(P.advance(p,now+i*1800).ok,true);}
test('ore to tips to arrows closes a timed smithing/fletching loop',()=>{
 const p=player();addItem(p.inventory,'copper_ore');addItem(p.inventory,'tin_ore');addItem(p.inventory,'logs');addItem(p.inventory,'feathers',15);
 craft(p,'smelt_bronze',1,1000);craft(p,'smith_arrowtips',1,3000);
 assert.equal(count(p.inventory,'bronze_bar'),0);assert.equal(count(p.inventory,'bronze_arrowtips'),15);
 craft(p,'fletch_shafts',1,5000);craft(p,'fletch_arrows',1,7000);
 assert.equal(count(p.inventory,'bronze_arrow'),15);assert.equal(count(p.inventory,'bronze_arrowtips'),0);
 assert.equal(p.skills.smithing.xp,95);assert.equal(p.skills.fletching.xp,55);assert.equal(p.gold,0);
});
test('guard quest unlocks after goblins, requires own crafting and delivery, and pays once',()=>{
 const p=player();p.quests.goblin_hunt.status='active';p.quests.goblin_hunt.progress=3;
 assert.equal(turnInQuest(p,'goblin_hunt','elder').ok,true);assert.equal(p.quests.guard_supplies.status,'active');
 addItem(p.inventory,'bronze_arrowtips',30);assert.equal(turnInQuest(p,'guard_supplies','guard'),null);
 removeItem(p.inventory,'bronze_arrowtips',30);addItem(p.inventory,'bronze_bar',2);craft(p,'smith_arrowtips',2,1000);
 assert.equal(targetFor(p,'guard_supplies').kind,'npc');assert.equal(turnInQuest(p,'guard_supplies','elder'),null);
 removeItem(p.inventory,'bronze_arrowtips',1);assert.equal(turnInQuest(p,'guard_supplies','guard').ok,false);
 assert.equal(targetFor(p,'guard_supplies').kind,'station');addItem(p.inventory,'bronze_arrowtips');
 assert.equal(turnInQuest(p,'guard_supplies','guard').ok,true);assert.equal(p.gold,65);assert.equal(count(p.inventory,'feathers'),30);
 assert.equal(count(p.inventory,'bronze_arrowtips'),0);assert.equal(turnInQuest(p,'guard_supplies','guard'),null);
});
test('two smiths remain isolated; leaving forge and duplicate requests cannot grant free tips',()=>{
 const a=player(),b=player();for(const p of [a,b]){p.quests.guard_supplies.status='active';addItem(p.inventory,'bronze_bar',2);assert.equal(P.start(p,'smith_arrowtips',2,1000).ok,true);}
 assert.equal(P.start(a,'smith_arrowtips',2,1000).ok,false);a.path=[{x:800,y:800}];P.advance(a,2800);P.advance(b,2800);P.advance(b,4600);
 assert.equal(count(a.inventory,'bronze_bar'),2);assert.equal(a.skills.smithing.xp,0);assert.equal(a.quests.guard_supplies.progress,0);
 assert.equal(count(b.inventory,'bronze_arrowtips'),30);assert.equal(b.quests.guard_supplies.progress,2);
 a.path=[];a.x=2000;assert.equal(P.start(a,'smith_arrowtips',1,5000).ok,false);
});
test('stack overflow leaves bar, XP and quest progress unchanged',()=>{
 const p=player();p.quests.guard_supplies.status='active';addItem(p.inventory,'bronze_bar');addItem(p.inventory,'bronze_arrowtips',999990);
 const before=JSON.stringify(p.inventory);assert.equal(P.start(p,'smith_arrowtips',1,1000).ok,true);
 assert.equal(P.advance(p,2800).ok,false);assert.equal(JSON.stringify(p.inventory),before);assert.equal(p.skills.smithing.xp,0);assert.equal(p.quests.guard_supplies.progress,0);
});
