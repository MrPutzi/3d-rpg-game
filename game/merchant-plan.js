'use strict';
const {createEconomy}=require('./economy');
const {ITEMS,SHOPS}=require('./content');
// Pure transaction planning. Inputs must be loaded and locked by the caller's
// storage transaction. A successful plan is NOT a durable trade acknowledgement.
function planTrade(profile,merchantStock,{shopId,itemId,qty,side}={}){
 const reject=message=>({ok:false,message});
 if(typeof shopId!=='string'||!Object.hasOwn(SHOPS,shopId)||typeof itemId!=='string'||!Object.hasOwn(ITEMS,itemId)||!['buy','sell'].includes(side)||![1,5,10,50].includes(qty))return reject('Invalid trade.');
 if(!profile||!Number.isSafeInteger(profile.gold)||profile.gold<0||!Array.isArray(profile.inventory)||profile.inventory.length>28)return reject('Invalid profile.');
 for(const entry of profile.inventory)if(!entry||!Object.hasOwn(ITEMS,entry.id)||!Number.isSafeInteger(entry.qty)||entry.qty<1)return reject('Invalid inventory.');
 if(!merchantStock||typeof merchantStock!=='object'||Array.isArray(merchantStock))return reject('Invalid merchant stock.');
 for(const [id,n] of Object.entries(merchantStock))if(!Object.hasOwn(ITEMS,id)||!Number.isSafeInteger(n)||n<0)return reject('Invalid merchant stock.');
 const current=merchantStock[itemId]||0;
 if(side==='sell'&&!Number.isSafeInteger(current+qty))return reject('Merchant stock limit reached.');
 const future=structuredClone(profile),economy=createEconomy({[shopId]:merchantStock});
 const result=economy[side](future,shopId,itemId,qty);
 if(!result.ok)return result;
 if(!Number.isSafeInteger(future.gold)||future.gold<0)return reject('Gold limit reached.');
 return {...result,profile:future,stock:{...economy.stock[shopId]}};
}
module.exports={planTrade};
