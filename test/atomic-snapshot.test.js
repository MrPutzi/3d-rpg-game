'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {openSnapshot}=require('../game/atomic-snapshot');
const {planTrade}=require('../game/merchant-plan');
async function fixture(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'atomic-merchant-'));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'state.json');
 const data={seller:{gold:100,inventory:[{id:'cooked_rabbit',qty:1}]},stock:{}};
 return {file,store:await openSnapshot(file,data)};
}
function sell(data){
 const plan=planTrade(data.seller,data.stock,{shopId:'tavern',itemId:'cooked_rabbit',qty:1,side:'sell'});
 assert.equal(plan.ok,true);
 return {...data,seller:plan.profile,stock:plan.stock};
}
test('profile, gold and merchant stock reopen as one committed snapshot',async t=>{
 const {file,store}=await fixture(t);
 const result=await store.update(0,sell);
 assert.equal(result.data.stock.cooked_rabbit,1);
 assert.equal(result.data.seller.inventory.length,0);
 assert.ok(result.data.seller.gold>100);
 const reopened=await openSnapshot(file,{});
 assert.deepEqual(reopened.read(),result);
 result.data.stock.cooked_rabbit=999;
 assert.equal(store.read().data.stock.cooked_rabbit,1);
});
test('concurrent stale writers cannot sell the same item twice',async t=>{
 const {store}=await fixture(t);
 const results=await Promise.allSettled([store.update(0,sell),store.update(0,sell)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.match(results.find(r=>r.status==='rejected').reason.message,/Stale/);
 assert.equal(store.read().data.stock.cooked_rabbit,1);
});
test('failed transformation leaves disk unchanged and queue usable',async t=>{
 const {file,store}=await fixture(t),before=await fs.readFile(file,'utf8');
 await assert.rejects(store.update(0,data=>{data.seller.gold=0;throw Error('abort');}),/abort/);
 assert.equal(await fs.readFile(file,'utf8'),before);
 await store.update(0,sell);
});
for(const stage of ['before','after'])test('SIGKILL '+stage+' rename preserves whole old or new state',async t=>{
 const {file,store}=await fixture(t),old=store.read();
 const child=spawnSync(process.execPath,['-e',`
 const fs=require('node:fs/promises');
 const {openSnapshot}=require('./game/atomic-snapshot');
 (async()=>{
  const store=await openSnapshot(process.argv[1],{});
  const rename=fs.rename;
  fs.rename=async(...args)=>{
   if(process.argv[2]==='before')process.kill(process.pid,'SIGKILL');
   await rename(...args);
   process.kill(process.pid,'SIGKILL');
  };
  await store.update(0,data=>{data.seller.inventory=[];data.stock.cooked_rabbit=1;data.seller.gold=112;return data;});
 })().catch(e=>{console.error(e);process.exit(1)});
 `,file,stage],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:10000});
 assert.equal(child.signal,'SIGKILL',child.stderr);
 const saved=(await openSnapshot(file,{})).read();
 assert.equal(saved.revision,stage==='before'?0:1);
 assert.equal(saved.data.seller.inventory.reduce((n,i)=>n+i.qty,0)+(saved.data.stock.cooked_rabbit||0),1);
 if(stage==='before')assert.deepEqual(saved,old);
 else assert.equal(saved.data.seller.gold,112);
});
test('failed rename leaves memory and disk unchanged; retry succeeds',async t=>{
 const {file,store}=await fixture(t),before=store.read(),rename=fs.rename;
 fs.rename=async()=>{throw Object.assign(Error('disk failure'),{code:'EIO'});};
 try {await assert.rejects(store.update(0,sell),/disk failure/);}
 finally {fs.rename=rename;}
 assert.deepEqual(store.read(),before);
 assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),before);
 await store.update(0,sell);
});
