'use strict';
const {count,removeItem,dist,addXp}=require('./rules');
const WIND_STRIKE={name:'Wind Strike',range:210,delay:2400,maxHit:4,inputs:{air_rune:1,mind_rune:1}};
function cast(p,n,now=Date.now(),rng=Math.random){
 if(!p.loggedIn||p.hp<=0||!n||n.hp<=0)return {ok:false};
 if(dist(p,n)>WIND_STRIKE.range||now<(p.nextAttack||0))return {ok:false};
 if(Object.entries(WIND_STRIKE.inputs).some(([id,qty])=>count(p.inventory,id)<qty))return {ok:false,message:'You need an Air rune and a Mind rune.'};
 for(const [id,qty] of Object.entries(WIND_STRIKE.inputs))removeItem(p.inventory,id,qty);
 const damage=Math.min(n.hp,Math.floor(rng()*(WIND_STRIKE.maxHit+1)));
 n.hp-=damage;p.nextAttack=now+WIND_STRIKE.delay;
 addXp(p,'magic',6+damage*2);if(damage)addXp(p,'hitpoints',damage*4/3);
 return {ok:true,damage};
}
module.exports={WIND_STRIKE,cast};
