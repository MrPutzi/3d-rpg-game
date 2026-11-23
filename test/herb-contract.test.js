'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const F=require('../game/farming'),{QUESTS,SKILLS}=require('../game/progression');
const {skill,count,addItem}=require('../game/rules'),{turnInQuest,activateAvailable}=require('../game/activities'),{targetFor,recipeTarget}=require('../game/quest-targets');
function player(){return {loggedIn:true,hp:20,x:1010,y:890,inventory:[{id:'guam_seed',qty:2}],bank:[],gold:0,skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};}
function unlock(p){p.quests.herbal_supplies.status='complete';activateAvailable(p,'herbal_supplies');}
function crop(p,now){assert.ok(F.plant(p,now).ok);assert.ok(F.harvest(p,now+60000).ok);}
test('Thorin harvest contract needs personal crops and consumes four leaves once',()=>{
 const p=player();crop(p,1000);assert.equal(p.quests.westwood_harvest.progress,0);unlock(p);addItem(p.inventory,'guam_leaf',4);
 assert.equal(turnInQuest(p,'westwood_harvest','forester'),null);addItem(p.inventory,'guam_seed');crop(p,70000);crop(p,140000);
 assert.equal(p.quests.westwood_harvest.progress,2);assert.equal(turnInQuest(p,'westwood_harvest','guard'),null);
 const before=count(p.inventory,'guam_leaf');assert.ok(turnInQuest(p,'westwood_harvest','forester').ok);assert.equal(count(p.inventory,'guam_leaf'),before-4);assert.equal(p.gold,20);assert.equal(count(p.inventory,'guam_seed'),1);
 assert.equal(turnInQuest(p,'westwood_harvest','forester'),null);assert.equal(p.gold,20);
});
test('duplicate or blocked harvest cannot advance either player contract',()=>{
 const a=player(),b=player();unlock(a);unlock(b);F.plant(a,1000);assert.equal(F.harvest(a,2000).ok,false);assert.equal(a.quests.westwood_harvest.progress,0);
 a.inventory=Array.from({length:28},()=>({id:'bronze_dagger',qty:1}));assert.equal(F.harvest(a,61000).ok,false);assert.equal(a.quests.westwood_harvest.progress,0);
 a.inventory=[];F.harvest(a,61000);F.harvest(a,61000);assert.equal(a.quests.westwood_harvest.progress,1);assert.equal(b.quests.westwood_harvest.progress,0);
});
test('harvest guidance routes seeds from bank or rats and completed deliveries back to Thorin',()=>{
 const p=player();unlock(p);assert.equal(targetFor(p,'westwood_harvest').x,1010);p.inventory=[];p.bank=[{id:'guam_seed',qty:1}];assert.match(targetFor(p,'westwood_harvest').label,/Withdraw/);assert.match(recipeTarget(p,'brew_tonic').label,/Withdraw/);
 p.bank=[];assert.match(targetFor(p,'westwood_harvest').label,/guam seeds/);p.farmPatch={kind:'guam',readyAt:1};assert.equal(targetFor(p,'westwood_harvest').x,1010);
 p.quests.westwood_harvest.progress=2;p.bank=[{id:'guam_leaf',qty:4}];assert.match(targetFor(p,'westwood_harvest').label,/Withdraw/);
 addItem(p.inventory,'guam_leaf',4);assert.equal(targetFor(p,'westwood_harvest').kind,'npc');
});
test('world herb label follows server time without exposing another player state',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const s=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');const ctx=vm.createContext({});vm.runInContext(s.match(/function herbPatchView\(patch,now\)\{[\s\S]*?\n\}/)[0],ctx);
 assert.match(vm.runInContext('herbPatchView(null,0).text',ctx),/empty/);assert.match(vm.runInContext("herbPatchView({readyAt:61000},1000).text",ctx),/60s/);assert.match(vm.runInContext("herbPatchView({readyAt:61000},61000).text",ctx),/ready/);
});
