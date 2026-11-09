'use strict';
// Limited-stock NPC market: purchases are coin sinks, buyback pays 45%,
// dynamic pricing reflects scarcity but is bounded against extreme swings.
const {ITEMS,SHOPS}=require('./content');
const {count,addItem,removeItem}=require('./rules');
const BASE_STOCK=20;
function createEconomy(initialStock){
const stock=initialStock?structuredClone(initialStock):Object.fromEntries(Object.entries(SHOPS).map(([id,shop])=>[id,Object.fromEntries(shop.items.map(x=>[x,BASE_STOCK]))]));
function getStock(shopId,id){return stock[shopId]?.[id]??0;}
function price(shopId,id,side='buy'){
 const item=ITEMS[id];if(!item||!SHOPS[shopId])return 0;
 const quantity=getStock(shopId,id);
 const factor=Math.max(.75,Math.min(1.45,1+(BASE_STOCK-quantity)*.022));
 const buy=Math.max(1,Math.ceil(item.price*factor));
 return side==='sell'?Math.max(1,Math.floor(buy*.45)):buy;
}
function quote(shopId,id,qty,side){
 if(!Object.hasOwn(SHOPS,shopId)||!Object.hasOwn(ITEMS,id)||!['buy','sell'].includes(side)||![1,5,10,50].includes(qty))return null;
 if(side==='buy'&&!SHOPS[shopId].items.includes(id)&&getStock(shopId,id)<=0)return null;
 let sum=0,remaining=getStock(shopId,id);
 for(let i=0;i<qty;i++){
  if(side==='buy'&&remaining<=0)return null;
  const factor=Math.max(.75,Math.min(1.45,1+(BASE_STOCK-remaining)*.022));
  const unit=Math.max(1,Math.ceil(ITEMS[id].price*factor));
  sum+=side==='sell'?Math.max(1,Math.floor(unit*.45)):unit;
  remaining+=side==='sell'?1:-1;
 }
 return sum;
}
function buy(p,shopId,id,qty){
 const cost=quote(shopId,id,qty,'buy');
 if(cost===null)return {ok:false,message:'Shop item is unavailable or out of stock.'};
 if(p.gold<cost)return {ok:false,message:'Not enough coins.'};
 if(!addItem(p.inventory,id,qty))return {ok:false,message:'Inventory full (28 slots).'};
 p.gold-=cost;stock[shopId][id]-=qty;
 return {ok:true,message:'Bought '+qty+' × '+ITEMS[id].name+' for '+cost+' coins.'};
}
function sell(p,shopId,id,qty){
 const amount=quote(shopId,id,qty,'sell');
 if(amount===null||count(p.inventory,id)<qty)return {ok:false,message:'Not enough items.'};
 removeItem(p.inventory,id,qty);
 stock[shopId][id]=(stock[shopId][id]||0)+qty;
 p.gold+=amount;
 return {ok:true,message:'Sold '+qty+' × '+ITEMS[id].name+' for '+amount+' coins.'};
}
function restock(){
 for(const [shopId,shop] of Object.entries(SHOPS)){
  for(const id of shop.items){const current=getStock(shopId,id);stock[shopId][id]+=current<BASE_STOCK?1:current>BASE_STOCK?-1:0;}
 }
}
function snapshot(shopId){return{stock:{...stock[shopId]},prices:Object.fromEntries(Object.keys(ITEMS).map(id=>[id,{buy:price(shopId,id,'buy'),sell:price(shopId,id,'sell')}]))};}
return {buy,sell,quote,price,restock,snapshot,getStock,stock};
}
module.exports={...createEconomy(),createEconomy};
