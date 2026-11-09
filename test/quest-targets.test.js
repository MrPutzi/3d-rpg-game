'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {targetFor}=require('../game/quest-targets'),{QUESTS}=require('../game/progression'),{WORLD_SIZE}=require('../game/content');
const player=()=>({inventory:[],quests:Object.fromEntries(Object.entries(QUESTS).map(([id,d])=>[id,{status:'active',progress:0,goal:d.goal}]))});
test('all existing quests resolve real objective locations inside world bounds',()=>{
 const p=player();for(const id of Object.keys(QUESTS)){const t=targetFor(p,id);assert.ok(t,id);assert.ok(t.x>=0&&t.y>=0&&t.x<WORLD_SIZE&&t.y<WORLD_SIZE);}
 assert.equal(targetFor(p,'goblin_hunt').kind,'area');assert.equal(targetFor(p,'first_catch').bounds.y,1600);
});
test('completion redirects to giver; missing cooked deliveries retain the cooking station',()=>{
 const p=player();p.quests.cooked_supplies.progress=3;assert.equal(targetFor(p,'cooked_supplies').kind,'station');
 p.inventory=[{id:'cooked_shrimp',qty:3}];assert.equal(targetFor(p,'cooked_supplies').kind,'npc');
 p.quests.goblin_hunt.progress=3;assert.match(targetFor(p,'goblin_hunt').label,/Elder/);
});
test('locked/complete/invalid quests have no target and player progress is isolated',()=>{
 const a=player(),b=player();
 a.quests.goblin_hunt.progress=3;assert.equal(targetFor(a,'goblin_hunt').kind,'npc');assert.equal(targetFor(b,'goblin_hunt').kind,'area');
 for(const status of ['locked','complete']){a.quests.goblin_hunt.status=status;assert.equal(targetFor(a,'goblin_hunt'),null);}
 for(const id of ['__proto__','nope',null])assert.equal(targetFor(a,id),null);
});
