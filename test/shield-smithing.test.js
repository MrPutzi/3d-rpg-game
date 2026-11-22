'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../game/production'),{SKILLS,QUESTS}=require('../game/progression');
const {skill,addItem,count,equip}=require('../game/rules');
const {turnInQuest}=require('../game/activities');
function player(){return {x:490,y:330,openBuilding:'forge',gold:0,inventory:[],equipment:{},skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[],intent:null,quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function craft(p,id,t){assert.equal(P.start(p,id,1,t).ok,true);assert.equal(P.advance(p,t+1800).ok,true);}
test('shield tiers require Smithing, consume bars and yield equipment with separate Defence requirements',()=>{
 const p=player();addItem(p.inventory,'bronze_bar',2);addItem(p.inventory,'iron_bar',2);
 assert.equal(P.start(p,'smith_bronze_shield',1,0).ok,false);
 p.skills.smithing.level=5;craft(p,'smith_bronze_shield',0);
 assert.equal(count(p.inventory,'bronze_bar'),0);assert.equal(equip(p,'bronze_shield').ok,true);
 assert.equal(P.start(p,'smith_iron_shield',1,2000).ok,false);
 p.skills.smithing.level=20;craft(p,'smith_iron_shield',2000);
 assert.equal(count(p.inventory,'iron_bar'),0);assert.equal(p.skills.smithing.xp,170);
 assert.equal(p.skills.defence.level,1);assert.equal(equip(p,'iron_shield').ok,true);assert.equal(p.equipment.offhand,'iron_shield');
});
test('watch shields require personal production and consume equipped delivery without duplicate rewards',()=>{
 const p=player();p.quests.watch_arrows.status='active';p.quests.watch_arrows.progress=2;addItem(p.inventory,'iron_arrow',30);
 assert.equal(turnInQuest(p,'watch_arrows','guard').ok,true);assert.equal(p.quests.watch_shields.status,'active');
 addItem(p.inventory,'iron_shield',2);assert.equal(turnInQuest(p,'watch_shields','guard'),null);
 p.inventory=[];addItem(p.inventory,'iron_bar',4);p.skills.smithing.level=20;
 craft(p,'smith_iron_shield',0);p.skills.smithing.level=20;craft(p,'smith_iron_shield',2000);
 assert.equal(turnInQuest(p,'watch_shields','elder'),null);p.equipment.offhand='iron_shield';
 assert.equal(turnInQuest(p,'watch_shields','guard').ok,true);assert.equal(p.equipment.offhand,null);assert.equal(p.gold,85);
 assert.equal(turnInQuest(p,'watch_shields','guard'),null);assert.equal(count(p.inventory,'iron_shield'),0);
});
test('simultaneous smiths cannot share progress or duplicate outputs; movement preserves bars',()=>{
 const a=player(),b=player();for(const p of [a,b]){p.skills.smithing.level=5;addItem(p.inventory,'bronze_bar',2);P.start(p,'smith_bronze_shield',1,0);}
 a.path=[{x:550,y:330}];P.advance(a,1800);P.advance(b,1800);P.advance(b,1800);
 assert.equal(count(a.inventory,'bronze_bar'),2);assert.equal(a.skills.smithing.xp,0);assert.equal(count(b.inventory,'bronze_shield'),1);
});
test('recipe search matches names, skills and inputs without altering server availability',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const src=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({named:id=>({iron_bar:'Iron bar',iron_shield:'Iron Shield'}[id]||id)});
 vm.runInContext(src.match(/function recipeMatches\(recipe,query\)\{[\s\S]*?\n\}/)[0],ctx);
 ctx.recipe={name:'Smith iron shield',skill:'smithing',station:'forge',inputs:{iron_bar:2},outputs:{iron_shield:1}};
 for(const q of [' IRON ','smithing bar','forge shield','']){ctx.q=q;assert.equal(vm.runInContext('recipeMatches(recipe,q)',ctx),true);}
 ctx.q='cooking';assert.equal(vm.runInContext('recipeMatches(recipe,q)',ctx),false);
});
