'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ITEMS,VILLAGE,SHOPS,ENEMY_TEMPLATES,WORLD_SIZE}=require('../game/content');
const {SKILLS,RECIPES,QUESTS,DROPS,REGIONS,rollDrops}=require('../game/progression');
const {skill,addItem,count,makePath}=require('../game/rules');
const {processRecipe,questProgress,turnInQuest}=require('../game/activities');
const Economy=require('../game/economy');
function player(){
 return {x:380,y:380,gold:1200,inventory:[],bank:[],slayerKills:0,nextSkillAction:0,openBuilding:null,
 skills:Object.fromEntries(SKILLS.map(k=>[k,skill()])),
 quests:Object.fromEntries(Object.entries(QUESTS).map(([id,q])=>[id,{status:q.after?'locked':'active',progress:0,goal:q.goal}]))};
}
test('all enemy kinds have valid weighted loot and all regions fit world bounds',()=>{
 assert.equal(SKILLS.length,23);
 for(const d of ENEMY_TEMPLATES){
  assert.ok(DROPS[d.kind]?.length>0,d.kind+' has no drops');
  for(const loot of DROPS[d.kind]){
   assert.ok(ITEMS[loot.id],loot.id+' missing catalogue entry');
   assert.ok(loot.chance>0&&loot.chance<=1);
  }
 }
 for(const region of REGIONS){
  assert.ok(region.x>=0&&region.y>=0);
  assert.ok(region.x+region.w<=WORLD_SIZE&&region.y+region.h<=WORLD_SIZE);
 }
 for(const building of VILLAGE.buildings){
  assert.ok(makePath({x:380,y:380},building.door).length>0,building.id+' cannot be reached');
 }
});
test('quest chain ties village NPCs to kills and resource gathering',()=>{
 const p=player();
 assert.equal(p.quests.goblin_hunt.status,'locked');
 questProgress(p,'talk','elder');
 const first=turnInQuest(p,'welcome','elder');
 assert.equal(first.ok,true);
 assert.equal(p.quests.goblin_hunt.status,'active');
 assert.equal(p.quests.forest_supplies.status,'active');
 questProgress(p,'gather','logs',5);
 assert.equal(p.quests.forest_supplies.progress,5);
 assert.equal(turnInQuest(p,'forest_supplies','forester').ok,true);
 assert.equal(count(p.inventory,'guam_seed'),2);
 questProgress(p,'kill','goblin',3);
 assert.equal(turnInQuest(p,'goblin_hunt','elder').ok,true);
 assert.equal(p.quests.wilds_patrol.status,'active');
});
test('smithing consumes ore and mints bar only near forge',()=>{
 const p=player();addItem(p.inventory,'copper_ore');addItem(p.inventory,'tin_ore');
 assert.equal(processRecipe(p,'smelt_bronze').ok,false);
 const forge=VILLAGE.buildings.find(b=>b.id==='forge');p.x=forge.door.x;p.y=forge.door.y;p.openBuilding='forge';
 const result=processRecipe(p,'smelt_bronze',Date.now()+5000);
 assert.equal(result.ok,true);assert.equal(count(p.inventory,'bronze_bar'),1);
 assert.equal(count(p.inventory,'copper_ore'),0);
 assert.equal(p.skills.smithing.xp,55);
});
test('woodcutting, cooking and prayer activities require inputs and grant XP',()=>{
 const p=player();addItem(p.inventory,'logs');
 assert.equal(processRecipe(p,'firemaking_logs',5000).ok,true);
 assert.equal(p.skills.firemaking.xp,40);
 addItem(p.inventory,'raw_shrimp');p.x=250;p.y=330;p.openBuilding='tavern';
 assert.equal(processRecipe(p,'cook_shrimp',8000).ok,true);
 assert.equal(count(p.inventory,'cooked_shrimp'),1);
 addItem(p.inventory,'bones');p.openBuilding=null;
 assert.equal(processRecipe(p,'bury_bones',11000).ok,true);
 assert.equal(p.skills.prayer.xp,45);
});
test('merchant has finite stock, bounded prices, and buy/sell currency sinks',()=>{
 const p=player();const id='bronze_dagger',shop='forge';
 const initial=Economy.getStock(shop,id),price=Economy.price(shop,id);
 assert.equal(Economy.buy(p,shop,id,1).ok,true);
 assert.equal(count(p.inventory,id),1);
 assert.equal(Economy.getStock(shop,id),initial-1);
 assert.ok(p.gold<1200);
 assert.equal(Economy.sell(p,shop,id,1).ok,true);
 assert.equal(count(p.inventory,id),0);
 assert.ok(p.gold<1200);
 assert.ok(Economy.price(shop,id)>=price*.7);
 Economy.restock();
 assert.equal(Economy.getStock(shop,id),initial);
});
