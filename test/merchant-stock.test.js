'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {planRestock}=require('../game/merchant-stock');
const {createEconomy}=require('../game/economy');
const {accountStore}=require('../game/accounts');
test('restock has no offline catch-up and never manufactures player-supplied items',()=>{
 const stock=createEconomy().stock;stock.tavern.bread=3;stock.tavern.cooked_rabbit=2;
 const before=structuredClone(stock);
 const result=planRestock(stock,60000,600000);
 assert.equal(result.stock.tavern.bread,4);
 assert.equal(result.stock.tavern.cooked_rabbit,2);
 assert.equal(result.nextRestockAt,660000);
 assert.deepEqual(stock,before);
 assert.equal(planRestock(result.stock,result.nextRestockAt,600000).restocked,false);
 assert.throws(()=>planRestock(stock,60000,NaN),/Invalid/);
});
test('new catalog entries missing from old stock become finite quantities',()=>{
 const stock=createEconomy().stock;delete stock.tavern.bread;
 const result=planRestock(stock,0,60000);
 assert.equal(result.stock.tavern.bread,1);
});
test('durable restock serializes with purchases and survives reopen',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'merchant-stock-'));
 let db=accountStore({filename:path.join(dir,'players.json'),databaseUrl:''});
 t.after(async()=>{await db.close();await fs.rm(dir,{recursive:true,force:true});});
 await db.init();
 const a=await db.register('Buyer','test-password-only',{gold:1000,inventory:[]});
 await db.trade(a.account.id,0,{shopId:'tavern',itemId:'bread',qty:5,side:'buy'});
 assert.equal((await db.restockMerchants(0)).restocked,false);
 const [first,second,trade]=await Promise.all([
  db.restockMerchants(60000),db.restockMerchants(60000),
  db.trade(a.account.id,1,{shopId:'tavern',itemId:'bread',qty:1,side:'buy'})
 ]);
 assert.equal([first,second].filter(r=>r.restocked).length,1);
 assert.equal(trade.ok,true);
 assert.equal((await db.merchantStock()).tavern.bread,15);
 const copy=await db.merchantStock();copy.tavern.bread=999;
 assert.equal((await db.merchantStock()).tavern.bread,15);
 await db.close();db=accountStore({filename:path.join(dir,'players.json'),databaseUrl:''});await db.init();
 assert.equal((await db.restockMerchants(60000)).restocked,false);
 assert.equal((await db.merchantStock()).tavern.bread,15);
 assert.equal((await db.restockMerchants(600000)).stock.tavern.bread,16);
});
