'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production'),{SKILLS,QUESTS,rollDrops}=require('../game/progression');
const {skill,addItem,count,equip}=require('../game/rules');
const {turnInQuest}=require('../game/activities'),{targetFor}=require('../game/quest-targets');
const {createEconomy}=require('../game/economy');
function player(){return {x:540,y:467,openBuilding:'guild',gold:0,inventory:[],equipment:{},skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function craft(p,id,now=0){assert.equal(P.start(p,id,1,now).ok,true);assert.equal(P.advance(p,now+1800).ok,true);}
test('wolf leather becomes craftable boots that can be equipped or resold',()=>{
 const p=player();const leather=rollDrops('wolf',()=>0).find(x=>x.id==='leather');assert.ok(leather);
 addItem(p.inventory,leather.id,2);craft(p,'craft_boots');assert.equal(count(p.inventory,'leather'),1);assert.equal(p.skills.crafting.xp,50);
 assert.equal(equip(p,'leather_boots').ok,true);assert.equal(p.equipment.feet,'leather_boots');
 const e=createEconomy();assert.equal(e.sell(p,'outpost','leather_boots',1).ok,true);assert.ok(p.gold>0);
});
test('higher leather tiers require Crafting levels and consume exact quantities',()=>{
 const p=player();addItem(p.inventory,'leather',5);
 assert.equal(P.start(p,'craft_chaps',1,0).ok,false);assert.equal(P.start(p,'craft_body',1,0).ok,false);
 p.skills.crafting.level=5;craft(p,'craft_chaps');assert.equal(count(p.inventory,'leather'),3);assert.equal(count(p.inventory,'leather_legs'),1);
 p.skills.crafting.level=10;craft(p,'craft_body',2000);assert.equal(count(p.inventory,'leather'),0);assert.equal(count(p.inventory,'leather_body'),1);assert.equal(p.skills.crafting.xp,230);
});
test('patrol boots unlock after provisions, require personal crafting and reward only once',()=>{
 const p=player();p.quests.patrol_provisions.status='active';p.quests.patrol_provisions.progress=3;addItem(p.inventory,'cooked_rabbit',3);
 assert.equal(turnInQuest(p,'patrol_provisions','ranger').ok,true);assert.equal(p.quests.patrol_boots.status,'active');
 addItem(p.inventory,'leather_boots',2);assert.equal(turnInQuest(p,'patrol_boots','ranger'),null);assert.equal(targetFor(p,'patrol_boots').kind,'area');
 p.inventory=[];addItem(p.inventory,'leather',2);craft(p,'craft_boots');craft(p,'craft_boots',2000);
 assert.equal(targetFor(p,'patrol_boots').kind,'npc');assert.equal(turnInQuest(p,'patrol_boots','elder'),null);
 p.equipment.feet='leather_boots';
 assert.equal(turnInQuest(p,'patrol_boots','ranger').ok,true);assert.equal(p.equipment.feet,null);assert.equal(count(p.inventory,'leather_boots'),0);assert.equal(p.gold,50);
 assert.equal(turnInQuest(p,'patrol_boots','ranger'),null);
});
test('two crafters stay isolated; movement, repeat requests and missing leather grant no output',()=>{
 const a=player(),b=player();for(const p of [a,b]){addItem(p.inventory,'leather');assert.equal(P.start(p,'craft_boots',1,0).ok,true);}
 assert.equal(P.start(a,'craft_boots',1,0).ok,false);a.path=[{x:600,y:500}];P.advance(a,1800);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'leather'),1);assert.equal(a.skills.crafting.xp,0);assert.equal(count(b.inventory,'leather_boots'),1);assert.equal(b.skills.crafting.xp,50);
 a.path=[];a.x=2500;assert.equal(P.start(a,'craft_boots',1,3000).ok,false);assert.equal(P.start(b,'craft_boots',1,3000).ok,false);
});
test('full inventory conversion and failed completion preserve resources correctly',()=>{
 const p=player();addItem(p.inventory,'leather');addItem(p.inventory,'bread',27);craft(p,'craft_boots');assert.equal(p.inventory.length,28);
 const q=player();addItem(q.inventory,'leather',2);assert.equal(P.start(q,'craft_boots',1,0).ok,true);q.inventory=[];
 assert.equal(P.advance(q,1800).ok,false);assert.equal(q.skills.crafting.xp,0);assert.equal(q.quests.patrol_boots.progress,0);
});
test('recipe output UI distinguishes equipment requirements from crafting level',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../public/client.js'),'utf8');
 const fn=source.match(/function recipeEquipmentDetails\(item\)\{[\s\S]*?\n\}/)[0];const ctx=vm.createContext({});vm.runInContext(fn,ctx);
 assert.equal(vm.runInContext("recipeEquipmentDetails({slot:'body',defenceBonus:3,skill:'defence',level:1})",ctx),'body slot · Defence +3 · Requires defence Lv1');
 assert.equal(vm.runInContext('recipeEquipmentDetails({heal:6})',ctx),'');
});
