'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {planPlayerTrade,validateOffer}=require('../game/player-trade');
const {accountStore}=require('../game/accounts');
const profile=(gold,inventory,equipment={})=>({gold,inventory:structuredClone(inventory),equipment:{...equipment},combatStyle:'aggressive'});
test('player trade transfers both offers and reconciles equipment atomically',()=>{
 const a=profile(100,[{id:'iron_ore',qty:1},{id:'iron_ore',qty:1}],{weapon:'bronze_scimitar'});
 const b=profile(100,[{id:'bread',qty:1},{id:'bread',qty:1}],{weapon:'bronze_scimitar'});
 const result=planPlayerTrade(a,b,{gold:9,items:[{id:'iron_ore',qty:1}]},{gold:5,items:[{id:'bread',qty:1}]});
 assert.equal(result.ok,true);
 assert.equal(result.profileA.gold,96);assert.equal(result.profileB.gold,104);
 assert.deepEqual(result.profileA.inventory,[{id:'iron_ore',qty:1},{id:'bread',qty:1}]);
 assert.deepEqual(result.profileB.inventory,[{id:'bread',qty:1},{id:'iron_ore',qty:1}]);
 assert.equal(a.gold,100);assert.equal(a.inventory[0].qty,2,'input profiles are not mutated');
});
test('offers reject insufficient items, gold, duplicate types and malformed quantities',()=>{
 const p=profile(10,[{id:'iron_ore',qty:1}]);
 assert.equal(validateOffer(p,{gold:11,items:[]}).ok,false);
 assert.equal(validateOffer(p,{gold:0,items:[{id:'iron_ore',qty:2}]}).ok,false);
 assert.equal(validateOffer(p,{gold:0,items:[{id:'iron_ore',qty:1},{id:'iron_ore',qty:1}]}).ok,false);
 assert.equal(validateOffer(p,{gold:0,items:[{id:'__proto__',qty:1}]}).ok,false);
 assert.equal(validateOffer(p,{gold:0,items:[{id:'iron_ore',qty:0}]}).ok,false);
});
test('trade rejects a full recipient bag without changing either side',()=>{
 const a=profile(10,[{id:'iron_ore',qty:1}]);
 const b=profile(0,Array.from({length:28},()=>({id:'bread',qty:1})));
 const result=planPlayerTrade(a,b,{gold:0,items:[{id:'iron_ore',qty:1}]},{gold:0,items:[]});
 assert.equal(result.ok,false);assert.match(result.message,/room/);
 assert.equal(a.inventory.length,1);assert.equal(b.inventory.length,28);
});
test('removing an equipped item clears its slot on the receiving character profile',()=>{
 const a=profile(0,[{id:'bronze_scimitar',qty:1}],{weapon:'bronze_scimitar'});
 const b=profile(0,[{id:'bread',qty:1}],{weapon:'bronze_scimitar'});
 const result=planPlayerTrade(a,b,{gold:0,items:[{id:'bronze_scimitar',qty:1}]},{gold:0,items:[]});
 assert.equal(result.ok,true);assert.equal(result.profileA.equipment.weapon,null);assert.equal(result.profileA.combatStyle,'accurate');
 assert.equal(result.profileB.inventory.some(x=>x.id==='bronze_scimitar'),true);
});
test('local account trade persists both characters and rejects stale checkpoints',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'player-trade-local-')),filename=path.join(dir,'players.json');
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const db=accountStore({filename,databaseUrl:''});await db.init();t.after(()=>db.close());
 const a=await db.register('TradeAlpha','StrongPassword_2026',profile(100,[{id:'iron_ore',qty:1},{id:'iron_ore',qty:1}]));
 const b=await db.register('TradeBravo','StrongPassword_2026',profile(100,[{id:'bread',qty:1},{id:'bread',qty:1}]));
 const result=await db.playerTrade(a.account.id,0,b.account.id,0,{gold:9,items:[{id:'iron_ore',qty:1}]},{gold:5,items:[{id:'bread',qty:1}]});
 assert.equal(result.ok,true);assert.equal(result.tradeRevisionA,1);assert.equal(result.tradeRevisionB,1);
 const savedA=await db.resume(a.token),savedB=await db.resume(b.token);
 assert.equal(savedA.profile.gold,96);assert.equal(savedB.profile.gold,104);
 await assert.rejects(db.save(a.account.id,a.account.profile,0),/Stale/);
});
test('concurrent replay with the same revisions can commit only once',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'player-trade-race-')),filename=path.join(dir,'players.json');
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const db=accountStore({filename,databaseUrl:''});await db.init();t.after(()=>db.close());
 const a=await db.register('RaceAlpha','StrongPassword_2026',profile(100,[{id:'iron_ore',qty:2}]));
 const b=await db.register('RaceBravo','StrongPassword_2026',profile(100,[{id:'bread',qty:2}]));
 const offerA={gold:1,items:[{id:'iron_ore',qty:1}]},offerB={gold:1,items:[{id:'bread',qty:1}]};
 const results=await Promise.allSettled([
  db.playerTrade(a.account.id,0,b.account.id,0,offerA,offerB),
  db.playerTrade(b.account.id,0,a.account.id,0,offerB,offerA)
 ]);
 assert.equal(results.filter(x=>x.status==='fulfilled'&&x.value.ok).length,1);
 assert.equal(results.filter(x=>x.status==='rejected'&&/Stale/.test(x.reason.message)).length,1);
 const savedA=await db.resume(a.token),savedB=await db.resume(b.token);
 assert.equal(savedA.tradeRevision,1);assert.equal(savedB.tradeRevision,1);
 assert.equal(savedA.profile.inventory.reduce((n,x)=>n+x.qty,0)+savedB.profile.inventory.reduce((n,x)=>n+x.qty,0),4);
});
