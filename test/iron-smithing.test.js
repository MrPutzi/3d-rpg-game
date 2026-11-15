'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production'),{SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count,equip}=require('../game/rules');
const {turnInQuest}=require('../game/activities'),{targetFor}=require('../game/quest-targets');
const {createEconomy}=require('../game/economy');
function player(){return {x:490,y:330,openBuilding:'forge',gold:0,inventory:[],equipment:{},skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function craft(p,id,now){assert.equal(P.start(p,id,1,now).ok,true);assert.equal(P.advance(p,now+1800).ok,true);}
function trained(){const p=player();p.skills.smithing={level:15,xp:10000};return p;}
test('iron ore becomes an equipable and sellable dagger only at the required level and forge',()=>{
 const p=player();addItem(p.inventory,'iron_ore');assert.equal(P.start(p,'smelt_iron',1,0).ok,false);
 p.skills.smithing={level:15,xp:10000};p.openBuilding=null;assert.equal(P.start(p,'smelt_iron',1,0).ok,false);p.openBuilding='forge';
 craft(p,'smelt_iron',0);assert.equal(count(p.inventory,'iron_ore'),0);assert.equal(count(p.inventory,'iron_bar'),1);
 craft(p,'smith_iron_dagger',2000);assert.equal(count(p.inventory,'iron_bar'),0);assert.equal(p.skills.smithing.xp,10125);
 assert.equal(equip(p,'iron_dagger').ok,true);const market=createEconomy();assert.equal(market.sell(p,'forge','iron_dagger',1).ok,true);assert.ok(p.gold>0);
});
test('watch quest follows arrow supplies, requires personal crafting and consumes equipped delivery once',()=>{
 const p=trained();p.quests.guard_supplies.status='active';p.quests.guard_supplies.progress=2;addItem(p.inventory,'bronze_arrowtips',30);
 assert.equal(turnInQuest(p,'guard_supplies','guard').ok,true);assert.equal(p.quests.iron_supplies.status,'active');
 addItem(p.inventory,'iron_dagger',2);assert.equal(turnInQuest(p,'iron_supplies','guard'),null);p.inventory=[];
 assert.equal(targetFor(p,'iron_supplies').kind,'station');addItem(p.inventory,'iron_bar',2);
 craft(p,'smith_iron_dagger',0);craft(p,'smith_iron_dagger',2000);assert.equal(targetFor(p,'iron_supplies').kind,'npc');
 assert.equal(turnInQuest(p,'iron_supplies','elder'),null);equip(p,'iron_dagger');
 assert.equal(turnInQuest(p,'iron_supplies','guard').ok,true);assert.equal(p.equipment.weapon,null);assert.equal(count(p.inventory,'iron_dagger'),0);assert.equal(p.gold,70);
 assert.equal(turnInQuest(p,'iron_supplies','guard'),null);
});
test('simultaneous smiths, repeated ticks, movement and missing materials cannot duplicate rewards',()=>{
 const a=trained(),b=trained();for(const p of [a,b]){addItem(p.inventory,'iron_ore');assert.equal(P.start(p,'smelt_iron',1,0).ok,true);}
 assert.equal(P.start(a,'smelt_iron',1,0).ok,false);a.path=[{x:600,y:500}];P.advance(a,1800);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'iron_ore'),1);assert.equal(a.skills.smithing.xp,10000);assert.equal(count(b.inventory,'iron_bar'),1);assert.equal(b.skills.smithing.xp,10065);
 assert.equal(P.start(b,'smelt_iron',1,2000).ok,false);
});
test('full inventory conversion uses the freed slot and completion rechecks ingredients',()=>{
 const p=trained();addItem(p.inventory,'iron_ore');addItem(p.inventory,'bread',27);craft(p,'smelt_iron',0);assert.equal(p.inventory.length,28);craft(p,'smith_iron_dagger',2000);assert.equal(p.inventory.length,28);
 const q=trained();addItem(q.inventory,'iron_bar');P.start(q,'smith_iron_dagger',1,0);q.inventory=[];assert.equal(P.advance(q,1800).ok,false);assert.equal(q.skills.smithing.xp,10000);
});
test('recipe UI shows real attack, strength, speed and wielding requirement',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({});vm.runInContext(source.match(/function recipeEquipmentDetails\(item\)\{[\s\S]*?\n\}/)[0],ctx);
 ctx.item=require('../game/content').ITEMS.iron_dagger;const text=vm.runInContext('recipeEquipmentDetails(item)',ctx);
 assert.match(text,/Attack \+5/);assert.match(text,/Strength \+5/);assert.match(text,/Attack interval 2.4s/);assert.match(text,/Requires attack Lv1/);
});
