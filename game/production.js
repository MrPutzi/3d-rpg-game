'use strict';
const {RECIPES}=require('./progression');
const {stationReady,processRecipe}=require('./activities');
const {count,addItem,removeItem}=require('./rules');
const DURATION=1800,MAX_BATCH=28;
function requirements(p,id,now=Date.now()){
 const r=typeof id==='string'&&Object.hasOwn(RECIPES,id)?RECIPES[id]:null;
 if(!r)return 'Unknown activity.';
 if(!p.skills[r.skill]||p.skills[r.skill].level<r.level)return 'Requires '+r.skill+' level '+r.level+'.';
 if(!stationReady(p,r.station,now))return 'Visit the required station or region first.';
 if(r.requiresSlayerKills&&p.slayerKills<r.requiresSlayerKills)return 'Complete more Slayer kills first.';
 for(const [item,qty] of Object.entries(r.inputs))if(count(p.inventory,item)<qty)return 'Missing ingredients.';
 return null;
}
function availability(p,id,now=Date.now()){
 const reason=p.production?'Batch in progress':p.intent||p.path?.length?'Stop moving or fighting before production.':requirements(p,id,now);
 if(reason)return {max:0,reason};
 const r=RECIPES[id],inventory=p.inventory.map(e=>({...e}));let max=0,kills=p.slayerKills||0;
 for(let i=0;i<MAX_BATCH;i++){
  if(r.requiresSlayerKills&&kills<r.requiresSlayerKills)break;
  if(Object.entries(r.inputs).some(([item,qty])=>count(inventory,item)<qty))break;
  for(const [item,qty] of Object.entries(r.inputs))removeItem(inventory,item,qty);
  if(Object.entries(r.outputs).some(([item,qty])=>!addItem(inventory,item,qty)))break;
  max++;kills-=r.requiresSlayerKills||0;
 }
 return {max,reason:max?'':'Inventory cannot hold the output.'};
}
function options(p){return Object.fromEntries(Object.keys(RECIPES).map(id=>[id,availability(p,id)]));}
function start(p,id,qty=1,now=Date.now()){
 if(p.production)return {ok:false,message:'Already producing. Cancel the current batch first.'};
 if(qty!=='max'&&(!Number.isSafeInteger(qty)||qty<1||qty>MAX_BATCH))return {ok:false,message:'Choose 1–28 actions.'};
 if(p.intent||p.path?.length)return {ok:false,message:'Stop moving or fighting before production.'};
 const available=availability(p,id,now);if(!available.max)return {ok:false,message:available.reason};
 if(qty==='max')qty=available.max;
 // No ingredients/XP are changed before a full action duration elapses.
 p.production={id,total:qty,remaining:qty,completed:0,startedAt:now,endsAt:Math.max(now+DURATION,p.nextSkillAction||0)};
 return {ok:true,message:'Started '+RECIPES[id].name+' ×'+qty+'.'};
}
function cancel(p){if(!p.production)return false;p.production=null;return true;}
function advance(p,now=Date.now()){
 const job=p.production;if(!job)return null;
 if(p.intent||p.path?.length||!stationReady(p,RECIPES[job.id].station,now)){
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
module.exports={start,advance,cancel,requirements,availability,options,DURATION,MAX_BATCH};
