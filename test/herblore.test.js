'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production'),{SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count}=require('../game/rules'),{turnInQuest}=require('../game/activities');
const {eat}=require('../game/food'),{createEconomy}=require('../game/economy');
function player(){return {loggedIn:true,hp:10,maxHp:20,x:250,y:330,openBuilding:'tavern',gold:0,inventory:[],equipment:{},skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function brew(p,now){assert.equal(P.start(p,'brew_tonic',1,now).ok,true);assert.equal(P.advance(p,now+1800).ok,true);}
function supplies(p,n){addItem(p.inventory,'guam_leaf',n);addItem(p.inventory,'vial_of_water',n);}
test('level one herbalist can train to the existing level three potion without free ingredients',()=>{
 const p=player();assert.equal(P.start(p,'brew_tonic',1,0).ok,false);supplies(p,8);
 assert.equal(P.start(p,'brew_potion',1,0).ok,false);
 for(let i=0;i<8;i++)brew(p,i*4000);
 assert.equal(p.skills.herblore.xp,200);assert.ok(p.skills.herblore.level>=3);
 supplies(p,1);assert.equal(P.start(p,'brew_potion',1,32000).ok,true);
 assert.equal(P.advance(p,33800).ok,true);assert.equal(count(p.inventory,'healing_potion'),1);
});
test('tonics heal, obey cooldown and are sellable without creating gold on crafting',()=>{
 const p=player();supplies(p,2);brew(p,0);brew(p,4000);assert.equal(p.gold,0);
 assert.equal(eat(p,'herbal_tonic',6000).healed,4);assert.equal(eat(p,'herbal_tonic',6001).ok,false);
 assert.equal(createEconomy().sell(p,'tavern','herbal_tonic',1).ok,true);assert.ok(p.gold>0);
});
test('Westwood quest unlocks after logs, requires personal brewing, consumes delivery only once',()=>{
 const p=player();p.quests.forest_supplies.status='active';p.quests.forest_supplies.progress=5;
 assert.equal(turnInQuest(p,'forest_supplies','forester').ok,true);assert.equal(p.quests.herbal_supplies.status,'active');
 addItem(p.inventory,'herbal_tonic',2);assert.equal(turnInQuest(p,'herbal_supplies','forester'),null);
 p.inventory=[];supplies(p,2);brew(p,0);brew(p,4000);
 assert.equal(turnInQuest(p,'herbal_supplies','ranger'),null);
 assert.equal(turnInQuest(p,'herbal_supplies','forester').ok,true);assert.equal(p.gold,55);
 assert.equal(count(p.inventory,'herbal_tonic'),0);assert.equal(turnInQuest(p,'herbal_supplies','forester'),null);
});
test('two herbalists, movement interruption and repeated completion cannot duplicate items or XP',()=>{
 const a=player(),b=player();for(const p of [a,b]){supplies(p,1);assert.equal(P.start(p,'brew_tonic',1,0).ok,true);}
 a.path=[{x:400,y:400}];assert.equal(P.advance(a,1800).ok,false);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'guam_leaf'),1);assert.equal(a.skills.herblore.xp,0);
 assert.equal(count(b.inventory,'herbal_tonic'),1);assert.equal(b.skills.herblore.xp,25);
});
test('delivery UI counts separate slots and updates after consuming a tonic',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({named:id=>id,inventory:[{id:'herbal_tonic',qty:1},{id:'herbal_tonic',qty:1}]});
 vm.runInContext(source.match(/function questDeliveryDetails\(inventory,item,qty\)\{[\s\S]*?\n\}/)[0],ctx);
 assert.match(vm.runInContext("questDeliveryDetails(inventory,'herbal_tonic',2)",ctx),/2\/2 · consumed/);
 ctx.inventory.pop();assert.match(vm.runInContext("questDeliveryDetails(inventory,'herbal_tonic',2)",ctx),/1\/2/);
});

test('marentill tonic completes the level-five herb loop and heals through the shared food rules',()=>{
 const p=player();p.skills.herblore={level:5,xp:0};
 addItem(p.inventory,'marentill_leaf',1);addItem(p.inventory,'vial_of_water',1);
 assert.equal(P.start(p,'brew_marentill_tonic',1,0).ok,true);
 assert.equal(P.advance(p,1800).ok,true);assert.equal(count(p.inventory,'marentill_tonic'),1);
 p.hp=10;assert.equal(eat(p,'marentill_tonic',2000).healed,7);
 assert.equal(p.skills.herblore.xp,65);
});
test('marsh remedies unlocks after Quiet Hands and consumes two personally brewed tonics once',()=>{
 const p=player();p.quests.quiet_hands.status='active';p.quests.quiet_hands.progress=3;
 addItem(p.inventory,'marentill_seed',1);
 assert.equal(turnInQuest(p,'quiet_hands','ranger').ok,true);
 assert.equal(p.quests.marsh_remedies.status,'active');assert.equal(count(p.inventory,'marentill_seed'),2);
 addItem(p.inventory,'marentill_tonic',2);p.quests.marsh_remedies.progress=2;
 assert.equal(turnInQuest(p,'marsh_remedies','ranger').ok,true);
 assert.equal(count(p.inventory,'marentill_tonic'),0);assert.equal(p.gold,80);
 assert.equal(turnInQuest(p,'marsh_remedies','ranger'),null);
});
