'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
delete process.env.DATABASE_URL;
const {accountStore}=require('../game/accounts');
const order=side=>({shopId:'tavern',itemId:'cooked_rabbit',qty:1,side});
async function setup(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'account-trade-'));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const filename=path.join(dir,'players.json'),db=accountStore({filename});await db.init();
 t.after(()=>db.close());
 const seller=await db.register('Seller','test-password-only',{gold:100,inventory:[{id:'cooked_rabbit',qty:1}]});
 const buyer=await db.register('Buyer','test-password-only',{gold:100,inventory:[]});
 return {db,filename,seller,buyer};
}
test('account trade survives restart and rejects pre-trade autosaves',async t=>{
 const {db,filename,seller,buyer}=await setup(t);
 assert.equal((await db.trade(seller.account.id,0,order('sell'))).ok,true);
 await assert.rejects(db.save(seller.account.id,seller.account.profile),/Stale/);
 assert.equal((await db.trade(buyer.account.id,0,order('buy'))).ok,true);
 await db.close();
 const reopened=accountStore({filename});await reopened.init();
 try{
  const s=await reopened.resume(seller.token),b=await reopened.resume(buyer.token);
  assert.equal(s.profile.inventory.length,0);
  assert.equal(b.profile.inventory[0].qty,1);
  assert.equal(s.tradeRevision,1);
  await reopened.save(s.id,s.profile,s.tradeRevision);
 }finally{await reopened.close();}
});
test('two buyers compete for one durable item while session writes are serialized',async t=>{
 const {db,seller,buyer,filename}=await setup(t);
 const other=await db.register('OtherBuyer','test-password-only',{gold:100,inventory:[]});
 await db.trade(seller.account.id,0,order('sell'));
 const [a,b]=await Promise.all([db.trade(buyer.account.id,0,order('buy')),db.trade(other.account.id,0,order('buy')),db.logout(seller.token)]);
 assert.equal([a,b].filter(x=>x.ok).length,1);
 assert.equal(await db.resume(seller.token),null);
 const disk=JSON.parse(await fs.readFile(filename,'utf8'));
 assert.equal(disk.merchants.tavern.cooked_rabbit,0);
 assert.equal(disk.accounts.reduce((n,a)=>n+a.profile.inventory.reduce((n,i)=>n+i.qty,0),0),1);
});
test('legacy file and unknown fields survive next write without erasing progress',async t=>{
 const {db,filename,seller}=await setup(t);await db.close();
 const disk=JSON.parse(await fs.readFile(filename,'utf8'));delete disk.storageRevision;
 disk.futureMetadata={keep:true};await fs.writeFile(filename,JSON.stringify(disk));
 const reopened=accountStore({filename});await reopened.init();
 try{await reopened.save(seller.account.id,{gold:222,inventory:[]});}
 finally{await reopened.close();}
 const saved=JSON.parse(await fs.readFile(filename,'utf8'));
 assert.deepEqual(saved.futureMetadata,{keep:true});
 assert.equal(saved.accounts.length,2);assert.equal(saved.sessions.length,2);
 assert.equal(saved.accounts[0].profile.gold,222);
});
test('durable resale retains exactly one item after actual process death',async t=>{
 const {db,filename,seller,buyer}=await setup(t);await db.close();
 const child=spawnSync(process.execPath,['-e',`
 const {accountStore}=require('./game/accounts');
 (async()=>{
 const db=accountStore({filename:process.argv[1]});await db.init();
 const request={shopId:'tavern',itemId:'cooked_rabbit',qty:1};
 if(!(await db.trade(process.argv[2],0,{...request,side:'sell'})).ok)throw Error('sell failed');
 if(!(await db.trade(process.argv[3],0,{...request,side:'buy'})).ok)throw Error('buy failed');
 process.kill(process.pid,'SIGKILL');
 })().catch(e=>{console.error(e);process.exit(1)});
 `,filename,seller.account.id,buyer.account.id],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:10000});
 assert.equal(child.signal,'SIGKILL',child.stderr);
 const disk=JSON.parse(await fs.readFile(filename,'utf8'));
 assert.equal(disk.accounts.reduce((n,a)=>n+a.profile.inventory.reduce((n,i)=>n+i.qty,0),0)+(disk.merchants.tavern.cooked_rabbit||0),1);
});
