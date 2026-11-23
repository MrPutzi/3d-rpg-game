'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../game/slayer'),E=require('../game/encounters'),{VILLAGE}=require('../game/content'),{skill}=require('../game/rules');
const player=id=>({id,loggedIn:true,hp:20,...VILLAGE.buildings.find(b=>b.id==='guild').door,openBuilding:'guild',skills:{slayer:skill()},slayerKills:9,path:[]});
test('accept requires guild and idle living player, does not spend legacy credits or reset tasks',()=>{
 const p=player('a');p.openBuilding=null;assert.equal(S.accept(p).ok,false);p.openBuilding='guild';p.production={};assert.equal(S.accept(p).ok,false);p.production=null;
 assert.equal(S.accept(p).ok,true);assert.equal(p.slayerKills,9);S.record(p,'wolf');assert.equal(S.accept(p).ok,false);assert.equal(p.slayerTask.kills,1);
 assert.equal(S.record(p,'rat'),false);assert.equal(S.claim(p).ok,false);assert.equal(p.skills.slayer.xp,0);
});
test('shared encounter gives eligible participants one task credit and excludes spectator/repeated settlement',()=>{
 const a=player('a'),b=player('b'),c=player('c'),players={a,b,c};for(const p of Object.values(players))S.accept(p);
 const n={x:a.x,y:a.y,hp:0,maxHp:20,level:3};E.record(n,a,15,100);E.record(n,b,5,100);
 const result=E.settle(n,players,100);for(const r of result.rewards)S.record(players[r.id],'wolf');
 assert.equal(a.slayerTask.kills,1);assert.equal(b.slayerTask.kills,1);assert.equal(c.slayerTask.kills,0);assert.equal(E.settle(n,players,100),null);
});
test('completed task caps progress, claims XP only once at guild and preserves old credit',()=>{
 const p=player('a');S.accept(p);for(let i=0;i<5;i++)assert.equal(S.record(p,'wolf'),true);
 assert.equal(p.slayerTask.kills,3);assert.equal(S.status(p).ready,true);p.x+=200;assert.equal(S.claim(p).ok,false);p.x-=200;
 assert.equal(S.claim(p).ok,true);assert.equal(p.skills.slayer.xp,65);assert.equal(p.slayerKills,9);assert.equal(S.claim(p).ok,false);assert.equal(S.accept(p).ok,true);assert.equal(p.slayerTask.kills,0);
});
test('saved task validates and copies progress without granting client-supplied goals or rewards',()=>{
 const value={kind:'wolf',kills:2,xp:999,goal:0};assert.deepEqual(S.restore(value),{kind:'wolf',kills:2});
 const p=player('a');p.slayerTask=S.restore(value);value.kills=3;assert.equal(p.slayerTask.kills,2);const view=S.status(p);view.kills=3;assert.equal(p.slayerTask.kills,2);
 for(const v of [null,{}, {kind:'rat',kills:2},{kind:'wolf',kills:-1},{kind:'wolf',kills:4},{kind:'wolf',kills:1.5}])assert.equal(S.restore(v),null);
});
test('panel shows assigned progress and separate legacy credits',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');const ctx=vm.createContext({});vm.runInContext(source.match(/function slayerText\(task,legacy\)\{[^\n]+\}/)[0],ctx);
 assert.match(ctx.slayerText(null,9),/Legacy wolf credits: 9/);assert.match(ctx.slayerText({kills:2,goal:3,ready:false},0),/Wolves 2\/3/);assert.match(ctx.slayerText({kills:3,goal:3,ready:true,xp:65},0),/claim 65 XP/);
});
