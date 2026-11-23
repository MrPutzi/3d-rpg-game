'use strict';
const {stationLocation}=require('./stations');
const {dist,count,removeItem,addItem,addXp}=require('./rules');
const GROW_MS=60000;
function restore(value){return value?.kind==='guam'&&Number.isSafeInteger(value.readyAt)&&value.readyAt>0?{kind:'guam',readyAt:value.readyAt}:null;}
function available(p){return p.loggedIn&&p.hp>0&&dist(p,stationLocation.farm)<=120&&!p.path?.length&&!p.intent&&!p.production&&!p.agility;}
function plant(p,now=Date.now()){
 if(!available(p))return {ok:false,message:'Stop other actions at the herb patch to plant.'};
 if(p.farmPatch)return {ok:false,message:'Your herb patch is already planted.'};
 if(count(p.inventory,'guam_seed')<1)return {ok:false,message:'You need a guam seed.'};
 removeItem(p.inventory,'guam_seed');p.farmPatch={kind:'guam',readyAt:now+GROW_MS};
 return {ok:true,message:'Guam planted. Your personal patch grows in 60 seconds, including while offline.'};
}
function harvest(p,now=Date.now()){
 if(!available(p))return {ok:false,message:'Stop other actions at the herb patch to harvest.'};
 const patch=restore(p.farmPatch);
 if(!patch||now<patch.readyAt)return {ok:false,message:'Your herb patch is not ready.'};
 const inventory=p.inventory.map(e=>({...e}));
 if(!addItem(inventory,'guam_leaf',2))return {ok:false,message:'Make room for two guam leaves. Your crop is kept.'};
 p.inventory=inventory;p.farmPatch=null;addXp(p,'farming',55);
 return {ok:true,message:'Harvested 2 guam leaves · +55 Farming XP.'};
}
module.exports={GROW_MS,restore,plant,harvest};
