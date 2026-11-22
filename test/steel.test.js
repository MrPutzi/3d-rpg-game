'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SKILLS,QUESTS}=require('../game/progression'),{RESOURCE_TEMPLATES}=require('../game/content');
const {skill,addItem,count,equip}=require('../game/rules'),{gather}=require('../game/gathering');
const P=require('../game/production'),{turnInQuest}=require('../game/activities'),{targetFor}=require('../game/quest-targets');
const {createEconomy}=require('../game/economy');
function player(){return {x:490,y:330,openBuilding:'forge',gold:0,inventory:[],equipment:{},skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function trained(){const p=player();p.skills.smithing={level:30,xp:14000};return p;}
function craft(p,id,now){assert.equal(P.start(p,id,1,now).ok,true);assert.equal(P.advance(p,now+1800).ok,true);}
test('coal checks level/tool/capacity and shares depletion between miners',()=>{
 const a=player(),b=player(),n={...RESOURCE_TEMPLATES.find(n=>n.kind==='coal'),readyAt:0};
 addItem(a.inventory,'bronze_pickaxe');assert.equal(gather(a,n,100).ok,false);
 a.skills.mining={level:30,xp:14000};b.skills.mining={level:30,xp:14000};
 assert.equal(gather(b,n,100).ok,false);addItem(b.inventory,'bronze_pickaxe');
 addItem(a.inventory,'bread',27);assert.equal(gather(a,n,100).ok,false);assert.equal(n.readyAt,0);
 a.inventory=[{id:'bronze_pickaxe',qty:1}];
 assert.equal(gather(a,n,100).ok,true);assert.equal(gather(b,n,100).ok,false);
 assert.equal(count(a.inventory,'coal'),1);assert.equal(b.skills.mining.xp,14000);
 assert.equal(gather(b,n,7599).ok,false);assert.equal(gather(b,n,7600).ok,true);
});
test('steel consumes iron and two coal, gates smithing and wielding, then supports sale',()=>{
 const p=player();addItem(p.inventory,'iron_ore');addItem(p.inventory,'coal',2);
 assert.equal(P.start(p,'smelt_steel',1,0).ok,false);p.skills.smithing={level:30,xp:14000};
 p.openBuilding=null;assert.equal(P.start(p,'smelt_steel',1,0).ok,false);p.openBuilding='forge';
 craft(p,'smelt_steel',0);assert.equal(count(p.inventory,'coal'),0);assert.equal(count(p.inventory,'iron_ore'),0);
 craft(p,'smith_steel_dagger',2000);assert.equal(p.skills.smithing.xp,14175);
 assert.equal(equip(p,'steel_dagger').ok,false);p.skills.attack={level:5,xp:400};
 assert.equal(equip(p,'steel_dagger').ok,true);assert.equal(createEconomy().sell(p,'forge','steel_dagger',1).ok,true);assert.ok(p.gold>0);
});
test('two smiths, repeated completion and missing inputs never duplicate steel',()=>{
 const a=trained(),b=trained();for(const p of [a,b]){addItem(p.inventory,'iron_ore');addItem(p.inventory,'coal',2);assert.equal(P.start(p,'smelt_steel',1,0).ok,true);}
 a.path=[{x:500,y:500}];P.advance(a,1800);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'coal'),2);assert.equal(count(a.inventory,'steel_bar'),0);assert.equal(count(b.inventory,'steel_bar'),1);
 const c=trained();addItem(c.inventory,'iron_ore');addItem(c.inventory,'coal',2);P.start(c,'smelt_steel',1,0);c.inventory=[];
 assert.equal(P.advance(c,1800).ok,false);assert.equal(c.skills.smithing.xp,14000);
});
test('watch steel quest unlocks after shields, guides coal and consumes personal delivery only once',()=>{
 const p=trained();p.quests.watch_shields.status='active';p.quests.watch_shields.progress=2;addItem(p.inventory,'iron_shield',2);
 assert.equal(turnInQuest(p,'watch_shields','guard').ok,true);assert.equal(p.quests.watch_steel.status,'active');
 addItem(p.inventory,'steel_dagger',2);assert.equal(turnInQuest(p,'watch_steel','guard'),null);p.inventory=[];
 addItem(p.inventory,'iron_ore',2);assert.match(targetFor(p,'watch_steel').label,/Coal Rock.*mining Lv30/);
 p.inventory=[];addItem(p.inventory,'steel_bar',2);craft(p,'smith_steel_dagger',0);craft(p,'smith_steel_dagger',2000);
 assert.equal(p.quests.watch_steel.progress,2);assert.equal(targetFor(p,'watch_steel').kind,'npc');
 assert.equal(turnInQuest(p,'watch_steel','elder'),null);p.skills.attack={level:5,xp:400};equip(p,'steel_dagger');
 assert.equal(turnInQuest(p,'watch_steel','guard').ok,true);assert.equal(p.equipment.weapon,null);assert.equal(count(p.inventory,'steel_dagger'),0);assert.equal(p.gold,90);
 assert.equal(turnInQuest(p,'watch_steel','guard'),null);
});
