'use strict';
const {ITEMS,VILLAGE,BAG_SLOTS,WORLD_SIZE,TICK_MS}=require('./content');
const XP=[0,0];
for(let level=2,points=0;level<=99;level++){
 points+=Math.floor((level-1)+300*Math.pow(2,(level-1)/7));
 XP[level]=Math.floor(points/4);
}
function xpForLevel(lvl){return XP[Math.max(1,Math.min(99,Math.trunc(lvl)))];}
function levelForXp(xp){let lvl=1;while(lvl<99&&xp>=XP[lvl+1])lvl++;return lvl;}
function skill(xp=0){return{xp,level:levelForXp(xp)};}
function addXp(p,key,amount){const s=p.skills[key];if(!s||!Number.isFinite(amount)||amount<=0)return;s.xp+=Math.round(amount*100)/100;s.level=levelForXp(s.xp);}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function count(inv,id){return inv.reduce((sum,e)=>sum+(e.id===id?e.qty:0),0);}
function addItem(inv,id,qty=1,maxSlots=BAG_SLOTS){
 const item=ITEMS[id];if(!item||!Number.isSafeInteger(qty)||qty<1)return false;
 if(item.stackable){const existing=inv.find(e=>e.id===id);
  if(existing){if(existing.qty+qty>999999)return false;existing.qty+=qty;return true;}
  if(inv.length>=maxSlots)return false;inv.push({id,qty});return true;
 }
 if(inv.length+qty>maxSlots)return false;
 for(let i=0;i<qty;i++)inv.push({id,qty:1});return true;
}
function removeItem(inv,id,qty=1){
 if(!Number.isSafeInteger(qty)||qty<1||count(inv,id)<qty)return false;
 for(let i=inv.length-1;i>=0&&qty>0;i--)if(inv[i].id===id){const consumed=Math.min(qty,inv[i].qty);inv[i].qty-=consumed;qty-=consumed;if(inv[i].qty===0)inv.splice(i,1);}
 return true;
}
const UNARMED={id:'unarmed',name:'Unarmed',type:'crush',speed:4,attackBonus:0,strengthBonus:0,styles:['accurate','aggressive','defensive']};
function weaponOf(p){return ITEMS[p.equipment.weapon]||UNARMED;}
function allowedStyles(weapon){return weapon?.styles||['accurate','aggressive','defensive'];}
function styleFor(weapon,desired){return allowedStyles(weapon).includes(desired)?desired:allowedStyles(weapon)[0];}
function canEquip(p,item){
 if(!item||!['weapon','offhand','ammo'].includes(item.slot))return false;
 const level=p.skills[item.skill||'defence']?.level||1;
 return level>=(item.level||1);
}
function equip(p,id){
 const item=ITEMS[id];if(count(p.inventory,id)<1||!canEquip(p,item))return {ok:false,message:'Missing item or required skill level.'};
 if(item.slot==='offhand'&&weaponOf(p).twoHanded)return {ok:false,message:'Your two-handed weapon prevents equipping a shield.'};
 if(item.slot==='ammo'&&weaponOf(p).ammo&&weaponOf(p).ammo!==item.ammo)return {ok:false,message:'This ammunition does not fit your weapon.'};
 p.equipment[item.slot]=id;
 if(item.slot==='weapon'){
  if(item.twoHanded)p.equipment.offhand=null;
  p.combatStyle=styleFor(item,item.type==='ranged'?'rapid':'accurate');
 }
 return {ok:true,message:'Equipped '+item.name+'.'};
}
function attackDelayMs(p){
 const w=weaponOf(p);return Math.max(2,w.speed-(p.combatStyle==='rapid'?1:0))*TICK_MS;
}
function attackRange(p){return weaponOf(p).type==='ranged'?(p.combatStyle==='longrange'?260:210):55;}
function combatRoll(p,target,rng=Math.random){
 const w=weaponOf(p),ranged=w.type==='ranged',style=p.combatStyle;
 const atkLevel=(ranged?p.skills.ranging.level:p.skills.attack.level)+(style==='accurate'||style==='range_accurate'?3:0);
 const strLevel=(ranged?p.skills.ranging.level:p.skills.strength.level)+(style==='aggressive'?3:0);
 const ammo=ITEMS[p.equipment.ammo];
 const acc=Math.max(1,(atkLevel+8)*(64+(w.attackBonus||0)));
 const weak=(target.weakness===w.type)?-.25:0;
 const def=Math.max(1,(target.defence+8)*(64+(target.defenceBonus||0))*(1+weak));
 const chance=acc>def?1-(def+2)/(2*(acc+1)):acc/(2*(def+1));
 const strengthBonus=(w.strengthBonus||0)+(ranged?(ammo?.rangedStrength||0):0);
 const maxHit=Math.max(1,Math.floor(.5+(strLevel+8)*(64+strengthBonus)/640));
 const hit=rng()<clamp(chance,.04,.97)?Math.floor(rng()*(maxHit+1)):0;
 return{hit,accuracy:chance,maxHit,type:w.type,range:ranged};
}
function awardCombatXp(p,dmg){
 if(dmg<=0)return;
 const style=p.combatStyle;
 if(style==='controlled'){for(const k of ['attack','strength','defence'])addXp(p,k,dmg*4/3);}
 else if(style==='longrange'){addXp(p,'ranging',dmg*2);addXp(p,'defence',dmg*2);}
 else addXp(p,style==='aggressive'?'strength':style==='defensive'?'defence':style==='accurate'?'attack':'ranging',dmg*4);
 addXp(p,'hitpoints',dmg*4/3);
}
function collides(p){return VILLAGE.buildings.some(b=>p.x>b.x-17&&p.x<b.x+b.w+17&&p.y>b.y-17&&p.y<b.y+b.h+17);}
const CELL=32,GRIDSIZE=Math.ceil(WORLD_SIZE/CELL);
function cellAt(x,y){return [clamp(Math.floor(x/CELL),0,GRIDSIZE-1),clamp(Math.floor(y/CELL),0,GRIDSIZE-1)];}
function openCell(x,y){const point={x:x*CELL+CELL/2,y:y*CELL+CELL/2};return !collides(point);}
function makePath(from,to){
 const [sx,sy]=cellAt(from.x,from.y),[gx,gy]=cellAt(to.x,to.y);
 if(!openCell(gx,gy)||collides(to))return [];
 const start=sy*GRIDSIZE+sx,goal=gy*GRIDSIZE+gx;
 if(start===goal)return [{x:clamp(to.x,16,WORLD_SIZE-16),y:clamp(to.y,16,WORLD_SIZE-16)}];
 const previous=new Int32Array(GRIDSIZE*GRIDSIZE).fill(-1),queue=new Int32Array(GRIDSIZE*GRIDSIZE);
 let first=0,last=0;queue[last++]=start;previous[start]=start;
 while(first<last){
  const cur=queue[first++];if(cur===goal)break;
  const x=cur%GRIDSIZE,y=Math.floor(cur/GRIDSIZE);
  for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
   if(nx<0||ny<0||nx>=GRIDSIZE||ny>=GRIDSIZE||!openCell(nx,ny))continue;
   const ni=ny*GRIDSIZE+nx;if(previous[ni]>=0)continue;previous[ni]=cur;queue[last++]=ni;
  }
 }
 if(previous[goal]<0)return [];
 const path=[];let cur=goal;while(cur!==start){path.push({x:(cur%GRIDSIZE)*CELL+CELL/2,y:Math.floor(cur/GRIDSIZE)*CELL+CELL/2});cur=previous[cur];}
 path.reverse();path.push({x:clamp(to.x,16,WORLD_SIZE-16),y:clamp(to.y,16,WORLD_SIZE-16)});
 return path;
}
module.exports={XP,xpForLevel,levelForXp,skill,addXp,dist,clamp,count,addItem,removeItem,weaponOf,allowedStyles,styleFor,canEquip,equip,attackDelayMs,attackRange,combatRoll,awardCombatXp,collides,makePath};
