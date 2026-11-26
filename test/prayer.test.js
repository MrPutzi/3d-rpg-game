'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Prayer=require('../game/prayer'),{skill}=require('../game/rules');
function player(overrides={}){return {loggedIn:true,hp:20,x:390,y:390,skills:{prayer:skill()},prayerPoints:1,activePrayer:null,nextPrayerDrain:0,...overrides};}
test('Stone Ward reduces server-side melee damage and drains one point per five seconds',()=>{
 const p=player();assert.equal(Prayer.toggle(p,'stone_ward',1000).active,true);
 assert.equal(Prayer.incomingDamage(p,10),6);assert.equal(Prayer.advance(p,5999),false);
 assert.equal(Prayer.advance(p,6000),true);assert.equal(p.prayerPoints,0);assert.equal(p.activePrayer,null);
 assert.equal(Prayer.incomingDamage(p,10),10);
});
test('prayer can be toggled off and cannot be activated without points or a valid id',()=>{
 const p=player();assert.equal(Prayer.toggle(p,'stone_ward',1000).ok,true);
 assert.equal(Prayer.toggle(p,'stone_ward',2000).active,false);assert.equal(p.activePrayer,null);
 p.prayerPoints=0;assert.equal(Prayer.toggle(p,'stone_ward',3000).ok,false);
 assert.equal(Prayer.toggle(p,'protect_all',3000).ok,false);
});
test('only the server-side Oakvale shrine position can recharge Prayer',()=>{
 const p=player({prayerPoints:0,activePrayer:'stone_ward',nextPrayerDrain:9000});
 assert.equal(Prayer.recharge(p,1000).ok,true);assert.equal(p.prayerPoints,1);assert.equal(p.activePrayer,null);
 const remote=player({x:100,y:100,prayerPoints:0});
 assert.equal(Prayer.recharge(remote,1000).ok,false);assert.equal(remote.prayerPoints,0);
});
test('points clamp to the Prayer level and players keep independent active states',()=>{
 const a=player(),b=player();a.skills.prayer.level=4;b.skills.prayer.level=2;
 assert.equal(Prayer.restore(99,a),4);assert.equal(Prayer.restore(-1,a),0);
 a.prayerPoints=4;b.prayerPoints=1;
 Prayer.toggle(a,'stone_ward',1000);assert.equal(Prayer.advance(a,6000),true);
 assert.equal(a.prayerPoints,3);assert.equal(b.prayerPoints,1);assert.equal(b.activePrayer,null);
 assert.equal(Prayer.maxPoints(a),4);
});
