'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os'),path=require('node:path'),fs=require('node:fs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'miniscape-auth-test-'));
delete process.env.DATABASE_URL;
process.env.LOCAL_DB_PATH=path.join(dir,'players.json');
const {accountStore}=require('../game/accounts');
test('account registration, password verification, session restoration and progress save',async()=>{
 const db=accountStore();await db.init();
 try{
  const profile={gold:120,skills:{mining:{xp:10,level:1}}};
  const a=await db.register('Hrac_10','secure-password-123',profile);
  assert.equal(a.account.username,'Hrac_10');
  assert.ok(a.token.length>=32);
  await assert.rejects(db.register('hrac_10','secure-password-123',{}),/already taken/i);
  await assert.rejects(db.login('Hrac_10','wrong-password-123'),/incorrect/i);
  const signed=await db.login('hrac_10','secure-password-123');
  assert.equal(signed.account.id,a.account.id);
  assert.equal((await db.resume(signed.token)).profile.gold,120);
  await db.save(a.account.id,{gold:777,skills:{mining:{xp:500,level:6}}});
  assert.equal((await db.resume(signed.token)).profile.gold,777);
  await db.logout(signed.token);assert.equal(await db.resume(signed.token),null);
  assert.ok(await db.resume(a.token));
 }finally{await db.close();await fs.promises.rm(dir,{recursive:true,force:true});}
});
test('invalid names and weak passwords are rejected',async()=>{
 const db=accountStore();await db.init();
 try{
  await assert.rejects(db.register('x','password-too-long-to-be-rejected',{}));
  await assert.rejects(db.register('validName','short',{}));
 }finally{await db.close();}
});
