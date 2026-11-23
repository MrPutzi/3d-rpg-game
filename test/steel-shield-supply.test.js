'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SKILLS,QUESTS}=require('../game/progression'),{ITEMS}=require('../game/content');
const {skill,addItem,count,equip}=require('../game/rules'),P=require('../game/production');
const {turnInQuest}=require('../game/activities'),{targetFor}=require('../game/quest-targets');
const {createEconomy}=require('../game/economy');
function player(){return {x:490,y:330,openBuilding:'forge',gold:0,inventory:[],equipment:{},skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function train(p){p.skills.smithing={level:35,xp:23000};}
function craft(p,t){assert.equal(P.start(p,'smith_steel_shield',1,t).ok,true);assert.equal(P.advance(p,t+1799),null);assert.equal(P.advance(p,t+1800).ok,true);}
test('steel shields consume two bars, require smithing 35 and separately defence 5',()=>{
 const p=player();addItem(p.inventory,'steel_bar',2);p.skills.smithing.level=34;
 assert.equal(P.start(p,'smith_steel_shield',1,0).ok,false);train(p);p.openBuilding=null;
 assert.equal(P.start(p,'smith_steel_shield',1,0).ok,false);p.openBuilding='forge';craft(p,0);
 assert.equal(count(p.inventory,'steel_bar'),0);assert.equal(count(p.inventory,'steel_shield'),1);assert.equal(p.skills.smithing.xp,23120);
 assert.equal(equip(p,'steel_shield').ok,false);p.skills.defence.level=5;assert.equal(equip(p,'steel_shield').ok,true);
 assert.equal(createEconomy().sell(p,'forge','steel_shield',1).ok,true);assert.ok(p.gold>0);
});
test('two smiths have independent output; interrupted or repeated completion cannot duplicate shields',()=>{
 const a=player(),b=player();for(const p of [a,b]){train(p);addItem(p.inventory,'steel_bar',2);P.start(p,'smith_steel_shield',1,0);}
 a.path=[{x:550,y:330}];P.advance(a,1800);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'steel_bar'),2);assert.equal(count(a.inventory,'steel_shield'),0);assert.equal(count(b.inventory,'steel_shield'),1);
});
test('follow-up unlocks after steel daggers, requires own crafting and consumes equipped delivery once',()=>{
 const p=player();train(p);p.quests.watch_steel.status='active';p.quests.watch_steel.progress=2;addItem(p.inventory,'steel_dagger',2);
 assert.equal(turnInQuest(p,'watch_steel','guard').ok,true);assert.equal(p.quests.watch_steel_shields.status,'active');
 addItem(p.inventory,'steel_shield',2);assert.equal(turnInQuest(p,'watch_steel_shields','guard'),null);
 p.inventory=[];addItem(p.inventory,'iron_ore',4);assert.match(targetFor(p,'watch_steel_shields').label,/Coal Rock/);
 p.inventory=[];addItem(p.inventory,'steel_bar',4);craft(p,0);craft(p,2000);
 assert.equal(p.quests.watch_steel_shields.progress,2);assert.equal(targetFor(p,'watch_steel_shields').kind,'npc');
 assert.equal(turnInQuest(p,'watch_steel_shields','elder'),null);p.skills.defence.level=5;equip(p,'steel_shield');
 assert.equal(turnInQuest(p,'watch_steel_shields','guard').ok,true);assert.equal(p.gold,110);assert.equal(count(p.inventory,'steel_shield'),0);assert.equal(p.equipment.offhand,null);
 assert.equal(turnInQuest(p,'watch_steel_shields','guard'),null);
});
test('recipe warnings distinguish crafting from equip level and two-handed conflicts',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({});vm.runInContext(source.match(/function recipeEquipWarning\(item,skills,equipment,catalog\)\{[\s\S]*?\n\}/)[0],ctx);
 const warn=ctx.recipeEquipWarning;
 assert.match(warn(ITEMS.steel_shield,{defence:{level:1}},{},ITEMS),/defence Lv5/);
 assert.equal(warn(ITEMS.steel_shield,{defence:{level:5}},{},ITEMS),'');
 assert.match(warn(ITEMS.steel_shield,{defence:{level:5}},{weapon:'shortbow'},ITEMS),/one-handed/);
 assert.match(warn(ITEMS.shortbow,{ranging:{level:1}},{offhand:'steel_shield'},ITEMS),/removes your shield/);
 assert.equal(warn(ITEMS.steel_bar,{}, {},ITEMS),'');
});
