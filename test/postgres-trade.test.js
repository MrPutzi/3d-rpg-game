'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Pool}=require('pg');
const {accountStore}=require('../game/accounts');
const url=process.env.TEST_DATABASE_URL;
test('PostgreSQL durable merchant transactions',{skip:!url},async t=>{
 const schema='trade_'+randomUUID().replaceAll('-','');
 const admin=new Pool({connectionString:url});
 let db,query;
 t.after(async()=>{
  if(db)await db.close();if(query)await query.end();
  // Disposable test schema only; production schemas are never touched.
  await admin.query('DROP SCHEMA "'+schema+'" CASCADE');await admin.end();
 });
 await admin.query('CREATE SCHEMA "'+schema+'"');
 const isolated=new URL(url);isolated.searchParams.set('options','-c search_path='+schema);
 query=new Pool({connectionString:isolated.toString()});
 db=accountStore({databaseUrl:isolated.toString()});await db.init();
 const seller=await db.register('Seller','test-password-only',{gold:100,inventory:[{id:'cooked_rabbit',qty:2}]});
 const buyers=await Promise.all(['BuyerOne','BuyerTwo'].map(name=>db.register(name,'test-password-only',{gold:100,inventory:[]})));
 const order=side=>({shopId:'tavern',itemId:'cooked_rabbit',qty:1,side});
 await t.test('two accounts compete for last item under row lock',async()=>{
  assert.equal((await db.trade(seller.account.id,0,order('sell'))).ok,true);
  const results=await Promise.all(buyers.map(b=>db.trade(b.account.id,0,order('buy'))));
  assert.equal(results.filter(r=>r.ok).length,1);
  const stock=(await query.query("SELECT stock FROM game_merchants WHERE id='tavern'")).rows[0].stock;
  assert.equal(stock.cooked_rabbit,0);
 });
 await t.test('old autosave and replay cannot overwrite completed trade',async()=>{
  await assert.rejects(db.save(seller.account.id,seller.account.profile,0),/Stale/);
  await assert.rejects(db.trade(seller.account.id,0,order('sell')),/Stale/);
  const saved=await db.resume(seller.token);
  assert.equal(saved.tradeRevision,1);assert.equal(saved.profile.inventory[0].qty,1);
  await db.save(saved.id,saved.profile,1);
 });
 await t.test('failure between account and stock writes rolls back both',async()=>{
  await query.query(`CREATE FUNCTION reject_stock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected stock failure'; END $$`);
  await query.query('CREATE TRIGGER reject_stock BEFORE UPDATE ON game_merchants FOR EACH ROW EXECUTE FUNCTION reject_stock()');
  const before=await db.resume(seller.token);
  try{await assert.rejects(db.trade(seller.account.id,1,order('sell')),/injected stock failure/);}
  finally{await query.query('DROP TRIGGER reject_stock ON game_merchants');}
  assert.deepEqual(await db.resume(seller.token),before);
  assert.equal((await query.query("SELECT stock FROM game_merchants WHERE id='tavern'")).rows[0].stock.cooked_rabbit,0);
 });
 await t.test('reopening preserves profiles, revisions and merchant stock',async()=>{
  await db.close();db=accountStore({databaseUrl:isolated.toString()});await db.init();
  const profiles=await Promise.all([seller,...buyers].map(a=>db.resume(a.token)));
  assert.equal(profiles.reduce((n,a)=>n+a.profile.inventory.reduce((n,i)=>n+i.qty,0),0),2);
  assert.equal(profiles[0].tradeRevision,1);
  assert.equal((await query.query("SELECT stock FROM game_merchants WHERE id='tavern'")).rows[0].stock.cooked_rabbit,0);
 });
 await t.test('restock and purchases serialize; persisted deadline prevents duplicate replenishment',async()=>{
  const a=await db.register('StockBuyer','test-password-only',{gold:1000,inventory:[]});
  await db.trade(a.account.id,0,{shopId:'tavern',itemId:'bread',qty:5,side:'buy'});
  assert.equal((await db.restockMerchants(0)).restocked,false);
  const results=await Promise.all([
   db.restockMerchants(60000),db.restockMerchants(60000),
   db.trade(a.account.id,1,{shopId:'tavern',itemId:'bread',qty:1,side:'buy'})
  ]);
  assert.equal(results.slice(0,2).filter(r=>r.restocked).length,1);
  assert.equal(results[2].ok,true);
  assert.equal((await db.merchantStock()).tavern.bread,15);
  assert.equal((await db.merchantStock()).tavern.cooked_rabbit,0);
  await db.close();db=accountStore({databaseUrl:isolated.toString()});await db.init();
  assert.equal((await db.restockMerchants(60000)).restocked,false);
  assert.equal((await db.merchantStock()).tavern.bread,15);
 });

});
