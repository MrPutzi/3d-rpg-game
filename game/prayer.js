'use strict';
const {dist}=require('./rules');
const {stationLocation}=require('./stations');
const PRAYER_DRAIN_MS=5000;
const PRAYERS=Object.freeze({
 stone_ward:{name:'Stone Ward',level:1,description:'Reduces incoming melee damage by 40%'}
});
function maxPoints(p){return Math.max(1,Math.min(99,p.skills?.prayer?.level||1));}
function points(p){return Math.max(0,Math.min(maxPoints(p),Number.isSafeInteger(p.prayerPoints)?p.prayerPoints:maxPoints(p)));}
function restore(value,p){return Number.isSafeInteger(value)?Math.max(0,Math.min(maxPoints(p),value)):maxPoints(p);}
function deactivate(p){const changed=!!p.activePrayer;p.activePrayer=null;p.nextPrayerDrain=0;return changed;}
function toggle(p,id,now=Date.now()){
 if(!p.loggedIn||p.hp<=0||typeof id!=='string'||!Object.hasOwn(PRAYERS,id))return {ok:false,message:'Prayer is unavailable.'};
 if(p.activePrayer===id){deactivate(p);return {ok:true,active:false,message:PRAYERS[id].name+' deactivated.'};}
 if((p.skills.prayer?.level||1)<PRAYERS[id].level)return {ok:false,message:'Requires Prayer level '+PRAYERS[id].level+'.'};
 if(points(p)<1)return {ok:false,message:'No Prayer points. Visit the Oakvale shrine to recharge.'};
 p.activePrayer=id;p.prayerPoints=points(p);p.nextPrayerDrain=now+PRAYER_DRAIN_MS;
 return {ok:true,active:true,message:PRAYERS[id].name+' activated. One Prayer point drains every five seconds.'};
}
function advance(p,now=Date.now()){
 if(!p.activePrayer)return false;
 if(!Object.hasOwn(PRAYERS,p.activePrayer)||p.hp<=0||points(p)<=0){deactivate(p);return true;}
 if(now<(p.nextPrayerDrain||0))return false;
 p.prayerPoints=points(p)-1;
 if(p.prayerPoints===0)deactivate(p);
 else p.nextPrayerDrain=now+PRAYER_DRAIN_MS;
 return true;
}
function incomingDamage(p,damage){
 if(!Number.isFinite(damage)||damage<=0)return 0;
 return p.activePrayer==='stone_ward'?Math.floor(damage*.6):Math.floor(damage);
}
function recharge(p,now=Date.now()){
 if(!p.loggedIn||p.hp<=0||!Number.isFinite(p.x)||!Number.isFinite(p.y)||dist(p,stationLocation.prayer)>90||p.path?.length||p.intent||p.production||p.agility)
  return {ok:false,message:'Stop at the Oakvale shrine to recharge Prayer.'};
 const maximum=maxPoints(p);
 if(points(p)>=maximum)return {ok:false,message:'Your Prayer points are already full.'};
 p.prayerPoints=maximum;deactivate(p);
 return {ok:true,message:'Prayer restored to '+maximum+' points at the Oakvale shrine.'};
}
module.exports={PRAYERS,PRAYER_DRAIN_MS,maxPoints,points,restore,deactivate,toggle,advance,incomingDamage,recharge};
