'use strict';
const {stationLocation}=require('./stations');
const {dist,count,removeItem,addItem,addXp}=require('./rules');
const {questProgress}=require('./activities');
const CROPS=Object.freeze({
 guam:{seed:'guam_seed',leaf:'guam_leaf',level:1,growMs:60000,yield:2,xp:55},
 marentill:{seed:'marentill_seed',leaf:'marentill_leaf',level:5,growMs:90000,yield:2,xp:75}
});
function cropFor(kind){return typeof kind==='string'&&Object.hasOwn(CROPS,kind)?CROPS[kind]:null;}
function restore(value){return cropFor(value?.kind)&&Number.isSafeInteger(value.readyAt)&&value.readyAt>0?{kind:value.kind,readyAt:value.readyAt}:null;}
function available(p){return p.loggedIn&&p.hp>0&&dist(p,stationLocation.farm)<=120&&!p.path?.length&&!p.intent&&!p.production&&!p.agility;}
function plant(p,kindOrNow='guam',maybeNow=Date.now()){
 let kind='guam',now=maybeNow;
 if(typeof kindOrNow==='string')kind=kindOrNow;
 else if(Number.isFinite(kindOrNow))now=kindOrNow;
 const crop=cropFor(kind);
 if(!crop)return {ok:false,message:'Unknown herb seed.'};
 if(!available(p))return {ok:false,message:'Stop other actions at the herb patch to plant.'};
 if((p.skills.farming?.level||1)<crop.level)return {ok:false,message:'Requires Farming level '+crop.level+'.'};
 if(p.farmPatch)return {ok:false,message:'Your herb patch is already planted.'};
 if(count(p.inventory,crop.seed)<1)return {ok:false,message:'You need a '+kind+' seed.'};
 removeItem(p.inventory,crop.seed);
 p.farmPatch={kind,readyAt:now+crop.growMs};
 return {ok:true,message:kind[0].toUpperCase()+kind.slice(1)+' planted. Your personal patch grows in '+Math.round(crop.growMs/1000)+' seconds, including while offline.'};
}
function harvest(p,now=Date.now()){
 if(!available(p))return {ok:false,message:'Stop other actions at the herb patch to harvest.'};
 const patch=restore(p.farmPatch),crop=patch&&cropFor(patch.kind);
 if(!patch||!crop||now<patch.readyAt)return {ok:false,message:'Your herb patch is not ready.'};
 const inventory=p.inventory.map(e=>({...e}));
 if(!addItem(inventory,crop.leaf,crop.yield))return {ok:false,message:'Make room for '+crop.yield+' herb leaves. Your crop is kept.'};
 p.inventory=inventory;p.farmPatch=null;addXp(p,'farming',crop.xp);
 if(p.quests)questProgress(p,'harvest',patch.kind,1);
 return {ok:true,message:'Harvested '+crop.yield+' '+patch.kind+' leaves · +'+crop.xp+' Farming XP.'};
}
module.exports={CROPS,GROW_MS:CROPS.guam.growMs,restore,plant,harvest};
