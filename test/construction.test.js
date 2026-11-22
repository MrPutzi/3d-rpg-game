'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production'),{SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count}=require('../game/rules');
const {turnInQuest}=require('../game/activities'),{targetFor}=require('../game/quest-targets');
const {createEconomy}=require('../game/economy');
function player(){return {x:540,y:467,openBuilding:'guild',gold:0,inventory:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function craft(p,id,t){assert.equal(P.start(p,id,1,t).ok,true);assert.equal(P.advance(p,t+1800).ok,true);}
test('timber becomes planks and a saleable stool with exact inputs and XP',()=>{
 const p=player();addItem(p.inventory,'logs',4);
 craft(p,'saw_plank',0);craft(p,'saw_plank',2000);craft(p,'build_stool',4000);
 assert.equal(count(p.inventory,'logs'),0);assert.equal(count(p.inventory,'plank'),0);assert.equal(count(p.inventory,'wooden_stool'),1);assert.equal(p.skills.construction.xp,75);
 assert.equal(createEconomy().sell(p,'market','wooden_stool',1).ok,true);assert.ok(p.gold>0);
});
test('Thorin furniture delivery unlocks after tonics and requires personal production',()=>{
 const p=player();p.quests.herbal_supplies.status='active';p.quests.herbal_supplies.progress=2;addItem(p.inventory,'herbal_tonic',2);
 assert.equal(turnInQuest(p,'herbal_supplies','forester').ok,true);assert.equal(p.quests.woodland_furniture.status,'active');
 addItem(p.inventory,'wooden_stool',2);assert.equal(turnInQuest(p,'woodland_furniture','forester'),null);
 p.inventory=[];assert.match(targetFor(p,'woodland_furniture').label,/Gather Logs/);
 addItem(p.inventory,'logs',8);assert.match(targetFor(p,'woodland_furniture').label,/Saw a plank/);
 p.inventory=[];addItem(p.inventory,'plank',4);craft(p,'build_stool',0);craft(p,'build_stool',2000);
 assert.equal(turnInQuest(p,'woodland_furniture','elder'),null);
 assert.equal(turnInQuest(p,'woodland_furniture','forester').ok,true);assert.equal(p.gold,30);assert.equal(count(p.inventory,'wooden_stool'),0);
 assert.equal(turnInQuest(p,'woodland_furniture','forester'),null);
});
test('two builders remain isolated and movement or duplicate completion cannot create furniture',()=>{
 const a=player(),b=player();for(const p of [a,b]){addItem(p.inventory,'plank',2);assert.equal(P.start(p,'build_stool',1,0).ok,true);}
 assert.equal(P.start(b,'build_stool',1,0).ok,false);
 a.path=[{x:600,y:500}];P.advance(a,1800);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'plank'),2);assert.equal(a.skills.construction.xp,0);assert.equal(count(b.inventory,'wooden_stool'),1);
 a.path=[];a.openBuilding=null;assert.equal(P.start(a,'build_stool',1,2000).ok,false);
});
test('missing inputs at completion preserve XP and prevent output',()=>{
 const p=player();addItem(p.inventory,'logs',2);P.start(p,'saw_plank',1,0);p.inventory=[];
 assert.equal(P.advance(p,1800).ok,false);assert.equal(p.skills.construction.xp,0);assert.equal(count(p.inventory,'plank'),0);
});
