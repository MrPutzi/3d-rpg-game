'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
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
function publicAccount(account){return{id:account.id,username:account.username,profile:account.profile};}
function accountStore(){
 let pool=null,disk={accounts:[],sessions:[]};
 const usesPostgres=!!process.env.DATABASE_URL;
 let writeQueue=Promise.resolve();
 async function writeDisk(){
  const json=JSON.stringify(disk);
  writeQueue=writeQueue.catch(()=>{}).then(async()=>{
   await fs.mkdir(path.dirname(STORE_PATH),{recursive:true});
   const tmp=STORE_PATH+'.tmp';
   await fs.writeFile(tmp,json,{mode:0o600});
   await fs.rename(tmp,STORE_PATH);
  });
  return writeQueue;
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
   try{disk=JSON.parse(await fs.readFile(STORE_PATH,'utf8'));}
   catch(err){if(err.code!=='ENOENT')throw err;}
   if(!Array.isArray(disk.accounts)||!Array.isArray(disk.sessions))throw Error('Invalid local account database');
   console.warn('Accounts: local file mode, NOT persistent on ephemeral Render filesystem. Set DATABASE_URL.');
  }
 }
 async function createSession(accountId){
  const token=crypto.randomBytes(32).toString('base64url');
  const tokenHash=digest(token),expires=Date.now()+SESSION_AGE_MS;
  if(pool)await pool.query('INSERT INTO game_sessions (token_hash,account_id,expires_at) VALUES($1,$2,$3)',[tokenHash,accountId,new Date(expires)]);
  else{disk.sessions=disk.sessions.filter(s=>s.expires>Date.now());disk.sessions.push({hash:tokenHash,accountId,expires});await writeDisk();}
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
  }else{
   if(disk.accounts.some(a=>a.usernameKey===usernameKey))throw Error('This character name is already taken.');
   disk.accounts.push({id,username,usernameKey,passwordHash:passHash,profile});
   await writeDisk();
  }
  return{account:{id,username,profile},token:await createSession(id)};
 }
 async function findByName(username){
  if(pool){
   const r=await pool.query('SELECT id,username,profile,password_hash FROM game_accounts WHERE username_key=$1',[keyOf(username)]);
   return r.rows[0]||null;
  }
  return disk.accounts.find(a=>a.usernameKey===keyOf(username))||null;
 }
 async function login(username,password){
  if(!usernameValid(username)||!passwordValid(password))throw Error('Incorrect username or password.');
  const a=await findByName(username);
  if(!a||!(await checkPassword(password,a.password_hash||a.passwordHash)))throw Error('Incorrect username or password.');
  return{account:publicAccount(a),token:await createSession(a.id)};
 }
 async function resume(token){
  if(typeof token!=='string'||token.length>150||token.length<32)return null;
  const h=digest(token);
  if(pool){
   const r=await pool.query(`SELECT a.id,a.username,a.profile FROM game_sessions s
    JOIN game_accounts a ON s.account_id=a.id WHERE s.token_hash=$1 AND s.expires_at>NOW()`,[h]);
   return r.rows[0]?publicAccount(r.rows[0]):null;
  }
  const s=disk.sessions.find(x=>x.hash===h&&x.expires>Date.now());
  const a=s?disk.accounts.find(x=>x.id===s.accountId):null;
  return a?publicAccount(a):null;
 }
 async function logout(token){
  if(typeof token!=='string'||token.length>150)return;
  const h=digest(token);
  if(pool)await pool.query('DELETE FROM game_sessions WHERE token_hash=$1',[h]);
  else{disk.sessions=disk.sessions.filter(s=>s.hash!==h);await writeDisk();}
 }
 async function save(accountId,profile){
  if(!accountId)return;
  if(pool)await pool.query('UPDATE game_accounts SET profile=$2::jsonb WHERE id=$1',[accountId,JSON.stringify(profile)]);
  else{
   const a=disk.accounts.find(x=>x.id===accountId);
   if(a){a.profile=profile;await writeDisk();}
  }
 }
 async function close(){if(pool)await pool.end();else await writeQueue;}
 return{init,register,login,resume,logout,save,close,mode:usesPostgres?'postgres':'local-file'};
}
module.exports={accountStore,usernameValid,passwordValid,hashPassword,checkPassword};
