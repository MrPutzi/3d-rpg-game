'use strict';
const {VILLAGE}=require('./content');
const {dist,addXp}=require('./rules');
const TARGET='guard',SUCCESS_MS=3000,FAIL_MS=5000;
function restore(value,now=Date.now()){return Number.isFinite(value)?Math.max(0,Math.min(value,now+FAIL_MS)):0;}
function attempt(p,id,now=Date.now(),rng=Math.random){
 const npc=VILLAGE.villagers.find(n=>n.id===TARGET);
 if(id!==TARGET||!p.loggedIn||p.hp<=0||dist(p,npc)>90||p.path?.length||p.intent||p.production||p.agility)return {ok:false,message:'Stand beside the Oakvale guard and stop other actions to pickpocket.'};
 if(now<(p.nextThieve||0))return {ok:false,message:'Wait before attempting another pickpocket.'};
 const chance=Math.min(.9,.65+Math.max(0,(p.skills.thieving?.level||1)-1)*.005);
 if(rng()>=chance){p.nextThieve=now+FAIL_MS;p.hp=Math.max(1,p.hp-1);return {ok:true,success:false,message:'Caught! Lost up to 1 HP (non-lethal). Wait 5 seconds before trying again.'};}
 p.nextThieve=now+SUCCESS_MS;p.gold+=4;addXp(p,'thieving',25);
 return {ok:true,success:true,message:'Pickpocket succeeded · +4 coins · +25 Thieving XP.'};
}
module.exports={TARGET,SUCCESS_MS,FAIL_MS,restore,attempt};
