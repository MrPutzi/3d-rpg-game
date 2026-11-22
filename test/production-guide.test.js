'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {recipeTarget}=require('../game/quest-targets'),P=require('../game/production');
const {SKILLS}=require('../game/progression'),{skill,addItem}=require('../game/rules');
function player(){return {x:490,y:330,openBuilding:'forge',gold:0,inventory:[],bank:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),path:[]};}
test('production guide follows nested steel ingredients and updates after inventory changes',()=>{
 const p=player(),before=JSON.stringify(p);
 assert.match(P.options(p).smith_steel_dagger.target.label,/Iron ore/);assert.equal(JSON.stringify(p),before);
 addItem(p.inventory,'iron_ore');assert.match(P.options(p).smith_steel_dagger.target.label,/Coal Rock/);
 addItem(p.inventory,'coal');assert.match(recipeTarget(p,'smith_steel_dagger').label,/Coal Rock/);
 addItem(p.inventory,'coal');assert.match(recipeTarget(p,'smith_steel_dagger').label,/Smelt steel bar/);
 p.inventory=[{id:'steel_bar',qty:1}];assert.match(recipeTarget(p,'smith_steel_dagger').label,/Smith steel dagger/);
 // Guidance is informational: it cannot bypass level requirements.
 assert.equal(P.start(p,'smith_steel_dagger',1,0).ok,false);
});
test('bank guidance is private to each player and survives partial quantities without mutating state',()=>{
 const a=player(),b=player();a.inventory=[{id:'iron_ore',qty:1}];b.inventory=[{id:'iron_ore',qty:1}];a.bank=[{id:'coal',qty:1}];
 const before=JSON.stringify([a,b]);const ga=P.options(a),gb=P.options(b);
 assert.match(ga.smelt_steel.target.label,/Withdraw Coal/);assert.match(gb.smelt_steel.target.label,/Coal Rock/);
 assert.equal(JSON.stringify([a,b]),before);assert.ok(!Object.hasOwn(ga.smelt_steel.target,'bank'));
 a.bank=[];a.inventory.push({id:'coal',qty:1});assert.match(P.options(a).smelt_steel.target.label,/Coal Rock/);
});
test('missing merchant-only ingredients point to a real shop without promising stock or price',()=>{
 const p=player();addItem(p.inventory,'guam_leaf');
 const t=recipeTarget(p,'brew_tonic');assert.equal(t.x,250);assert.equal(t.y,330);
 assert.match(t.label,/Golden Tankard.*Vial of water.*price and stock shown in shop/);
 p.bank=[{id:'vial_of_water',qty:1}];assert.match(recipeTarget(p,'brew_tonic').label,/Withdraw/);
 for(const id of ['constructor','__proto__','unknown',null])assert.equal(recipeTarget(p,id),null);
});
test('client tracking selects only the active recipe or quest target and tolerates missing profile',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../public/client.js'),'utf8');
 const context=vm.createContext({trackedRecipe:'smelt_steel',trackedQuest:'watch_steel',profile:{productionOptions:{smelt_steel:{target:{label:'Coal'}}},questJournal:{watch_steel:{target:{label:'Guard'}}}}});
 vm.runInContext(source.match(/function trackedTarget\(\)\{[^\n]+\}/)[0],context);
 assert.equal(vm.runInContext('trackedTarget().label',context),'Coal');
 context.trackedRecipe=null;assert.equal(vm.runInContext('trackedTarget().label',context),'Guard');
 context.profile=null;assert.equal(vm.runInContext('trackedTarget()',context),undefined);
});
