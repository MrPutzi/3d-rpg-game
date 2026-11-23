'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../game/slayer'),{VILLAGE,ENEMY_TEMPLATES}=require('../game/content'),{skill}=require('../game/rules');
const player=level=>({loggedIn:true,hp:20,...VILLAGE.buildings.find(b=>b.id==='guild').door,openBuilding:'guild',skills:{slayer:{...skill(),level}},path:[],slayerKills:8});
test('contract selection validates ids and level boundaries without altering active tasks',()=>{
 for(const [kind,level] of [['skeleton',5],['bandit',10]]){
  const p=player(level-1);assert.equal(S.accept(p,kind).ok,false);assert.equal(p.slayerTask,undefined);
  p.skills.slayer.level=level;assert.equal(S.accept(p,kind).ok,true);assert.equal(S.accept(p,'wolf').ok,false);assert.equal(p.slayerTask.kind,kind);
 }
 for(const id of ['__proto__','constructor','rat',null,{},1])assert.equal(S.accept(player(99),id).ok,false);
 assert.equal(S.accept(player(1)).ok,true);
 assert.deepEqual(S.options(player(5)).map(o=>o.available),[true,true,false]);
});
test('each target uses its own region and reward; other species and players cannot advance it',()=>{
 const a=player(10),b=player(10);S.accept(a,'skeleton');S.accept(b,'bandit');
 assert.equal(S.record(a,'wolf'),false);assert.equal(S.record(a,'bandit'),false);assert.equal(b.slayerTask.kills,0);
 for(const [p,kind,xp] of [[a,'skeleton',100],[b,'bandit',140]]){
  const region=ENEMY_TEMPLATES.find(n=>n.kind===kind).region,view=S.status(p);assert.equal(view.target.x,(region[0]+region[2])/2);
  for(let i=0;i<4;i++)S.record(p,kind);assert.equal(S.status(p).goal,3);assert.equal(S.claim(p).ok,true);assert.equal(p.skills.slayer.xp,xp);assert.equal(p.slayerKills,8);assert.equal(S.claim(p).ok,false);
 }
});
test('tier snapshots restore canonical rewards and retain original wolf task compatibility',()=>{
 for(const kind of ['wolf','skeleton','bandit']){
  const p=player(1);p.slayerTask=S.restore({kind,kills:2,xp:999,goal:0});assert.deepEqual(p.slayerTask,{kind,kills:2});assert.equal(S.status(p).ready,false);assert.notEqual(S.status(p).xp,999);
 }
});
