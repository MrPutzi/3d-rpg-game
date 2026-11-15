'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production'),{SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count,equip}=require('../game/rules');
const {turnInQuest}=require('../game/activities'),{targetFor}=require('../game/quest-targets');
const {createEconomy}=require('../game/economy');
function player(){return {x:490,y:330,openBuilding:'forge',gold:0,inventory:[],equipment:{},skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function craft(p,id,now){assert.equal(P.start(p,id,1,now).ok,true);assert.equal(P.advance(p,now+1800).ok,true);}
function trained(){const p=player();p.skills.smithing={level:15,xp:10000};return p;}
test('shortbow loop consumes logs and leather, equips with arrows and sells',()=>{
 const p=player();p.openBuilding='guild';p.x=540;p.y=467;
 addItem(p.inventory,'logs',2);addItem(p.inventory,'leather',1);
 assert.equal(P.start(p,'fletch_shortbow',1,0).ok,false);
 p.skills.fletching={level:5,xp:500};craft(p,'fletch_shortbow',0);
 assert.equal(count(p.inventory,'logs'),0);assert.equal(count(p.inventory,'leather'),0);assert.equal(p.skills.fletching.xp,550);
 p.equipment.offhand='bronze_shield';assert.equal(equip(p,'shortbow').ok,true);assert.equal(p.equipment.offhand,null);
 addItem(p.inventory,'iron_arrow',15);assert.equal(equip(p,'iron_arrow').ok,true);
 addItem(p.inventory,'bronze_bolt',15);assert.equal(equip(p,'bronze_bolt').ok,false);
 assert.equal(createEconomy().sell(p,'market','shortbow',1).ok,true);assert.ok(p.gold>0);
});
test('oak bow requires the guild and Fletching 20; wielding still requires Ranging 5',()=>{
 const p=player();p.skills.fletching={level:20,xp:5000};addItem(p.inventory,'oak_logs',2);addItem(p.inventory,'leather',2);
 assert.equal(P.start(p,'fletch_oak_shortbow',1,0).ok,false);p.openBuilding='guild';p.x=540;p.y=467;
 craft(p,'fletch_oak_shortbow',0);assert.equal(count(p.inventory,'oak_shortbow'),1);assert.equal(p.skills.fletching.xp,5100);
 assert.equal(equip(p,'oak_shortbow').ok,false);p.skills.ranging={level:5,xp:500};assert.equal(equip(p,'oak_shortbow').ok,true);
});
test('two bowmakers, repeated ticks and depleted supplies cannot duplicate bows',()=>{
 const a=player(),b=player();for(const p of [a,b]){p.openBuilding='guild';p.x=540;p.y=467;p.skills.fletching={level:5,xp:500};addItem(p.inventory,'logs',2);addItem(p.inventory,'leather');assert.equal(P.start(p,'fletch_shortbow',1,0).ok,true);}
 a.path=[{x:600,y:500}];P.advance(a,1800);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'logs'),2);assert.equal(count(a.inventory,'shortbow'),0);assert.equal(count(b.inventory,'shortbow'),1);
 assert.equal(P.start(b,'fletch_shortbow',1,2000).ok,false);
 a.path=[];P.start(a,'fletch_shortbow',1,2000);a.inventory=[];assert.equal(P.advance(a,3800).ok,false);assert.equal(a.skills.fletching.xp,500);
});
test('arrow guidance follows local production, forge and Guard independently',()=>{
 const a=player(),b=player();for(const p of [a,b])p.quests.watch_arrows.status='active';
 a.inventory=[{id:'logs',qty:1}];assert.match(targetFor(a,'watch_arrows').label,/Make arrow shafts here/);
 a.inventory=[{id:'arrow_shafts',qty:30},{id:'feathers',qty:30},{id:'iron_bar',qty:2}];assert.match(targetFor(a,'watch_arrows').label,/Smith iron arrowtips/);
 a.inventory=[{id:'arrow_shafts',qty:30},{id:'feathers',qty:30},{id:'iron_arrowtips',qty:30}];
 const before=JSON.stringify(a),target=targetFor(a,'watch_arrows');assert.equal(target.kind,'activity');assert.equal(target.x,a.x);assert.match(target.label,/Fletch iron arrows here/);assert.equal(JSON.stringify(a),before);
 assert.equal(targetFor(b,'watch_arrows').kind,'area');
 a.quests.watch_arrows.progress=2;a.inventory=[{id:'iron_arrow',qty:30}];assert.equal(targetFor(a,'watch_arrows').kind,'npc');
});
test('bow recipe UI shows ranged attack and compatible ammunition with real requirements',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({item:require('../game/content').ITEMS.oak_shortbow});vm.runInContext(source.match(/function recipeEquipmentDetails\(item\)\{[\s\S]*?\n\}/)[0],ctx);
 const text=vm.runInContext('recipeEquipmentDetails(item)',ctx);for(const re of [/Ranged attack \+22/,/Uses arrow ammunition/,/Requires ranging Lv5/,/Two-handed/])assert.match(text,re);
});
