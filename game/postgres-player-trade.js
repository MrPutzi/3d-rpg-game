'use strict';
const {planPlayerTrade}=require('./player-trade');
// Lock accounts in stable UUID order. A trade is one atomic two-account transaction.
async function postgresPlayerTrade(pool,idA,revisionA,idB,revisionB,offerA,offerB){
 if(typeof idA!=='string'||typeof idB!=='string'||idA===idB||!Number.isSafeInteger(revisionA)||revisionA<0||!Number.isSafeInteger(revisionB)||revisionB<0)
  throw Error('Invalid player trade request');
 const ids=[idA,idB].sort(),client=await pool.connect();let active=false;
 try{
  await client.query('BEGIN');active=true;
  const result=await client.query('SELECT id,profile,trade_revision FROM game_accounts WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[ids]);
  if(result.rows.length!==2)throw Error('A trading account no longer exists');
  const rows=new Map(result.rows.map(row=>[row.id,row]));
  const a=rows.get(idA),b=rows.get(idB),currentA=Number(a.trade_revision),currentB=Number(b.trade_revision);
  if(currentA!==revisionA||currentB!==revisionB)throw Error('Stale account trade revision');
  if(!Number.isSafeInteger(currentA+1)||!Number.isSafeInteger(currentB+1))throw Error('Account trade revision exhausted');
  const plan=planPlayerTrade(a.profile,b.profile,offerA,offerB);
  if(!plan.ok){await client.query('ROLLBACK');active=false;return plan;}
  const savedA=await client.query('UPDATE game_accounts SET profile=$2::jsonb,trade_revision=$3 WHERE id=$1 AND trade_revision=$4',[idA,JSON.stringify(plan.profileA),currentA+1,currentA]);
  const savedB=await client.query('UPDATE game_accounts SET profile=$2::jsonb,trade_revision=$3 WHERE id=$1 AND trade_revision=$4',[idB,JSON.stringify(plan.profileB),currentB+1,currentB]);
  if(savedA.rowCount!==1||savedB.rowCount!==1)throw Error('Player trade revision changed during commit');
  await client.query('COMMIT');active=false;
  return {...plan,tradeRevisionA:currentA+1,tradeRevisionB:currentB+1};
 }catch(error){
  if(active){try{await client.query('ROLLBACK');}catch{}}
  throw error;
 }finally{client.release();}
}
module.exports={postgresPlayerTrade};
