'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../game/thieving'),{skill}=require('../game/rules'),{RECIPES}=require('../game/progression');
function player(){return {loggedIn:true,hp:20,x:635,y:385,gold:0,skills:{thieving:skill()}};}
test('targeted success awards once per deadline and does not affect another player',()=>{
 const a=player(),b=player();assert.ok(T.attempt(a,'guard',1000,()=>0).success);assert.equal(a.gold,4);assert.equal(a.skills.thieving.xp,25);
 assert.equal(T.attempt(a,'guard',3999,()=>0).ok,false);assert.ok(T.attempt(b,'guard',1000,()=>0).success);assert.ok(T.attempt(a,'guard',4000,()=>0).success);assert.equal(a.gold,8);assert.equal(b.gold,4);assert.equal(RECIPES.pickpocket,undefined);
});
test('caught attempts give no gold or XP and enforce longer delay without killing',()=>{
 const p=player();p.hp=1;const r=T.attempt(p,'guard',1000,()=>.99);assert.equal(r.success,false);assert.equal(p.hp,1);assert.equal(p.gold,0);assert.equal(p.skills.thieving.xp,0);assert.equal(p.nextThieve,6000);assert.equal(T.attempt(p,'guard',5999,()=>0).ok,false);
});
test('invalid targets, range, death and busy actions cannot mint rewards or start cooldown',()=>{
 for(const override of [{x:0},{hp:0},{loggedIn:false},{path:[{}]},{intent:{}},{production:{}},{agility:{}}]){const p={...player(),...override};assert.equal(T.attempt(p,'guard',1000,()=>0).ok,false);assert.equal(p.gold,0);assert.equal(p.nextThieve,undefined);}
 for(const id of ['elder','__proto__',null,{}])assert.equal(T.attempt(player(),id,1000,()=>0).ok,false);
});
test('restored cooldown and level-dependent success use server rules',()=>{
 const p=player();T.attempt(p,'guard',1000,()=>.99);p.nextThieve=T.restore(JSON.parse(JSON.stringify(p.nextThieve)),2000);assert.equal(T.attempt(p,'guard',5999,()=>0).ok,false);assert.ok(T.attempt(p,'guard',6000,()=>0).success);
 assert.equal(T.restore(undefined,1000),0);assert.equal(T.restore(Infinity,1000),0);assert.equal(T.restore(1e20,1000),6000);
 assert.equal(T.attempt(player(),'guard',1000,()=>.7).success,false);const expert=player();expert.skills.thieving.level=99;assert.ok(T.attempt(expert,'guard',1000,()=>.7).success);assert.equal(T.attempt({...player(),skills:expert.skills},'guard',1000,()=>.95).success,false);
});

test('quartermaster is a separate level-gated target and advances Quiet Hands only on success',()=>{
 const p={...player(),x:2840,y:1325};p.skills.thieving.level=3;
 p.quests={quiet_hands:{status:'active',progress:0,goal:3}};
 const result=T.attempt(p,'quartermaster',1000,()=>0);
 assert.equal(result.success,true);assert.equal(p.gold,9);assert.equal(p.skills.thieving.xp,45);
 assert.equal(p.quests.quiet_hands.progress,1);
 assert.equal(T.attempt(p,'guard',1000,()=>0).ok,false);
 const novice={...player(),x:2840,y:1325};
 assert.equal(T.attempt(novice,'quartermaster',1000,()=>0).ok,false);
 assert.equal(novice.gold,0);
});
