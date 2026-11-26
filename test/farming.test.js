'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const F=require('../game/farming'),{skill}=require('../game/rules'),{recipeTarget}=require('../game/quest-targets');
const player=()=>({loggedIn:true,hp:20,x:1010,y:890,inventory:[{id:'guam_seed',qty:2}],skills:{farming:skill()},farmPatch:null});
test('personal crops consume one seed, grow offline and harvest once',()=>{
 const a=player(),b=player();assert.ok(F.plant(a,1000).ok);assert.equal(a.inventory[0].qty,1);assert.equal(F.plant(a,2000).ok,false);
 assert.equal(F.harvest(a,60999).ok,false);assert.equal(F.harvest(b,61000).ok,false);
 a.farmPatch=F.restore(JSON.parse(JSON.stringify(a.farmPatch)));assert.ok(F.harvest(a,61000).ok);assert.equal(a.skills.farming.xp,55);
 assert.equal(F.harvest(a,61000).ok,false);assert.equal(a.skills.farming.xp,55);assert.ok(F.plant(b,61000).ok);
});
test('crop survives full bag and invalid remote, dead or busy actions',()=>{
 const p=player();F.plant(p,1000);p.inventory=Array.from({length:28},()=>({id:'bronze_dagger',qty:1}));assert.equal(F.harvest(p,61000).ok,false);assert.ok(p.farmPatch);
 p.inventory=[];for(const override of [{x:0},{hp:0},{loggedIn:false},{intent:{}},{path:[{}]},{production:{}},{agility:{}}]){const q={...p,...override};assert.equal(F.harvest(q,61000).ok,false);assert.equal(F.plant({...q,farmPatch:null},61000).ok,false);}
 assert.ok(F.harvest(p,61000).ok);assert.equal(p.inventory.reduce((n,e)=>n+e.qty,0),2);
});
test('restore rejects invalid patches and herbal guidance points to growing crops',()=>{
 for(const v of [null,{}, {kind:'other',readyAt:1},{kind:'guam',readyAt:-1},{kind:'guam',readyAt:Infinity}])assert.equal(F.restore(v),null);
 const p=player();assert.equal(recipeTarget(p,'brew_tonic').x,1010);F.plant(p,1000);p.inventory=[];assert.equal(recipeTarget(p,'brew_tonic').x,1010);
});

test('marentill requires Farming 5, grows independently and preserves the crop when inventory is full',()=>{
 const p=player();p.inventory=[{id:'marentill_seed',qty:1}];
 assert.equal(F.plant(p,'marentill',1000).ok,false);
 p.skills.farming.level=5;
 assert.ok(F.plant(p,'marentill',1000).ok);assert.equal(p.farmPatch.readyAt,91000);
 assert.equal(F.harvest(p,90999).ok,false);
 p.inventory=Array.from({length:28},()=>({id:'bronze_dagger',qty:1}));
 assert.equal(F.harvest(p,91000).ok,false);assert.equal(p.farmPatch.kind,'marentill');
 p.inventory=[];assert.ok(F.harvest(p,91000).ok);
 assert.equal(p.skills.farming.xp,75);assert.equal(p.inventory[0].id,'marentill_leaf');assert.equal(p.inventory[0].qty,2);
 assert.equal(F.restore({kind:'marentill',readyAt:91000}).kind,'marentill');
});
