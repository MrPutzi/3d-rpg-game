'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Pool}=require('pg');
const {accountStore}=require('../game/accounts');
const url=process.env.TEST_DATABASE_URL;
test('PostgreSQL player-to-player trades lock both accounts and roll back atomically',{skip:!url},async t=>{
 const schema='player_trade_'+randomUUID().replaceAll('-','');
 const admin=new Pool({connectionString:url});let db,query;
 t.after(async()=>{if(db)await db.close();if(query)await query.end();await admin.query('DROP SCHEMA "'+schema+'" CASCADE');await admin.end();});
 await admin.query('CREATE SCHEMA "'+schema+'"');
 const isolated=new URL(url);isolated.searchParams.set('options','-c search_path='+schema);
 query=new Pool({connectionString:isolated.toString()});
 db=accountStore({databaseUrl:isolated.toString()});await db.init();
 const a=await db.register('PgTraderAlpha','StrongPassword_2026',{gold:100,inventory:[{id:'iron_ore',qty:1},{id:'iron_ore',qty:1}],equipment:{weapon:'bronze_scimitar'},combatStyle:'aggressive'});
 const b=await db.register('PgTraderBravo','StrongPassword_2026',{gold:100,inventory:[{id:'bread',qty:1},{id:'bread',qty:1}],equipment:{weapon:'bronze_scimitar'},combatStyle:'aggressive'});
 const offerA={gold:9,items:[{id:'iron_ore',qty:1}]},offerB={gold:5,items:[{id:'bread',qty:1}]};
 const first=await db.playerTrade(a.account.id,0,b.account.id,0,offerA,offerB);
 assert.equal(first.ok,true);assert.equal(first.tradeRevisionA,1);assert.equal(first.tradeRevisionB,1);
 let savedA=await db.resume(a.token),savedB=await db.resume(b.token);
 assert.equal(savedA.profile.gold,96);assert.equal(savedB.profile.gold,104);
 await assert.rejects(db.save(a.account.id,a.account.profile,0),/Stale/);
 const reversedA={gold:1,items:[{id:'bread',qty:1}]},reversedB={gold:1,items:[{id:'iron_ore',qty:1}]};
 const concurrent=await Promise.allSettled([
  db.playerTrade(a.account.id,1,b.account.id,1,reversedA,reversedB),
  db.playerTrade(b.account.id,1,a.account.id,1,reversedB,reversedA)
 ]);
 assert.equal(concurrent.filter(x=>x.status==='fulfilled'&&x.value.ok).length,1);
 assert.equal(concurrent.filter(x=>x.status==='rejected'&&/Stale/.test(x.reason.message)).length,1);
 savedA=await db.resume(a.token);savedB=await db.resume(b.token);
 const beforeA=savedA.profile,beforeB=savedB.profile,revA=savedA.tradeRevision,revB=savedB.tradeRevision;
 await query.query(`CREATE FUNCTION reject_trade_b() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${b.account.id}' THEN RAISE EXCEPTION 'injected second-account failure'; END IF; RETURN NEW; END $$`);
 await query.query('CREATE TRIGGER reject_trade_b BEFORE UPDATE ON game_accounts FOR EACH ROW EXECUTE FUNCTION reject_trade_b()');
 try{
  await assert.rejects(db.playerTrade(a.account.id,revA,b.account.id,revB,{gold:0,items:[]},{gold:0,items:[]}),/injected second-account failure/);
 }finally{await query.query('DROP TRIGGER reject_trade_b ON game_accounts');}
 savedA=await db.resume(a.token);savedB=await db.resume(b.token);
 assert.deepEqual(savedA.profile,beforeA);assert.deepEqual(savedB.profile,beforeB);
 assert.equal(savedA.tradeRevision,revA);assert.equal(savedB.tradeRevision,revB);
});
