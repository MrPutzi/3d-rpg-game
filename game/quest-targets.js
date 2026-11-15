'use strict';
const {QUESTS,RECIPES,DROPS}=require('./progression');
const {VILLAGE,ENEMY_TEMPLATES,RESOURCE_TEMPLATES,ITEMS}=require('./content');
const {count}=require('./rules');
const {stationLocation}=require('./stations');
function area(template,label){
 const [x1,y1,x2,y2]=template.region;
 return {x:(x1+x2)/2,y:(y1+y2)/2,bounds:{x:x1,y:y1,w:x2-x1,h:y2-y1},kind:'area',label};
}
function bankTarget(p,item){
 if(count(p.bank||[],item)<1)return null;
 const bank=VILLAGE.buildings.find(b=>b.id==='bank');
 return bank?{x:bank.door.x,y:bank.door.y,kind:'station',label:'Withdraw '+ITEMS[item].name+' from '+bank.name}:null;
}
function recipeTarget(p,id,visited=new Set()){
 if(visited.has(id)||visited.size>=8)return null;
 const recipe=RECIPES[id];if(!recipe)return null;
 visited.add(id);
 for(const [item,qty] of Object.entries(recipe.inputs)){
  if(count(p.inventory,item)>=qty)continue;
  const bank=bankTarget(p,item);if(bank)return bank;
  const resource=RESOURCE_TEMPLATES.find(r=>r.item===item);
  if(resource)return area(resource,'Gather '+ITEMS[item].name+' from '+resource.name+' · '+resource.skill+' Lv'+resource.level);
  const intermediate=Object.keys(RECIPES).find(key=>RECIPES[key].outputs[item]>0);
  if(intermediate){const target=recipeTarget(p,intermediate,new Set(visited));if(target)return target;}
  const enemy=ENEMY_TEMPLATES.find(e=>DROPS[e.kind]?.some(d=>d.id===item));
  if(enemy)return area(enemy,'Defeat '+enemy.name+' for a chance of '+ITEMS[item].name);
 }
 if(recipe.station==='any'&&Number.isFinite(p.x)&&Number.isFinite(p.y))return {x:p.x,y:p.y,kind:'activity',label:recipe.name+' here · '+recipe.skill+' Lv'+recipe.level};
 const site=Object.hasOwn(stationLocation,recipe.station)?stationLocation[recipe.station]:null;
 if(site)return {...site,kind:'station',label:recipe.name+' at '+recipe.station+' · '+recipe.skill+' Lv'+recipe.level};
 const building=VILLAGE.buildings.find(b=>b.id===recipe.station);
 return building?{x:building.door.x,y:building.door.y,label:recipe.name+' at '+building.name+' · '+recipe.skill+' Lv'+recipe.level,kind:'station'}:null;
}
function targetFor(p,id){
 if(typeof id!=='string'||!Object.hasOwn(QUESTS,id)||p.quests[id]?.status!=='active')return null;
 const d=QUESTS[id],q=p.quests[id];
 const missing=Object.entries(d.deliverItems||{}).some(([item,qty])=>count(p.inventory,item)<qty);
 if(q.progress>=q.goal&&!missing||d.type==='talk'){
  const npc=VILLAGE.villagers.find(n=>n.id===d.giver);return npc?{x:npc.x,y:npc.y,label:'Return to '+npc.name,kind:'npc'}:null;
 }
 if(d.type==='craft'){
  if(q.progress>=q.goal)for(const [item,qty] of Object.entries(d.deliverItems||{})){
   if(count(p.inventory,item)<qty){const bank=bankTarget(p,item);if(bank)return bank;}
  }
  const target=recipeTarget(p,d.target);if(target)return target;
 }
 const template=d.type==='kill'?ENEMY_TEMPLATES.find(n=>n.kind===d.target):RESOURCE_TEMPLATES.find(n=>n.item===d.target);
 if(!template)return null;
 const [x1,y1,x2,y2]=template.region;
 return {x:(x1+x2)/2,y:(y1+y2)/2,bounds:{x:x1,y:y1,w:x2-x1,h:y2-y1},kind:'area',label:(d.type==='kill'?'Defeat ':'Gather from ')+template.name+' in the highlighted area'};
}
module.exports={targetFor};
