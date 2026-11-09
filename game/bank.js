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
module.exports={transfer};
