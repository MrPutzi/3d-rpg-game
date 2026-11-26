'use strict';
const {VILLAGE}=require('./content');
const {dist,addXp}=require('./rules');
const {questProgress}=require('./activities');
const TARGETS=Object.freeze({
 guard:{level:1,gold:4,xp:25,baseChance:.65,perLevel:.005,successMs:3000,failMs:5000,damage:1},
 quartermaster:{level:3,gold:9,xp:45,baseChance:.58,perLevel:.006,successMs:4000,failMs:7000,damage:2}
});
const MAX_FAIL_MS=Math.max(...Object.values(TARGETS).map(t=>t.failMs));
function targetInfo(id){return typeof id==='string'&&Object.hasOwn(TARGETS,id)?TARGETS[id]:null;}
function targets(){
 return Object.fromEntries(Object.entries(TARGETS).map(([id,def])=>{
  const npc=VILLAGE.villagers.find(n=>n.id===id);
  return [id,{id,name:npc?.name||id,level:def.level,gold:def.gold,xp:def.xp}];
 }));
}
function restore(value,now=Date.now()){return Number.isFinite(value)?Math.max(0,Math.min(value,now+MAX_FAIL_MS)):0;}
function attempt(p,id,now=Date.now(),rng=Math.random){
 const target=targetInfo(id),npc=target&&VILLAGE.villagers.find(n=>n.id===id);
 if(!target||!npc||!p.loggedIn||p.hp<=0||dist(p,npc)>90||p.path?.length||p.intent||p.production||p.agility)return {ok:false,message:'Stand beside a valid target and stop other actions to pickpocket.'};
 const level=p.skills.thieving?.level||1;
 if(level<target.level)return {ok:false,message:'Requires Thieving level '+target.level+'.'};
 if(now<(p.nextThieve||0))return {ok:false,message:'Wait before attempting another pickpocket.'};
 const chance=Math.min(.9,target.baseChance+Math.max(0,level-target.level)*target.perLevel);
 if(rng()>=chance){
  p.nextThieve=now+target.failMs;p.hp=Math.max(1,p.hp-target.damage);
  return {ok:true,success:false,message:'Caught by '+npc.name+'! Lost up to '+target.damage+' HP (non-lethal). Wait '+Math.ceil(target.failMs/1000)+' seconds.'};
 }
 p.nextThieve=now+target.successMs;p.gold+=target.gold;addXp(p,'thieving',target.xp);
 if(p.quests)questProgress(p,'thieve',id,1);
 return {ok:true,success:true,message:'Pickpocket succeeded · +'+target.gold+' coins · +'+target.xp+' Thieving XP.'};
}
module.exports={TARGETS,MAX_FAIL_MS,targetInfo,targets,restore,attempt};
