'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {stationLocation}=require('../game/stations');
const {stationReady}=require('../game/activities');
test('outdoor station reach uses exact boundary and independent player positions',()=>{
 for(const [id,site] of Object.entries(stationLocation)){
  assert.equal(stationReady({x:site.x+120,y:site.y},id),true);
  assert.equal(stationReady({x:site.x+120.01,y:site.y},id),false);
  assert.equal(stationReady({x:0,y:0},id),false);
 }
});
