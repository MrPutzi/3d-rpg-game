'use strict';
const {RECIPES}=require('./progression');
const {stationReady,processRecipe}=require('./activities');
const {count}=require('./rules');
const DURATION=1800,MAX_BATCH=28;
function requirements(p,id){
 const r=typeof id==='string'&&Object.hasOwn(RECIPES,id)?RECIPES[id]:null;
 if(!r)return 'Unknown activity.';
 if(!p.skills[r.skill]||p.skills[r.skill].level<r.level)return 'Requires '+r.skill+' level '+r.level+'.';
 if(!stationReady(p,r.station))return 'Visit the required station or region first.';
 if(r.requiresSlayerKills&&p.slayerKills<r.requiresSlayerKills)return 'Complete more Slayer kills first.';
 for(const [item,qty] of Object.entries(r.inputs))if(count(p.inventory,item)<qty)return 'Missing ingredients.';
 return null;
}
function start(p,id,qty=1,now=Date.now()){
 if(p.production)return {ok:false,message:'Already producing. Cancel the current batch first.'};
 if(!Number.isSafeInteger(qty)||qty<1||qty>MAX_BATCH)return {ok:false,message:'Choose 1–28 actions.'};
 if(p.intent||p.path?.length)return {ok:false,message:'Stop moving or fighting before production.'};
 const reason=requirements(p,id);if(reason)return {ok:false,message:reason};
 // No ingredients/XP are changed before a full action duration elapses.
 p.production={id,total:qty,remaining:qty,completed:0,startedAt:now,endsAt:Math.max(now+DURATION,p.nextSkillAction||0)};
 return {ok:true,message:'Started '+RECIPES[id].name+' ×'+qty+'.'};
}
function cancel(p){if(!p.production)return false;p.production=null;return true;}
function advance(p,now=Date.now()){
 const job=p.production;if(!job)return null;
 if(p.intent||p.path?.length||!stationReady(p,RECIPES[job.id].station)){
  cancel(p);return {ok:false,message:'Production interrupted by movement or another action.'};
 }
 if(now<job.endsAt)return null;
 const result=processRecipe(p,job.id,now);
 if(!result.ok){cancel(p);return result;}
 job.remaining--;job.completed++;
 if(job.remaining===0)cancel(p);
 else {job.startedAt=now;job.endsAt=now+DURATION;}
 // At most one completion per tick, even after long server stalls.
 return result;
}
module.exports={start,advance,cancel,requirements,DURATION,MAX_BATCH};
