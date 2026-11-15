'use strict';
const {createEconomy}=require('./economy');
const RESTOCK_MS=60000;
function planRestock(stock,nextRestockAt,now){
 if(!Number.isSafeInteger(now)||now<0||!Number.isSafeInteger(now+RESTOCK_MS))throw Error('Invalid restock time');
 if(nextRestockAt!=null&&(!Number.isSafeInteger(nextRestockAt)||nextRestockAt<0))throw Error('Invalid restock deadline');
 const economy=createEconomy(stock);
 if(nextRestockAt==null)return{stock:economy.stock,nextRestockAt:now+RESTOCK_MS,restocked:false};
 if(now<nextRestockAt)return{stock:economy.stock,nextRestockAt,restocked:false};
 economy.restock();
 // One step only, even after a long outage; no offline inventory inflation.
 return{stock:economy.stock,nextRestockAt:now+RESTOCK_MS,restocked:true};
}
async function postgresRestock(pool,now){
 const client=await pool.connect();let active=false;
 try{
  await client.query('BEGIN');active=true;
  const clock=await client.query('SELECT next_restock_at FROM game_economy_clock WHERE id=1 FOR UPDATE');
  const rows=await client.query('SELECT id,stock FROM game_merchants ORDER BY id FOR UPDATE');
  const stock=Object.fromEntries(rows.rows.map(row=>[row.id,row.stock]));
  const deadline=clock.rows[0].next_restock_at;
  const result=planRestock(stock,deadline===null?null:Number(deadline),now);
  if(result.restocked)for(const [id,value] of Object.entries(result.stock))
   await client.query('UPDATE game_merchants SET stock=$2::jsonb WHERE id=$1',[id,JSON.stringify(value)]);
  await client.query('UPDATE game_economy_clock SET next_restock_at=$1 WHERE id=1',[result.nextRestockAt]);
  await client.query('COMMIT');active=false;return result;
 }catch(error){if(active)await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release();}
}
module.exports={planRestock,postgresRestock,RESTOCK_MS};
