'use strict';
const {ITEMS}=require('./content');
const {count,addItem,removeItem}=require('./rules');
function transfer(p,direction,id,quantity){
 if(!p.loggedIn||!['deposit','withdraw'].includes(direction)||typeof id!=='string'||!Object.hasOwn(ITEMS,id))return {ok:false,message:'Invalid bank request.'};
 const from=direction==='deposit'?'inventory':'bank',to=direction==='deposit'?'bank':'inventory';
 const available=count(p[from],id),qty=quantity==='all'?available:quantity;
 if(![1,5,10,50,'all'].includes(quantity)||!Number.isSafeInteger(qty)||qty<1||qty>available)return {ok:false,message:'Not enough items for that amount.'};
 const source=p[from].map(e=>({...e})),target=p[to].map(e=>({...e}));
 if(!addItem(target,id,qty,to==='bank'?200:28))return {ok:false,message:to==='bank'?'Bank is full.':'Inventory full.'};
 if(!removeItem(source,id,qty))return {ok:false,message:'Items are no longer available.'};
 p[from]=source;p[to]=target;
 return {ok:true,message:(direction==='deposit'?'Deposited ':'Withdrew ')+ITEMS[id].name+' ×'+qty+'.'};
}
function depositInventory(p,mode){
 if(!p.loggedIn||!['all','spare'].includes(mode))return {ok:false,message:'Invalid bank request.'};
 const target=p.bank.map(e=>({...e})),remaining=[];
 const keep=new Set(mode==='spare'?Object.values(p.equipment||{}).filter(Boolean):[]);
 let moved=0;
 for(const entry of p.inventory){
  let retained=0;
  if(keep.has(entry.id)){
   retained=ITEMS[entry.id]?.stackable?entry.qty:1;
   if(!ITEMS[entry.id]?.stackable)keep.delete(entry.id);
  }
  const qty=entry.qty-retained;
  if(qty&&!addItem(target,entry.id,qty,200))return {ok:false,message:'Bank cannot hold the whole deposit. Nothing moved.'};
  if(retained)remaining.push({id:entry.id,qty:retained});
  moved+=qty;
 }
 if(!moved)return {ok:false,message:'No items to deposit.'};
 p.inventory=remaining;p.bank=target;
 return {ok:true,moved,message:'Deposited '+moved+' items.'};
}
module.exports={transfer,depositInventory};
