'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../game/economy'),{count}=require('../game/rules');
const p=()=>({gold:1000,inventory:[]});
test('player supplies can be resold once, without regenerating stock or profitable roundtrip',()=>{
 const seller=p(),buyer=p();seller.inventory=[{id:'cooked_rabbit',qty:1}];E.stock.tavern.cooked_rabbit=0;
 assert.equal(E.buy(buyer,'tavern','cooked_rabbit',1).ok,false);
 const before=seller.gold;assert.equal(E.sell(seller,'tavern','cooked_rabbit',1).ok,true);const earned=seller.gold-before;
 const cost=E.quote('tavern','cooked_rabbit',1,'buy');assert.ok(cost>earned);
 assert.equal(E.buy(buyer,'tavern','cooked_rabbit',1).ok,true);assert.equal(count(buyer.inventory,'cooked_rabbit'),1);
 assert.equal(E.buy(seller,'tavern','cooked_rabbit',1).ok,false);E.restock();assert.equal(E.getStock('tavern','cooked_rabbit'),0);
});
test('last-stock contention, full bags and insufficient gold never duplicate or consume stock',()=>{
 E.stock.market.cooked_rabbit=1;const a=p(),b=p();a.inventory=Array.from({length:28},()=>({id:'bread',qty:1}));
 assert.equal(E.buy(a,'market','cooked_rabbit',1).ok,false);assert.equal(E.getStock('market','cooked_rabbit'),1);
 a.inventory=[];a.gold=0;assert.equal(E.buy(a,'market','cooked_rabbit',1).ok,false);
 assert.equal(E.buy(b,'market','cooked_rabbit',1).ok,true);a.gold=1000;assert.equal(E.buy(a,'market','cooked_rabbit',1).ok,false);
 assert.equal(a.gold,1000);assert.equal(E.getStock('market','cooked_rabbit'),0);
});
test('snapshot quotes every sellable item exactly and owns its stock copy',()=>{
 const s=E.snapshot('forge');assert.equal(s.prices.cooked_rabbit.sell,E.quote('forge','cooked_rabbit',1,'sell'));
 const before=E.getStock('forge','bronze_dagger');s.stock.bronze_dagger=999;assert.equal(E.getStock('forge','bronze_dagger'),before);
 for(const side of ['oops',null])assert.equal(E.quote('forge','bread',1,side),null);
 for(const id of ['__proto__','constructor','missing'])assert.equal(E.quote('forge',id,1,'buy'),null);
});
