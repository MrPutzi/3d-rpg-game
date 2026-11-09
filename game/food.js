'use strict';
const {ITEMS}=require('./content');
const {count,removeItem}=require('./rules');
const EAT_DELAY=1800;
function eat(p,id,now=Date.now()){
 const item=typeof id==='string'&&Object.hasOwn(ITEMS,id)?ITEMS[id]:null;
 if(!p.loggedIn||p.hp<=0||!item||item.category!=='food'||!(item.heal>0))return {ok:false};
 if(now<(p.nextEat||0)||p.hp>=p.maxHp||count(p.inventory,id)<1)return {ok:false};
 const healed=Math.min(item.heal,p.maxHp-p.hp);
 if(!removeItem(p.inventory,id,1))return {ok:false};
 p.hp+=healed;p.nextEat=now+EAT_DELAY;
 // Eating cannot shorten an existing weapon/spell cooldown.
 p.nextAttack=Math.max(p.nextAttack||0,now+EAT_DELAY);
 return {ok:true,healed,message:'You eat '+item.name+' (+'+healed+' HP).'};
}
function restoreDeadline(value,now=Date.now()){return Number.isFinite(value)?Math.max(0,Math.min(value,now+EAT_DELAY)):0;}
module.exports={eat,EAT_DELAY,restoreDeadline};
