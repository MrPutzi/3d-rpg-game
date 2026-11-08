'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {ITEMS,VILLAGE}=require('../game/content');
const R=require('../game/rules');
function player(){
 return {inventory:[],equipment:{weapon:null,offhand:null,ammo:null},combatStyle:'accurate',
 skills:Object.fromEntries(['attack','strength','defence','ranging','hitpoints'].map(k=>[k,{xp:0,level:1}]))};
}
test('canonical Old School XP thresholds',()=>{
 assert.equal(R.xpForLevel(2),83);
 assert.equal(R.xpForLevel(10),1154);
 assert.equal(R.xpForLevel(99),13034431);
 assert.equal(R.levelForXp(13034431),99);
});
test('weapon speed and combat styles derive from category',()=>{
 assert.equal(ITEMS.bronze_scimitar.speed,4);
 assert.equal(ITEMS.bronze_longsword.speed,5);
 assert.equal(ITEMS.bronze_battleaxe.speed,6);
 assert.equal(ITEMS.bronze_two_handed.speed,7);
 assert.equal(ITEMS.shortbow.styles.includes('rapid'),true);
});
test('inventory handles stacks, 28 slot limit and removal',()=>{
 const p=player();
 assert.equal(R.addItem(p.inventory,'bronze_arrow',120),true);
 assert.equal(R.count(p.inventory,'bronze_arrow'),120);
 assert.equal(R.addItem(p.inventory,'bronze_arrow',20),true);
 assert.equal(p.inventory.length,1);
 assert.equal(R.removeItem(p.inventory,'bronze_arrow',25),true);
 assert.equal(R.count(p.inventory,'bronze_arrow'),115);
 assert.equal(R.addItem(p.inventory,'bread',27),true);
 assert.equal(p.inventory.length,28);
 assert.equal(R.addItem(p.inventory,'bread'),false);
 assert.equal(R.addItem(p.inventory,'bronze_arrow',3),true);
 assert.equal(R.count(p.inventory,'bronze_arrow'),118);
});
test('equipping requires combat level and respects two-handed weapon restrictions',()=>{
 const p=player();
 for(const id of ['bronze_scimitar','rune_scimitar','bronze_shield','bronze_two_handed'])R.addItem(p.inventory,id);
 assert.equal(R.equip(p,'rune_scimitar').ok,false);
 assert.equal(R.equip(p,'bronze_scimitar').ok,true);
 assert.equal(R.equip(p,'bronze_shield').ok,true);
 assert.equal(R.equip(p,'bronze_two_handed').ok,true);
 assert.equal(p.equipment.offhand,null);
 assert.equal(R.equip(p,'bronze_shield').ok,false);
});
test('ammo, attack speed and XP routing reflect selected style',()=>{
 const p=player();
 R.addItem(p.inventory,'shortbow');R.addItem(p.inventory,'bronze_arrow',20);
 assert.equal(R.equip(p,'shortbow').ok,true);
 assert.equal(R.equip(p,'bronze_arrow').ok,true);
 assert.equal(p.combatStyle,'rapid');
 assert.equal(R.attackDelayMs(p),3*600);
 R.awardCombatXp(p,10);
 assert.equal(p.skills.ranging.xp,40);
 p.combatStyle='longrange';
 R.awardCombatXp(p,10);
 assert.equal(p.skills.ranging.xp,60);
 assert.equal(p.skills.defence.xp,20);
 assert.equal(R.attackRange(p)>210,true);
});
test('all village entrances can be reached without passing through structures',()=>{
 for(const building of VILLAGE.buildings){
  assert.equal(R.collides(building.door),false,building.id+' entrance blocked');
  assert.ok(R.makePath({x:380,y:380},building.door).length>0,building.id+' unreachable');
 }
});
test('combat roll returns bounded damage against stronger foes',()=>{
 const p=player();R.addItem(p.inventory,'bronze_scimitar');R.equip(p,'bronze_scimitar');
 const result=R.combatRoll(p,{defence:200,weakness:'stab'},()=>0.5);
 assert.ok(result.maxHit>=1);
 assert.ok(result.accuracy>0&&result.accuracy<1);
 assert.ok(result.hit>=0&&result.hit<=result.maxHit);
});
