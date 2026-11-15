'use strict';
const {addItem,dist}=require('./rules');
const {ITEMS,BAG_SLOTS}=require('./content');
function fittingQuantity(p,g){
 const item=ITEMS[g.item];if(!item||!Number.isSafeInteger(g.qty)||g.qty<1)return 0;
 const free=Math.max(0,BAG_SLOTS-p.inventory.length);
 if(!item.stackable)return Math.min(g.qty,free);
 const stack=p.inventory.find(e=>e.id===g.item);
 return Math.min(g.qty,stack?Math.max(0,999999-stack.qty):free?999999:0);
}
function protectDiscard(g,p,now){g.privateUntil=now+15000;return assignOwner(g,p);}
// Account identity stays server-only; public drop snapshots contain no account IDs.
const owners=new WeakMap();
function assignOwner(g,p){owners.set(g,p.accountId?{accountId:p.accountId}:{socketId:p.id});g.ownerId=p.id;return g;}
function owns(g,p){const owner=owners.get(g);return owner?owner.accountId?owner.accountId===p.accountId:owner.socketId===p.id:g.ownerId===p.id;}
function reserved(g,p,now){return !!g.ownerId&&!owns(g,p)&&now<g.privateUntil;}
function takeNearby(p,ground,now,canReach){
 let taken=0;
 // Bounded work and deterministic order; each transfer reuses the single-item checks.
 const candidates=Object.values(ground).filter(g=>g.expires>now&&!reserved(g,p,now)&&canReach(p,g,48))
  .sort((a,b)=>dist(p,a)-dist(p,b)||a.id.localeCompare(b.id)).slice(0,20);
 for(const g of candidates)if(take(p,ground,g.id,now,canReach).ok)taken++;
 return {ok:taken>0,taken,message:taken?'Picked up '+taken+' nearby drops.':'No available drops fit your inventory within reach.'};
}
function take(p,ground,id,now,canReach){
 if(!p.loggedIn||typeof id!=='string'||!Object.hasOwn(ground,id))return {ok:false,message:'Loot is no longer available.'};
 const g=ground[id];
 if(now>=g.expires){delete ground[id];return {ok:false,message:'Loot has expired.'};}
 if(!canReach(p,g,48))return {ok:false,message:'Move closer to the loot.'};
 if(reserved(g,p,now))return {ok:false,message:'Loot is reserved for another player.'};
 const qty=fittingQuantity(p,g);
 if(!qty||!addItem(p.inventory,g.item,qty))return {ok:false,message:'Your inventory is full.'};
 // Synchronous transfer: the next player's request sees the reduced remainder or deletion.
 g.qty-=qty;if(!g.qty)delete ground[id];
 return {ok:true,takenQty:qty,message:'Picked up '+ITEMS[g.item].name+' ×'+qty+(g.qty?' · '+g.qty+' remain.':'.')};
}
function nearby(p,ground,now,canReach=(p,g,r)=>dist(p,g)<=r){
 if(!p.loggedIn)return [];
 return Object.values(ground).filter(g=>g.expires>now&&dist(p,g)<=160)
 .sort((a,b)=>dist(p,a)-dist(p,b)||a.id.localeCompare(b.id)).slice(0,20)
 .map(g=>({id:g.id,item:g.item,qty:g.qty,distance:Math.round(dist(p,g)),fitQty:fittingQuantity(p,g),canTake:!reserved(g,p,now)&&canReach(p,g,48)&&fittingQuantity(p,g)>0,
 access:reserved(g,p,now)?'reserved':owns(g,p)&&now<g.privateUntil?'yours':'public',
 unlockIn:Math.max(0,(g.privateUntil||0)-now),expiresIn:g.expires-now}));
}
module.exports={take,nearby,takeNearby,assignOwner,fittingQuantity,protectDiscard};
