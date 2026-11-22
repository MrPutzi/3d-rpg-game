'use strict';
const {restoreDeadline}=require('./food');
// Slowest current weapon: seven 600 ms ticks. Other actions use three ticks.
const LIMITS={nextAttack:4200,nextGather:1800,nextSkillAction:1800};
function snapshot(p){return Object.fromEntries(Object.keys(LIMITS).map(key=>[key,Number.isFinite(p[key])?Math.max(0,p[key]):0]));}
function restore(saved,now=Date.now()){
 const timers=Object.fromEntries(Object.entries(LIMITS).map(([key,limit])=>[key,Number.isFinite(saved[key])?Math.max(0,Math.min(saved[key],now+limit)):0]));
 // Eating also delays attacks, including profiles saved before action timers existed.
 timers.nextAttack=Math.max(timers.nextAttack,restoreDeadline(saved.nextEat,now));
 return timers;
}
module.exports={snapshot,restore,LIMITS};
