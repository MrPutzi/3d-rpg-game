'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {transfer}=require('../game/bank');
const p=()=>({loggedIn:true,inventory:[{id:'bones',qty:1},{id:'bones',qty:1},{id:'feathers',qty:100}],bank:[]});
test('all moves every matching item and repeated requests cannot duplicate it',()=>{
 const a=p();assert.equal(transfer(a,'deposit','bones','all').ok,true);assert.equal(a.bank.length,2);assert.equal(transfer(a,'deposit','bones','all').ok,false);
 assert.equal(transfer(a,'withdraw','bones','all').ok,true);assert.equal(a.inventory.length,3);assert.equal(a.bank.length,0);
});
test('full destinations leave both inventories byte-for-byte unchanged',()=>{
 const a=p();a.bank=Array.from({length:200},()=>({id:'bones',qty:1}));let before=JSON.stringify(a);
 assert.equal(transfer(a,'deposit','bones','all').ok,false);assert.equal(JSON.stringify(a),before);
 a.inventory=Array.from({length:28},()=>({id:'bones',qty:1}));before=JSON.stringify(a);
 assert.equal(transfer(a,'withdraw','bones',1).ok,false);assert.equal(JSON.stringify(a),before);
});
test('existing stacks accept all in full bags; invalid quantities and keys never mutate',()=>{
 const a=p();a.bank=[{id:'feathers',qty:900}];assert.equal(transfer(a,'withdraw','feathers','all').ok,true);assert.equal(a.inventory[2].qty,1000);
 for(const qty of [0,-1,1.5,NaN,Infinity,'5',{},null]){const before=JSON.stringify(a);assert.equal(transfer(a,'deposit','feathers',qty).ok,false);assert.equal(JSON.stringify(a),before);}
 assert.equal(transfer(a,'deposit','__proto__',1).ok,false);
});
test('two players have isolated banks and overflow never removes source stacks',()=>{
 const a=p(),b=p();transfer(a,'deposit','feathers','all');assert.equal(b.bank.length,0);assert.equal(b.inventory[2].qty,100);
 a.inventory=[{id:'feathers',qty:999999}];const before=JSON.stringify(a);assert.equal(transfer(a,'withdraw','feathers','all').ok,false);assert.equal(JSON.stringify(a),before);
});
