'use strict';
const {RECIPES,QUESTS}=require('./progression');
const {ITEMS,VILLAGE}=require('./content');
const {dist,count,addItem,removeItem,addXp}=require('./rules');
const stationLocation={altar:{x:1370,y:1390},farm:{x:1010,y:890},hunt:{x:2520,y:2050},course:{x:530,y:760}};
function stationReady(p,station){
 if(station==='any')return true;
 if(['forge','tavern','guild'].includes(station)){
  const b=VILLAGE.buildings.find(x=>x.id===station);
  return !!b&&p.openBuilding===station&&dist(p,b.door)<=110;
 }
 if(station==='village')return p.x<=850&&p.y<=850;
 return !!stationLocation[station]&&dist(p,stationLocation[station])<=120;
}
function questProgress(p,type,target,qty=1){
 const updated=[];
 for(const [id,q] of Object.entries(p.quests)){
  const def=QUESTS[id];if(!def||q.status!=='active'||def.type!==type||def.target!==target)continue;
  q.progress=Math.min(q.goal,q.progress+qty);updated.push({id,progress:q.progress,goal:q.goal});
 }
 return updated;
}
function activateAvailable(p,finished){
 for(const [id,def] of Object.entries(QUESTS)){
  if(def.after===finished&&p.quests[id]?.status==='locked')p.quests[id].status='active';
 }
}
function turnInQuest(p,id,npcId){
 const def=QUESTS[id],q=p.quests[id];if(!def||!q||q.status!=='active'||q.progress<q.goal)return null;
 const giver={welcome:'elder',goblin_hunt:'elder',forest_supplies:'forester',first_catch:'fisher',wilds_patrol:'ranger'}[id];
 if(giver!==npcId)return null;
 const future=p.inventory.map(x=>({...x}));
 for(const [item,qty] of Object.entries(def.rewardItems||{}))if(!addItem(future,item,qty))return {ok:false,message:'Free inventory slots before claiming your reward.'};
 p.inventory=future;p.gold+=def.rewardGold||0;q.status='complete';activateAvailable(p,id);
 return {ok:true,message:'Quest completed: '+def.name+' · +'+(def.rewardGold||0)+' coins!'};
}
function processRecipe(p,id,now=Date.now()){
 const rec=RECIPES[id];if(!rec)return {ok:false,message:'Unknown activity.'};
 if(p.nextSkillAction&&now<p.nextSkillAction)return {ok:false,message:'Wait for the next action tick.'};
 if(!stationReady(p,rec.station))return {ok:false,message:'Visit the required station or region first.'};
 if(p.skills[rec.skill]?.level<rec.level)return {ok:false,message:'Requires '+rec.skill+' level '+rec.level+'.'};
 if(rec.requiresSlayerKills&&p.slayerKills<rec.requiresSlayerKills)return {ok:false,message:'Defeat '+rec.requiresSlayerKills+' creatures for the Slayer task first.'};
 for(const [item,qty] of Object.entries(rec.inputs))if(count(p.inventory,item)<qty)return {ok:false,message:'Missing '+ITEMS[item]?.name+'.'};
 const candidate=p.inventory.map(e=>({...e}));
 for(const [item,qty] of Object.entries(rec.inputs))removeItem(candidate,item,qty);
 for(const [item,qty] of Object.entries(rec.outputs))if(!addItem(candidate,item,qty))return{ok:false,message:'Inventory full.'};
 p.inventory=candidate;p.gold+=rec.gold||0;
 addXp(p,rec.skill,rec.xp);
 p.nextSkillAction=now+1800;
 if(rec.requiresSlayerKills)p.slayerKills-=rec.requiresSlayerKills;
 return{ok:true,message:rec.name+' · +'+rec.xp+' '+rec.skill+' XP'+(rec.gold?' · +'+rec.gold+' coins':'')};
}
module.exports={stationReady,stationLocation,questProgress,activateAvailable,turnInQuest,processRecipe};
