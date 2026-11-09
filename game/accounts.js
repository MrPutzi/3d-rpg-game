'use strict';
const crypto=require('node:crypto');
const {openSnapshot}=require('./atomic-snapshot');
const {planTrade}=require('./merchant-plan');
const {createEconomy}=require('./economy');
const path=require('node:path');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const SESSION_AGE_MS=7*24*60*60*1000;
const STORE_PATH=process.env.LOCAL_DB_PATH||path.join(process.cwd(),'.data','players.json');
const usernameValid=name=>typeof name==='string'&&/^[\p{L}\p{N}_-]{3,18}$/u.test(name);
const passwordValid=password=>typeof password==='string'&&password.length>=10&&password.length<=128;
const keyOf=name=>name.normalize('NFKC').toLowerCase();
const digest=token=>crypto.createHash('sha256').update(token).digest('hex');
async function hashPassword(password){
 const salt=crypto.randomBytes(16).toString('hex');
 const hash=(await scrypt(password,salt,64)).toString('hex');
 return salt+':'+hash;
}
async function checkPassword(password,stored){
 const [salt,hex]=String(stored||'').split(':');
 if(!salt||!hex||hex.length!==128)return false;
 const a=Buffer.from(hex,'hex'),b=await scrypt(password,salt,a.length);
 return crypto.timingSafeEqual(a,b);
}
function publicAccount(account){return{id:account.id,username:account.username,profile:structuredClone(account.profile),tradeRevision:account.tradeRevision||0};}
function accountStore({filename=STORE_PATH}={}){
 let pool=null,local=null;
 const usesPostgres=!!process.env.DATABASE_URL;
 let writeQueue=Promise.resolve();
 function readDisk(){return local.read().data;}
 function mutateDisk(change){
  const job=writeQueue.then(async()=>{
   const current=local.read();
   let result;
   await local.update(current.revision,async disk=>{result=await change(disk);return disk;});
   return result;
  });
  writeQueue=job.catch(()=>{});
  return job;
 }
 async function init(){
  if(usesPostgres){
   const {Pool}=require('pg');
   pool=new Pool({connectionString:process.env.DATABASE_URL,
    ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:undefined,
    max:5,connectionTimeoutMillis:10000});
   await pool.query(`CREATE TABLE IF NOT EXISTS game_accounts (
    id UUID PRIMARY KEY, username TEXT NOT NULL, username_key TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, profile JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`);
   await pool.query(`CREATE TABLE IF NOT EXISTS game_sessions (
    token_hash TEXT PRIMARY KEY, account_id UUID NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
   )`);
   await pool.query('CREATE INDEX IF NOT EXISTS sessions_expires_idx ON game_sessions(expires_at)');
   console.log('Accounts: PostgreSQL ready');
  }else{
   local=await openSnapshot(filename,{accounts:[],sessions:[]},{
    encode:state=>({...state.data,storageRevision:state.revision}),
    decode:disk=>({revision:disk.storageRevision??0,data:disk})
   });
   const disk=readDisk();
   if(!Array.isArray(disk.accounts)||!Array.isArray(disk.sessions))throw Error('Invalid local account database');
   console.warn('Accounts: local file mode, NOT persistent on ephemeral Render filesystem. Set DATABASE_URL.');
  }
 }
 async function createSession(accountId){
  const token=crypto.randomBytes(32).toString('base64url');
  const tokenHash=digest(token),expires=Date.now()+SESSION_AGE_MS;
  if(pool)await pool.query('INSERT INTO game_sessions (token_hash,account_id,expires_at) VALUES($1,$2,$3)',[tokenHash,accountId,new Date(expires)]);
  else await mutateDisk(disk=>{disk.sessions=disk.sessions.filter(s=>s.expires>Date.now());disk.sessions.push({hash:tokenHash,accountId,expires});});
  return token;
 }
 async function register(username,password,profile){
  if(!usernameValid(username)||!passwordValid(password))throw Error('Use 3–18 letters/numbers for name and a password of 10–128 characters.');
  const usernameKey=keyOf(username),id=crypto.randomUUID(),passHash=await hashPassword(password);
  if(pool){
   try{
    await pool.query('INSERT INTO game_accounts (id,username,username_key,password_hash,profile) VALUES($1,$2,$3,$4,$5::jsonb)',
     [id,username,usernameKey,passHash,JSON.stringify(profile)]);
   }catch(err){if(err.code==='23505')throw Error('This character name is already taken.');throw err;}
  }else await mutateDisk(disk=>{
   if(disk.accounts.some(a=>a.usernameKey===usernameKey))throw Error('This character name is already taken.');
   disk.accounts.push({id,username,usernameKey,passwordHash:passHash,profile:structuredClone(profile),tradeRevision:0});
  });
  const token=await createSession(id);
  return{account:await resume(token),token};
 }
 async function findByName(username){
  if(pool){
   const r=await pool.query('SELECT id,username,profile,password_hash FROM game_accounts WHERE username_key=$1',[keyOf(username)]);
   return r.rows[0]||null;
  }
  return readDisk().accounts.find(a=>a.usernameKey===keyOf(username))||null;
 }
 async function login(username,password){
  if(!usernameValid(username)||!passwordValid(password))throw Error('Incorrect username or password.');
  const a=await findByName(username);
  if(!a||!(await checkPassword(password,a.password_hash||a.passwordHash)))throw Error('Incorrect username or password.');
  const token=await createSession(a.id);
  return{account:await resume(token),token};
 }
 async function resume(token){
  if(typeof token!=='string'||token.length>150||token.length<32)return null;
  const h=digest(token);
  if(pool){
   const r=await pool.query(`SELECT a.id,a.username,a.profile FROM game_sessions s
    JOIN game_accounts a ON s.account_id=a.id WHERE s.token_hash=$1 AND s.expires_at>NOW()`,[h]);
   return r.rows[0]?publicAccount(r.rows[0]):null;
  }
  const disk=readDisk();
  const s=disk.sessions.find(x=>x.hash===h&&x.expires>Date.now());
  const a=s?disk.accounts.find(x=>x.id===s.accountId):null;
  return a?publicAccount(a):null;
 }
 async function logout(token){
  if(typeof token!=='string'||token.length>150)return;
  const h=digest(token);
  if(pool)await pool.query('DELETE FROM game_sessions WHERE token_hash=$1',[h]);
  else await mutateDisk(disk=>{disk.sessions=disk.sessions.filter(s=>s.hash!==h);});
 }
 async function save(accountId,profile,expectedTradeRevision=0){
  if(!accountId)return;
  const captured=structuredClone(profile);
  if(pool)await pool.query('UPDATE game_accounts SET profile=$2::jsonb WHERE id=$1',[accountId,JSON.stringify(captured)]);
  else await mutateDisk(disk=>{
   const a=disk.accounts.find(x=>x.id===accountId);
   if(a){
    if((a.tradeRevision||0)!==expectedTradeRevision)throw Error('Stale account trade revision');
    a.profile=captured;
   }
  });
 }
 // Operates on checkpointed profiles only. Live handlers must checkpoint and
 // lock gameplay first; PostgreSQL support is deliberately fail-closed.
 async function trade(accountId,expectedTradeRevision,request){
  if(usesPostgres)throw Error('Durable PostgreSQL trading is not implemented');
  const captured=structuredClone(request);
  return mutateDisk(disk=>{
   const a=disk.accounts.find(x=>x.id===accountId);
   if(!a)throw Error('Account not found');
   const revision=a.tradeRevision||0;
   if(!Number.isSafeInteger(expectedTradeRevision)||expectedTradeRevision!==revision)throw Error('Stale account trade revision');
   if(!Number.isSafeInteger(revision+1))throw Error('Account trade revision exhausted');
   const merchants=disk.merchants||createEconomy().stock;
   const plan=planTrade(a.profile,merchants[captured?.shopId],captured);
   if(!plan.ok)return plan;
   a.profile=plan.profile;a.tradeRevision=revision+1;
   merchants[captured.shopId]=plan.stock;disk.merchants=merchants;
   return {...plan,tradeRevision:a.tradeRevision};
  });
 }
 async function close(){if(pool)await pool.end();else await writeQueue;}
 return{init,register,login,resume,logout,save,trade,close,mode:usesPostgres?'postgres':'local-file'};
}
module.exports={accountStore,usernameValid,passwordValid,hashPassword,checkPassword};
