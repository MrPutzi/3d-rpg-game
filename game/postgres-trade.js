'use strict';
const {planTrade}=require('./merchant-plan');
const {SHOPS}=require('./content');

// Account first, merchant second: every trade uses the same lock order.
// COMMIT errors are uncertain outcomes: never retry a trade automatically.
async function postgresTrade(pool,accountId,expectedTradeRevision,request){
 if(!request||!Object.hasOwn(SHOPS,request.shopId)||!Number.isSafeInteger(expectedTradeRevision)||expectedTradeRevision<0)
  throw Error('Invalid trade request');
 const client=await pool.connect();
 let active=false;
 try{
  await client.query('BEGIN');active=true;
  const account=await client.query('SELECT profile,trade_revision FROM game_accounts WHERE id=$1 FOR UPDATE',[accountId]);
  if(!account.rows.length)throw Error('Account not found');
  const revision=Number(account.rows[0].trade_revision);
  if(revision!==expectedTradeRevision)throw Error('Stale account trade revision');
  if(!Number.isSafeInteger(revision+1))throw Error('Account trade revision exhausted');
  const merchant=await client.query('SELECT stock FROM game_merchants WHERE id=$1 FOR UPDATE',[request.shopId]);
  if(!merchant.rows.length)throw Error('Merchant not found');
  const plan=planTrade(account.rows[0].profile,merchant.rows[0].stock,request);
  if(!plan.ok){await client.query('ROLLBACK');active=false;return plan;}
  await client.query('UPDATE game_accounts SET profile=$2::jsonb,trade_revision=$3 WHERE id=$1',[accountId,JSON.stringify(plan.profile),revision+1]);
  await client.query('UPDATE game_merchants SET stock=$2::jsonb WHERE id=$1',[request.shopId,JSON.stringify(plan.stock)]);
  await client.query('COMMIT');active=false;
  return {...plan,tradeRevision:revision+1};
 }catch(error){
  if(active)await client.query('ROLLBACK').catch(()=>{});
  throw error;
 }finally{client.release();}
}
module.exports={postgresTrade};
