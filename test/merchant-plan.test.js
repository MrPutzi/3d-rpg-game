'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {planTrade}=require('../game/merchant-plan');
const {createEconomy}=require('../game/economy');
const req={shopId:'tavern',itemId:'cooked_rabbit',qty:1,side:'buy'};
const profile=()=>({gold:100,inventory:[],quests:{welcome:{status:'complete'}}});
test('planning a trade never changes caller profile, stock or global economy',()=>{
 const p=profile(),stock={cooked_rabbit:1};const before=JSON.stringify({p,stock});
 const result=planTrade(p,stock,req);assert.equal(result.ok,true);assert.equal(JSON.stringify({p,stock}),before);
 assert.equal(result.stock.cooked_rabbit,0);assert.equal(result.profile.inventory[0].id,'cooked_rabbit');assert.ok(result.profile.gold<100);
 result.profile.quests.welcome.status='locked';assert.equal(p.quests.welcome.status,'complete');
});
test('failed plans return no commit payload and leave input untouched',()=>{
 for(const p of [{...profile(),gold:0},{...profile(),inventory:Array.from({length:28},()=>({id:'bread',qty:1}))}]){
  const before=JSON.stringify(p),r=planTrade(p,{cooked_rabbit:1},req);assert.equal(r.ok,false);assert.equal(r.profile,undefined);assert.equal(JSON.stringify(p),before);
 }
 assert.equal(planTrade(profile(),{cooked_rabbit:0},req).ok,false);
});
test('sequential plans conserve sold item and reject stale last-stock purchase when revalidated',()=>{
 const seller={...profile(),inventory:[{id:'cooked_rabbit',qty:1}]};
 const sale=planTrade(seller,{}, {...req,side:'sell'});assert.equal(sale.ok,true);assert.equal(sale.profile.inventory.length,0);
 const purchase=planTrade(profile(),sale.stock,req);assert.equal(purchase.ok,true);assert.equal(purchase.stock.cooked_rabbit,0);
 assert.equal(planTrade(profile(),purchase.stock,req).ok,false);
});
test('invalid quantities, inherited identifiers and unsafe totals fail closed',()=>{
 for(const qty of [0,2,NaN,'1',-1])assert.equal(planTrade(profile(),{cooked_rabbit:1},{...req,qty}).ok,false);
 for(const itemId of ['__proto__','constructor'])assert.equal(planTrade(profile(),{}, {...req,itemId}).ok,false);
 assert.equal(planTrade(profile(),{cooked_rabbit:-1},req).ok,false);
 const p={...profile(),gold:Number.MAX_SAFE_INTEGER,inventory:[{id:'cooked_rabbit',qty:1}]};
 assert.equal(planTrade(p,{}, {...req,side:'sell'}).ok,false);
 assert.equal(planTrade(p,{cooked_rabbit:Number.MAX_SAFE_INTEGER},{...req,side:'sell'}).ok,false);
});
test('independent economy instances cannot leak stock changes',()=>{
 const initial={tavern:{cooked_rabbit:1}},a=createEconomy(initial),b=createEconomy(initial);
 a.buy(profile(),'tavern','cooked_rabbit',1);assert.equal(b.getStock('tavern','cooked_rabbit'),1);assert.equal(initial.tavern.cooked_rabbit,1);
});
