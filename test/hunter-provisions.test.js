'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production');
const {SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count,removeItem}=require('../game/rules');
const {turnInQuest}=require('../game/activities');
const {eat}=require('../game/food');
const {targetFor}=require('../game/quest-targets');
const economy=require('../game/economy');
function player(){return {loggedIn:true,hp:1,maxHp:20,x:2520,y:2050,inventory:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),gold:0,path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function craft(p,id,qty,now){assert.equal(P.start(p,id,qty,now).ok,true);for(let i=1;i<=qty;i++)assert.equal(P.advance(p,now+i*1800).ok,true);}
function tavern(p){p.x=250;p.y=330;p.openBuilding='tavern';}
test('hunt, cook, eat and sell rabbit forms a complete resource loop',()=>{
 const p=player();craft(p,'hunt_rabbit',2,1000);assert.equal(count(p.inventory,'raw_rabbit'),2);assert.equal(p.skills.hunter.xp,90);
 tavern(p);craft(p,'cook_rabbit',2,5000);assert.equal(count(p.inventory,'raw_rabbit'),0);assert.equal(p.skills.cooking.xp,70);
 assert.equal(eat(p,'cooked_rabbit',10000).healed,6);assert.equal(eat(p,'cooked_rabbit',10001).ok,false);
 assert.equal(economy.sell(p,'tavern','cooked_rabbit',1).ok,true);assert.ok(p.gold>0);assert.equal(count(p.inventory,'cooked_rabbit'),0);
});
test('Rusk provisions unlock after patrol, consume meals and reward once',()=>{
 const p=player();p.quests.wilds_patrol.status='active';p.quests.wilds_patrol.progress=2;
 assert.equal(turnInQuest(p,'wilds_patrol','ranger').ok,true);assert.equal(p.quests.patrol_provisions.status,'active');
 addItem(p.inventory,'cooked_rabbit',3);assert.equal(turnInQuest(p,'patrol_provisions','ranger'),null);removeItem(p.inventory,'cooked_rabbit',3);
 addItem(p.inventory,'raw_rabbit',3);tavern(p);craft(p,'cook_rabbit',3,1000);
 assert.equal(targetFor(p,'patrol_provisions').kind,'npc');assert.equal(turnInQuest(p,'patrol_provisions','fisher'),null);
 removeItem(p.inventory,'cooked_rabbit',1);assert.equal(turnInQuest(p,'patrol_provisions','ranger').ok,false);assert.equal(targetFor(p,'patrol_provisions').kind,'station');addItem(p.inventory,'cooked_rabbit');
 assert.equal(turnInQuest(p,'patrol_provisions','ranger').ok,true);assert.equal(p.gold,140);assert.equal(count(p.inventory,'cooked_rabbit'),0);assert.equal(turnInQuest(p,'patrol_provisions','ranger'),null);
});
test('two cooks are isolated; interruption, remote crafting and replay cannot grant meals',()=>{
 const a=player(),b=player();for(const p of [a,b]){tavern(p);addItem(p.inventory,'raw_rabbit');assert.equal(P.start(p,'cook_rabbit',1,1000).ok,true);}
 assert.equal(P.start(a,'cook_rabbit',1,1001).ok,false);a.path=[{x:500,y:500}];P.advance(a,2800);P.advance(b,2800);P.advance(b,2800);
 assert.equal(count(a.inventory,'raw_rabbit'),1);assert.equal(a.skills.cooking.xp,0);assert.equal(count(b.inventory,'cooked_rabbit'),1);assert.equal(b.skills.cooking.xp,35);
 a.path=[];a.x=2000;assert.equal(P.start(a,'cook_rabbit',1,5000).ok,false);
});
test('full backpack can convert one raw rabbit in place; missing input grants nothing',()=>{
 const p=player();tavern(p);addItem(p.inventory,'raw_rabbit');addItem(p.inventory,'bread',27);craft(p,'cook_rabbit',1,1000);assert.equal(p.inventory.length,28);
 assert.equal(P.start(p,'cook_rabbit',1,4000).ok,false);assert.equal(p.skills.cooking.xp,35);
});
