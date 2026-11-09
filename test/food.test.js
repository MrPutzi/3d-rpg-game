'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {eat,EAT_DELAY}=require('../game/food');
const p=()=>({loggedIn:true,hp:1,maxHp:20,inventory:[{id:'bread',qty:5}],nextAttack:0});
test('food spam consumes one item per interval and reports actual healing',()=>{
 const a=p();assert.equal(eat(a,'bread',100).healed,7);
 for(let i=0;i<100;i++)assert.equal(eat(a,'bread',101).ok,false);
 assert.equal(a.inventory[0].qty,4);assert.equal(a.hp,8);
 assert.equal(eat(a,'bread',100+EAT_DELAY).ok,true);
 a.hp=19;assert.equal(eat(a,'bread',100+2*EAT_DELAY).healed,1);assert.equal(a.hp,20);
});
test('invalid, missing, full-health and dead consumption cannot spend food or change timers',()=>{
 for(const mutate of [a=>a.hp=20,a=>a.hp=0,a=>a.loggedIn=false,a=>a.inventory=[]]){
  const a=p();mutate(a);const before=JSON.stringify(a);assert.equal(eat(a,'bread',100).ok,false);assert.equal(JSON.stringify(a),before);
 }
 for(const id of ['__proto__','bronze_scimitar',null,{},'unknown'])assert.equal(eat(p(),id,100).ok,false);
});
test('eating delays melee and spell timer without shortening longer cooldowns',()=>{
 const a=p();eat(a,'bread',100);assert.equal(a.nextAttack,1900);
 const b=p();b.nextAttack=4000;eat(b,'bread',100);assert.equal(b.nextAttack,4000);
});
test('players have independent food cooldowns and inventories',()=>{
 const a=p(),b=p();eat(a,'bread',100);assert.equal(eat(b,'bread',101).ok,true);
 assert.equal(a.nextEat,1900);assert.equal(b.nextEat,1901);
});

test('saved food deadline survives reconnect and malformed future values are bounded',()=>{
 const {restoreDeadline}=require('../game/food');assert.equal(restoreDeadline(1900,1000),1900);assert.equal(restoreDeadline(Infinity,1000),0);assert.equal(restoreDeadline(999999,1000),2800);
});
