'use strict';
const {ITEMS}=require('./content');
const {count,addItem,addXp}=require('./rules');
const {questProgress}=require('./activities');
// Called only after the server has checked reach and the player's gather timer.
function gather(p,n,now=Date.now()){
 if(p.skills[n.skill].level<n.level)return {ok:false,message:'Requires '+n.skill+' level '+n.level+'.'};
 const toolId=n.tool==='axe'?(count(p.inventory,'iron_axe')?'iron_axe':'bronze_axe'):n.tool==='pickaxe'?(count(p.inventory,'iron_pickaxe')?'iron_pickaxe':'bronze_pickaxe'):n.tool;
 if(!count(p.inventory,toolId))return {ok:false,message:'You need a '+(ITEMS[toolId]?.name||'tool')+'.'};
 if(now<n.readyAt)return {ok:false,message:'This resource has been depleted.'};
 if(!addItem(p.inventory,n.item))return {ok:false,message:'Inventory full (28 slots).'};
 addXp(p,n.skill,n.xp);questProgress(p,'gather',n.item,1);n.readyAt=now+7500;
 return {ok:true,message:'Gathered '+ITEMS[n.item].name+' · +'+n.xp+' '+n.skill+' XP'};
}
module.exports={gather};
