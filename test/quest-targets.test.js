'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {targetFor}=require('../game/quest-targets'),{QUESTS}=require('../game/progression'),{WORLD_SIZE}=require('../game/content');
const player=()=>({inventory:[],quests:Object.fromEntries(Object.entries(QUESTS).map(([id,d])=>[id,{status:'active',progress:0,goal:d.goal}]))});
test('all existing quests resolve real objective locations inside world bounds',()=>{
 const p=player();for(const id of Object.keys(QUESTS)){const t=targetFor(p,id);assert.ok(t,id);assert.ok(t.x>=0&&t.y>=0&&t.x<WORLD_SIZE&&t.y<WORLD_SIZE);}
 assert.equal(targetFor(p,'goblin_hunt').kind,'area');assert.equal(targetFor(p,'first_catch').bounds.y,1600);
});
test('completion redirects to giver; missing cooked deliveries guide gathering first',()=>{
 const p=player();p.quests.cooked_supplies.progress=3;assert.equal(targetFor(p,'cooked_supplies').kind,'area');
 p.inventory=[{id:'cooked_shrimp',qty:3}];assert.equal(targetFor(p,'cooked_supplies').kind,'npc');
 p.quests.goblin_hunt.progress=3;assert.match(targetFor(p,'goblin_hunt').label,/Elder/);
});
test('locked/complete/invalid quests have no target and player progress is isolated',()=>{
 const a=player(),b=player();
 a.quests.goblin_hunt.progress=3;assert.equal(targetFor(a,'goblin_hunt').kind,'npc');assert.equal(targetFor(b,'goblin_hunt').kind,'area');
 for(const status of ['locked','complete']){a.quests.goblin_hunt.status=status;assert.equal(targetFor(a,'goblin_hunt'),null);}
 for(const id of ['__proto__','nope',null])assert.equal(targetFor(a,id),null);
});
test('iron delivery guide follows ore, smelting, forging and the Guard without changing state',()=>{
 const p=player();let before=JSON.stringify(p);assert.match(targetFor(p,'iron_supplies').label,/Iron ore/);assert.equal(JSON.stringify(p),before);
 p.inventory=[{id:'iron_ore',qty:1}];assert.match(targetFor(p,'iron_supplies').label,/Smelt iron bar/);
 p.inventory=[{id:'iron_bar',qty:1}];assert.match(targetFor(p,'iron_supplies').label,/Smith iron dagger/);
 p.quests.iron_supplies.progress=2;p.inventory=[{id:'iron_dagger',qty:2}];assert.equal(targetFor(p,'iron_supplies').kind,'npc');
});
test('banked ingredients and completed deliveries guide withdrawal but cannot bypass crafting',()=>{
 const a=player(),b=player();a.bank=[{id:'iron_bar',qty:1}];assert.match(targetFor(a,'iron_supplies').label,/Withdraw Iron bar/);assert.equal(targetFor(b,'iron_supplies').kind,'area');
 a.bank=[{id:'iron_dagger',qty:2}];assert.equal(targetFor(a,'iron_supplies').kind,'area');
 a.quests.iron_supplies.progress=2;assert.match(targetFor(a,'iron_supplies').label,/Withdraw Iron Dagger/);
 a.inventory=[{id:'iron_dagger',qty:2}];assert.equal(targetFor(a,'iron_supplies').kind,'npc');
});
test('leather quest distinguishes random drops from guaranteed gathering',()=>{
 const p=player();assert.match(targetFor(p,'patrol_boots').label,/chance of Leather/);
 p.inventory=[{id:'leather',qty:1}];assert.match(targetFor(p,'patrol_boots').label,/Craft leather boots/);
});

test('rabbit provision guide follows hunt, cooking, then Rusk independently',()=>{
 const a=player(),b=player(),before=JSON.stringify(b);
 a.inventory=[{id:'rabbit_snare',qty:1}];
 const target=targetFor(a,'patrol_provisions');
 assert.equal(target.x,2520);assert.equal(target.y,2050);assert.match(target.label,/hunt/);
 a.inventory=[{id:'raw_rabbit',qty:1}];assert.match(targetFor(a,'patrol_provisions').label,/Roast rabbit/);
 assert.equal(JSON.stringify(b),before);assert.match(targetFor(b,'patrol_provisions').label,/Gather Logs/);
 a.inventory=[{id:'cooked_rabbit',qty:3}];a.quests.patrol_provisions.progress=3;
 assert.equal(targetFor(a,'patrol_provisions').kind,'npc');
});

test('new Thieving and marsh-herb quests point to their actual NPC and supply chain',()=>{
 const p=player();
 p.quests.quiet_hands={status:'active',progress:0,goal:3};
 const thief=targetFor(p,'quiet_hands');
 assert.equal(thief.kind,'npc');assert.equal(thief.x,2840);assert.equal(thief.y,1325);
 p.quests.marsh_remedies={status:'active',progress:0,goal:2};
 const source=targetFor(p,'marsh_remedies');
 assert.equal(source.kind,'area');assert.match(source.label,/Swamp Troll/);
 p.inventory=[{id:'marentill_seed',qty:1}];
 const farm=targetFor(p,'marsh_remedies');
 assert.equal(farm.kind,'station');assert.equal(farm.x,1010);assert.equal(farm.y,890);
});
