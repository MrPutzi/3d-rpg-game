'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Timers=require('../game/action-timers'),Magic=require('../game/magic');
const {SKILLS}=require('../game/progression'),{skill}=require('../game/rules');
test('restored spell cooldown blocks repeat cast until exact deadline without consuming runes',()=>{
 const a={loggedIn:true,hp:20,x:0,y:0,inventory:[{id:'air_rune',qty:3},{id:'mind_rune',qty:3}],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()]))};
 const enemy={x:10,y:0,hp:100};
 assert.equal(Magic.cast(a,enemy,1000,()=>.5).ok,true);
 const restored={...a,...Timers.restore(JSON.parse(JSON.stringify(Timers.snapshot(a))),1100)};
 const before=JSON.stringify(restored.inventory);
 assert.equal(Magic.cast(restored,enemy,3399,()=>.5).ok,false);assert.equal(JSON.stringify(restored.inventory),before);
 assert.equal(Magic.cast(restored,enemy,3400,()=>.5).ok,true);
});
test('all action deadlines survive snapshots and stay isolated between players',()=>{
 const a={nextAttack:5000,nextGather:2700,nextSkillAction:2600},b={nextAttack:0};
 assert.deepEqual(Timers.restore(Timers.snapshot(a),1000),a);
 assert.equal(Timers.restore(Timers.snapshot(b),1000).nextAttack,0);
 const saved=Timers.snapshot(a);saved.nextAttack=0;assert.equal(a.nextAttack,5000);
});
test('old profiles retain eating delays and malformed future timers are bounded',()=>{
 assert.equal(Timers.restore({nextEat:2500},1000).nextAttack,2500);
 assert.deepEqual(Timers.restore({},1000),{nextAttack:0,nextGather:0,nextSkillAction:0});
 assert.deepEqual(Timers.restore({nextAttack:Infinity,nextGather:-1,nextSkillAction:'9999'},1000),{nextAttack:0,nextGather:0,nextSkillAction:0});
 assert.deepEqual(Timers.restore({nextAttack:1e20,nextGather:1e20,nextSkillAction:1e20},1000),{nextAttack:5200,nextGather:2800,nextSkillAction:2800});
});
test('UI readiness distinguishes cooldown, ready and disconnected; recipes use input identity',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({recipes:require('../game/progression').RECIPES});
 for(const name of ['attackReadiness','ingredientRecipes'])vm.runInContext(source.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))[0],ctx);
 assert.match(vm.runInContext('attackReadiness({nextAttack:2400},true,1000)',ctx),/1.4s/);
 assert.match(vm.runInContext('attackReadiness({nextAttack:2400},true,2400)',ctx),/Attack ready/);
 assert.match(vm.runInContext('attackReadiness({nextAttack:0},false,2400)',ctx),/unavailable/);
 const ids=Array.from(vm.runInContext("ingredientRecipes('steel_bar')",ctx));
 assert.ok(ids.includes('smith_steel_dagger'));assert.ok(!ids.includes('smelt_steel'));
 assert.equal(vm.runInContext("ingredientRecipes('__proto__').length",ctx),0);
});
