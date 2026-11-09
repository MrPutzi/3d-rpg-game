'use strict';
const {addItem,dist}=require('./rules');
const {ITEMS}=require('./content');
function reserved(g,p,now){return !!g.ownerId&&g.ownerId!==p.id&&now<g.privateUntil;}
function take(p,ground,id,now,canReach){
 if(!p.loggedIn||typeof id!=='string'||!Object.hasOwn(ground,id))return {ok:false,message:'Loot is no longer available.'};
 const g=ground[id];
 if(now>=g.expires){delete ground[id];return {ok:false,message:'Loot has expired.'};}
 if(!canReach(p,g,48))return {ok:false,message:'Move closer to the loot.'};
 if(reserved(g,p,now))return {ok:false,message:'Loot is reserved for another player.'};
 if(!addItem(p.inventory,g.item,g.qty))return {ok:false,message:'Your inventory is full.'};
 // Synchronous transfer: the next player's request sees the item removed.
 delete ground[id];return {ok:true,message:'Picked up '+ITEMS[g.item].name+' ×'+g.qty+'.'};
}
function nearby(p,ground,now){
 if(!p.loggedIn)return [];
 return Object.values(ground).filter(g=>g.expires>now&&dist(p,g)<=160)
 .sort((a,b)=>dist(p,a)-dist(p,b)||a.id.localeCompare(b.id)).slice(0,20)
 .map(g=>({id:g.id,item:g.item,qty:g.qty,distance:Math.round(dist(p,g)),
 access:reserved(g,p,now)?'reserved':g.ownerId===p.id&&now<g.privateUntil?'yours':'public',
 unlockIn:Math.max(0,(g.privateUntil||0)-now),expiresIn:g.expires-now}));
}
module.exports={take,nearby};
