'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {take,nearby}=require('../game/loot');
const player=id=>({id,loggedIn:true,x:0,y:0,inventory:[]});
const drop=(extra={})=>({id:'a',item:'bones',qty:1,x:0,y:0,expires:10000,...extra});
const reach=(p,g,r)=>Math.hypot(p.x-g.x,p.y-g.y)<=r;
test('simultaneous contenders cannot duplicate loot and expired loot never transfers',()=>{
 const a=player('a'),b=player('b'),ground={a:drop()};
 assert.equal(take(a,ground,'a',1,reach).ok,true);assert.equal(take(b,ground,'a',1,reach).ok,false);assert.equal(a.inventory.length+b.inventory.length,1);
 ground.a=drop({expires:10});assert.equal(take(b,ground,'a',10,reach).ok,false);assert.equal(b.inventory.length,0);assert.equal(ground.a,undefined);
});
test('ownership unlocks exactly at deadline; range and obstacles remain authoritative',()=>{
 const p=player('other'),ground={a:drop({ownerId:'owner',privateUntil:100})};
 assert.equal(take(p,ground,'a',99,reach).ok,false);
 assert.equal(take(p,ground,'a',100,()=>false).ok,false);
 p.x=49;assert.equal(take(p,ground,'a',100,reach).ok,false);
 p.x=48;assert.equal(take(p,ground,'a',100,reach).ok,true);
});
test('full inventory failure preserves entire drop and stackable pickup can still fit',()=>{
 const p=player('a');p.inventory=Array.from({length:28},()=>({id:'bones',qty:1}));const ground={a:drop({qty:2})};
 assert.equal(take(p,ground,'a',1,reach).ok,false);assert.equal(ground.a.qty,2);assert.equal(p.inventory.length,28);
 p.inventory[0]={id:'feathers',qty:2};ground.a=drop({item:'feathers',qty:3});assert.equal(take(p,ground,'a',1,reach).ok,true);assert.equal(p.inventory[0].qty,5);
});
test('nearby view is bounded, excludes expired and distant drops and distinguishes overlapping ownership',()=>{
 const p=player('me'),ground={a:drop({ownerId:'me',privateUntil:100}),b:drop({id:'b',ownerId:'other',privateUntil:100}),c:drop({id:'c',x:161}),d:drop({id:'d',expires:10})};
 const rows=nearby(p,ground,10);assert.deepEqual(rows.map(g=>g.access),['yours','reserved']);assert.equal(rows[0].expiresIn,9990);assert.equal(rows[1].unlockIn,90);assert.equal(rows[0].ownerId,undefined);
 assert.ok(nearby(p,ground,100).every(g=>g.access==='public'));
 for(let i=0;i<30;i++)ground['z'+i]=drop({id:'z'+i});assert.equal(nearby(p,ground,100).length,20);
 p.loggedIn=false;assert.deepEqual(nearby(p,ground,100),[]);
});

test('private loot follows an account through reconnect without exposing its identity',()=>{
 const {assignOwner}=require('../game/loot');
 const old={...player('old'),accountId:'account-a'},reconnected={...player('new'),accountId:'account-a'},other={...player('other'),accountId:'account-b'};
 const g=assignOwner(drop({privateUntil:100}),old),ground={a:g};
 assert.equal(JSON.stringify(g).includes('account-a'),false);
 assert.equal(nearby(reconnected,ground,1)[0].access,'yours');
 assert.equal(take(other,ground,'a',1,reach).ok,false);assert.equal(take(reconnected,ground,'a',1,reach).ok,true);
 const guest=assignOwner(drop({privateUntil:100}),player('guest'));
 assert.equal(take(player('new-guest'),{a:guest},'a',1,reach).ok,false);
});
test('bounded nearby collection skips reserved, remote, expired and non-fitting drops',()=>{
 const {takeNearby}=require('../game/loot');const p=player('me');
 p.inventory=Array.from({length:28},()=>({id:'bones',qty:1}));p.inventory[0]={id:'feathers',qty:1};
 const ground={a:drop(),b:drop({id:'b',item:'feathers',qty:3}),c:drop({id:'c',item:'feathers',ownerId:'other',privateUntil:100}),d:drop({id:'d',item:'feathers',x:49}),e:drop({id:'e',item:'feathers',expires:1})};
 const r=takeNearby(p,ground,1,reach);assert.equal(r.taken,1);assert.equal(p.inventory[0].qty,4);assert.deepEqual(Object.keys(ground),['a','c','d','e']);
 assert.equal(takeNearby(p,ground,1,reach).taken,0);
});
test('two sweepers and repeated requests conserve all drops and cap per-call work',()=>{
 const {takeNearby}=require('../game/loot');const a=player('one'),b=player('two'),ground={};
 for(let i=0;i<25;i++)ground['drop'+i]=drop({id:'drop'+i,item:'feathers'});
 assert.equal(takeNearby(a,ground,1,reach).taken,20);assert.equal(takeNearby(b,ground,1,reach).taken,5);assert.equal(takeNearby(a,ground,1,reach).taken,0);
 assert.equal(a.inventory[0].qty+b.inventory[0].qty,25);
 assert.equal(takeNearby({...player('anon'),loggedIn:false},{a:drop()},1,reach).taken,0);
});
test('pickup availability uses exact reach and ownership rather than rounded display distance',()=>{
 const p=player('me'),ground={a:drop({x:48.4})};
 let row=nearby(p,ground,1,reach)[0];assert.equal(row.distance,48);assert.equal(row.canTake,false);assert.equal(take(p,ground,'a',1,reach).ok,false);
 ground.a.x=48;assert.equal(nearby(p,ground,1,reach)[0].canTake,true);
 assert.equal(nearby(p,ground,1,()=>false)[0].canTake,false);
 ground.a.ownerId='other';ground.a.privateUntil=100;assert.equal(nearby(p,ground,99,reach)[0].canTake,false);assert.equal(nearby(p,ground,100,reach)[0].canTake,true);
 assert.equal(nearby(player('other'),ground,99,reach)[0].canTake,true);
});
