'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
// This invariant intentionally exposes the unresolved PR #23 merge blocker.
// Use the real account store and economy in a disposable child process; no live data.
test('merchant resale conserves items after buyer checkpoint and abrupt process death',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'merchant-crash-'));
 try{
  const result=spawnSync(process.execPath,['-e',`
   const {accountStore}=require('./game/accounts');
   const E=require('./game/economy');
   (async()=>{
    const db=accountStore();await db.init();
    const seller={gold:100,inventory:[{id:'cooked_rabbit',qty:1}]};
    const buyer={gold:100,inventory:[]};
    const a=await db.register('CrashSeller','test-password-only',structuredClone(seller));
    const b=await db.register('CrashBuyer','test-password-only',structuredClone(buyer));
    if(!E.sell(seller,'tavern','cooked_rabbit',1).ok)throw Error('Sale failed');
    if(!E.buy(buyer,'tavern','cooked_rabbit',1).ok)throw Error('Purchase failed');
    // A buyer can checkpoint/disconnect before the seller autosaves.
    await db.save(b.account.id,structuredClone(buyer));
    process.kill(process.pid,'SIGKILL');
   })().catch(e=>{console.error(e);process.exit(1)});
  `],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:'',LOCAL_DB_PATH:path.join(dir,'players.json')},encoding:'utf8',timeout:10000});
  assert.equal(result.signal,'SIGKILL',result.stderr);
  // Read persisted state after process death; memory and unsaved seller state are gone.
  const disk=JSON.parse(fs.readFileSync(path.join(dir,'players.json'),'utf8'));
  assert.equal(disk.accounts.length,2);
  const copies=disk.accounts.reduce((sum,a)=>sum+a.profile.inventory.filter(e=>e.id==='cooked_rabbit').reduce((n,e)=>n+e.qty,0),0);
  assert.equal(copies,1,'One original rabbit must remain across both persisted inventories');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
