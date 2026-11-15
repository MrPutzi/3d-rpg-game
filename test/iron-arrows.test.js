'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production'),{SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count,equip}=require('../game/rules');
const {turnInQuest}=require('../game/activities'),{targetFor}=require('../game/quest-targets');
const {createEconomy}=require('../game/economy');
function player(){return {x:490,y:330,openBuilding:'forge',gold:0,inventory:[],equipment:{},skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function craft(p,id,now){assert.equal(P.start(p,id,1,now).ok,true);assert.equal(P.advance(p,now+1800).ok,true);}
function trained(){const p=player();p.skills.smithing={level:15,xp:10000};return p;}
test('iron arrows require both skills, consume materials and award XP once',()=>{
 const p=trained();addItem(p.inventory,'iron_bar',2);
 p.openBuilding=null;assert.equal(P.start(p,'smith_iron_arrowtips',1,0).ok,false);p.openBuilding='forge';
 craft(p,'smith_iron_arrowtips',0);craft(p,'smith_iron_arrowtips',2000);
 addItem(p.inventory,'arrow_shafts',30);addItem(p.inventory,'feathers',30);
 assert.equal(P.start(p,'fletch_iron_arrows',1,4000).ok,false);
 p.skills.fletching={level:15,xp:10000};craft(p,'fletch_iron_arrows',4000);P.advance(p,5800);
 assert.equal(count(p.inventory,'iron_arrow'),15);assert.equal(count(p.inventory,'iron_arrowtips'),15);
 assert.equal(p.skills.fletching.xp,10055);assert.equal(equip(p,'iron_arrow').ok,true);
});
test('watch delivery unlocks, requires personal production and consumes equipped arrows once',()=>{
 const p=trained();p.skills.fletching={level:15,xp:10000};p.quests.iron_supplies.status='active';p.quests.iron_supplies.progress=2;
 addItem(p.inventory,'iron_dagger',2);assert.equal(turnInQuest(p,'iron_supplies','guard').ok,true);
 assert.equal(p.quests.watch_arrows.status,'active');addItem(p.inventory,'iron_arrow',30);
 assert.equal(turnInQuest(p,'watch_arrows','guard'),null);p.inventory=[];
 for(const id of ['arrow_shafts','feathers','iron_arrowtips'])addItem(p.inventory,id,30);
 craft(p,'fletch_iron_arrows',0);craft(p,'fletch_iron_arrows',2000);
 assert.equal(targetFor(p,'watch_arrows').kind,'npc');equip(p,'iron_arrow');
 assert.equal(turnInQuest(p,'watch_arrows','elder'),null);
 assert.equal(turnInQuest(p,'watch_arrows','guard').ok,true);assert.equal(count(p.inventory,'iron_arrow'),0);
 assert.equal(p.equipment.ammo,null);assert.equal(p.gold,90);assert.equal(turnInQuest(p,'watch_arrows','guard'),null);
});
test('two fletchers remain isolated; interrupted work and overflow preserve ingredients',()=>{
 const a=trained(),b=trained();for(const p of [a,b]){p.skills.fletching={level:15,xp:10000};for(const id of ['arrow_shafts','feathers','iron_arrowtips'])addItem(p.inventory,id,15);assert.equal(P.start(p,'fletch_iron_arrows',1,0).ok,true);}
 a.path=[{x:500,y:500}];P.advance(a,1800);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'iron_arrowtips'),15);assert.equal(count(a.inventory,'iron_arrow'),0);assert.equal(count(b.inventory,'iron_arrow'),15);
 const p=trained();p.skills.fletching={level:15,xp:10000};for(const id of ['arrow_shafts','feathers','iron_arrowtips'])addItem(p.inventory,id,15);
 addItem(p.inventory,'iron_arrow',999990);assert.equal(P.start(p,'fletch_iron_arrows',1,0).ok,false);assert.equal(count(p.inventory,'iron_arrowtips'),15);
});
test('ammo recipe UI shows actual ranged strength and ammunition type',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({item:require('../game/content').ITEMS.iron_arrow});vm.runInContext(source.match(/function recipeEquipmentDetails\(item\)\{[\s\S]*?\n\}/)[0],ctx);
 const text=vm.runInContext('recipeEquipmentDetails(item)',ctx);assert.match(text,/Ranged strength \+5/);assert.match(text,/Ammunition: arrow/);assert.doesNotMatch(text,/Requires defence/);
});
