'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {cast,WIND_STRIKE}=require('../game/magic'),P=require('../game/production');
const {SKILLS}=require('../game/progression'),{skill,addItem,count}=require('../game/rules');
function player(){return {loggedIn:true,hp:20,x:1370,y:1390,gold:0,path:[],intent:null,quests:{},inventory:[],skills:Object.fromEntries(SKILLS.map(k=>[k,skill()]))};}
function supplied(){const p=player();addItem(p.inventory,'air_rune',5);addItem(p.inventory,'mind_rune',5);return p;}
const enemy=()=>({hp:10,x:1370,y:1390});
test('air training unlocks mind runes and crafted runes fuel authoritative magic',()=>{
 const p=player();addItem(p.inventory,'rune_essence',4);assert.equal(P.start(p,'craft_mind_runes',1,0).ok,false);
 for(let i=0;i<3;i++){assert.equal(P.start(p,'craft_air_runes',1,i*2000).ok,true);assert.equal(P.advance(p,i*2000+1800).ok,true);}
 assert.equal(p.skills.runecrafting.level,2);assert.equal(P.start(p,'craft_mind_runes',1,6000).ok,true);P.advance(p,7800);
 assert.equal(count(p.inventory,'mind_rune'),3);assert.equal(count(p.inventory,'rune_essence'),0);
 const n=enemy(),result=cast(p,n,8000,()=>.99);assert.equal(result.damage,4);assert.equal(n.hp,6);assert.equal(count(p.inventory,'mind_rune'),2);assert.equal(count(p.inventory,'air_rune'),14);assert.equal(p.skills.magic.xp,14);
});
test('rejected casts preserve inventory, XP, cooldown and production',()=>{
 for(const mutate of [p=>p.hp=0,p=>p.loggedIn=false,p=>p.inventory=[],p=>p.nextAttack=2000,p=>p.x=0]){
  const p=supplied();p.production={id:'craft_air_runes'};mutate(p);const n=enemy(),before=JSON.stringify(p);
  assert.equal(cast(p,n,1000).ok,false);assert.equal(JSON.stringify(p),before);assert.equal(n.hp,10);
 }
 const p=supplied(),n=enemy();n.hp=0;assert.equal(cast(p,n,1000).ok,false);
});
test('competing casters cannot damage a dead target or spend runes twice during cooldown',()=>{
 const a=supplied(),b=supplied(),n=enemy();n.hp=1;
 assert.equal(cast(a,n,1000,()=>.99).damage,1);assert.equal(cast(b,n,1000).ok,false);assert.equal(count(b.inventory,'mind_rune'),5);
 const other=enemy();assert.equal(cast(a,other,1001).ok,false);assert.equal(count(a.inventory,'mind_rune'),4);
 assert.equal(cast(b,other,1001,()=>0).damage,0);assert.equal(b.skills.magic.xp,6);assert.equal(count(b.inventory,'mind_rune'),4);
 assert.equal(cast(a,other,1000+WIND_STRIKE.delay,()=>0).ok,true);
});
test('mind rune production checks altar and cancels movement without rewards',()=>{
 const p=player();p.skills.runecrafting={level:2,xp:90};addItem(p.inventory,'rune_essence');p.x=0;
 assert.equal(P.start(p,'craft_mind_runes',1,0).ok,false);p.x=1370;P.start(p,'craft_mind_runes',1,0);p.path=[{x:0,y:0}];P.advance(p,1800);
 assert.equal(count(p.inventory,'rune_essence'),1);assert.equal(p.skills.runecrafting.xp,90);
});
test('spell menu displays catalogue costs and disables missing runes',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
 const ctx=vm.createContext({named:id=>id,spell:WIND_STRIKE,inventory:[{id:'air_rune',qty:2}]});
 vm.runInContext(source.match(/function spellMenu\(inventory,spell\)\{[\s\S]*?\n\}/)[0],ctx);
 let result=vm.runInContext('spellMenu(inventory,spell)',ctx);assert.equal(result.disabled,true);assert.match(result.label,/mind_rune 0\/1/);
 ctx.inventory.push({id:'mind_rune',qty:1});assert.equal(vm.runInContext('spellMenu(inventory,spell)',ctx).disabled,false);
});
