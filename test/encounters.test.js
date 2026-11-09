'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../game/encounters');
const npc=()=>({id:'goblin',name:'Goblin',kind:'goblin',level:3,hp:0,maxHp:100,x:0,y:0});
const player=id=>({id,loggedIn:true,hp:10,x:0,y:0});
test('one conserved coin budget and highest-contributor loot owner, regardless of final hit',()=>{
 const n=npc(),players={a:player('a'),b:player('b'),c:player('c')};
 E.record(n,players.a,70,100);E.record(n,players.b,29,100);E.record(n,players.c,1,100);
 const result=E.settle(n,players,100);
 assert.equal(result.ownerId,'a');assert.deepEqual(result.rewards.map(r=>r.id),['a','b']);
 assert.equal(result.rewards.reduce((n,r)=>n+r.gold,0),6);assert.equal(E.settle(n,players,100),null);
});
test('offline, distant, dead and stale contributors cannot receive credit',()=>{
 for(const mode of ['offline','distance','dead','stale']){
  const n=npc(),p=player('a');E.record(n,p,100,100);
  if(mode==='offline')p.loggedIn=false;if(mode==='distance')p.x=321;if(mode==='dead')p.hp=0;
  const result=E.settle(n,{a:p},mode==='stale'?30101:100);
  assert.deepEqual(result.rewards,[]);assert.equal(result.ownerId,null);
 }
});
test('respawn clears old contributions and permits one new reward',()=>{
 const n=npc(),a=player('a'),b=player('b');E.record(n,a,100,100);E.settle(n,{a,b},100);
 E.record(n,b,100,101);assert.equal(E.contribution(n,'b'),0);
 E.reset(n);assert.equal(E.contribution(n,'a'),0);n.hp=1;assert.equal(E.settle(n,{a,b},200),null);
 n.hp=0;E.record(n,b,100,200);assert.equal(E.settle(n,{a,b},200).ownerId,'b');
});
test('ties are deterministic and rounding never mints extra coins',()=>{
 for(let size=1;size<=15;size++){
  const n=npc(),players={};n.maxHp=size;
  for(let i=0;i<size;i++){const id=String(i).padStart(2,'0');players[id]=player(id);E.record(n,players[id],1,0);}
  const result=E.settle(n,players,0);assert.equal(result.ownerId,'00');assert.equal(result.rewards.reduce((s,r)=>s+r.gold,0),6);
  assert.ok(result.rewards.every(r=>Number.isInteger(r.gold)&&r.gold>=0));
 }
});
test('target report exposes only own damage and zero damage creates no claim',()=>{
 const n=npc(),a=player('a'),b=player('b');n.hp=50;E.record(n,a,NaN,0);E.record(n,a,0,0);E.record(n,b,30,0);
 const report=E.target(n,a,{a,b},0);assert.equal(report.damage,0);assert.equal(report.qualifies,false);assert.equal(report.minimumDamage,10);
 assert.equal(JSON.stringify(n).includes('damage'),false);
});

test('death removes contribution even after immediate respawn',()=>{
 const E=require('../game/encounters'),n={hp:10,maxHp:10,level:3,x:0,y:0},p={id:'dead',loggedIn:true,hp:20,x:0,y:0};
 E.record(n,p,8,100);E.forget(n,p.id);n.hp=1;
 assert.equal(E.target(n,p,{dead:p},101)?.qualifies,false);
 n.hp=0;assert.deepEqual(E.settle(n,{dead:p},101).rewards,[]);
});
