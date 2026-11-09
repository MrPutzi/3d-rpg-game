'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {serialQueue}=require('../game/serial');
test('same-account operations wait; other accounts progress independently',async()=>{
 const q=serialQueue(),events=[];let release;
 const a=q.run('a',()=>new Promise(r=>{release=()=>{events.push(1);r();};}));
 const b=q.run('a',()=>events.push(2));await q.run('b',()=>events.push(3));assert.deepEqual(events,[3]);
 release();await Promise.all([a,b]);assert.deepEqual(events,[3,1,2]);assert.equal(q.size(),0);
});
test('failed saves reject waiters and do not poison subsequent retries',async()=>{
 const q=serialQueue();const failed=q.run('a',()=>{throw Error('disk full');});const waiting=q.wait('a');
 await assert.rejects(failed,/disk full/);await assert.rejects(waiting,/disk full/);
 assert.equal(await q.run('a',()=>42),42);assert.equal(q.size(),0);
});
