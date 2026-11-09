'use strict';
const {QUESTS,RECIPES}=require('./progression');
const {VILLAGE,ENEMY_TEMPLATES,RESOURCE_TEMPLATES}=require('./content');
const {count}=require('./rules');
function targetFor(p,id){
 if(typeof id!=='string'||!Object.hasOwn(QUESTS,id)||p.quests[id]?.status!=='active')return null;
 const d=QUESTS[id],q=p.quests[id];
 const missing=Object.entries(d.deliverItems||{}).some(([item,qty])=>count(p.inventory,item)<qty);
 if(q.progress>=q.goal&&!missing||d.type==='talk'){
  const npc=VILLAGE.villagers.find(n=>n.id===d.giver);return npc?{x:npc.x,y:npc.y,label:'Return to '+npc.name,kind:'npc'}:null;
 }
 if(d.type==='craft'){
  const recipe=RECIPES[d.target],building=VILLAGE.buildings.find(b=>b.id===recipe?.station);
  if(building)return {x:building.door.x,y:building.door.y,label:recipe.name+' at '+building.name+'; bring ingredients',kind:'station'};
 }
 const template=d.type==='kill'?ENEMY_TEMPLATES.find(n=>n.kind===d.target):RESOURCE_TEMPLATES.find(n=>n.item===d.target);
 if(!template)return null;
 const [x1,y1,x2,y2]=template.region;
 return {x:(x1+x2)/2,y:(y1+y2)/2,bounds:{x:x1,y:y1,w:x2-x1,h:y2-y1},kind:'area',label:(d.type==='kill'?'Defeat ':'Gather from ')+template.name+' in the highlighted area'};
}
module.exports={targetFor};
