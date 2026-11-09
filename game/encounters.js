'use strict';
// Server-only encounter accounting; never included in public NPC snapshots.
const {dist}=require('./rules');
const ledgers=new WeakMap(),resolved=new WeakSet();
const CREDIT_RANGE=320,CREDIT_AGE=30000;
function reset(n){ledgers.delete(n);resolved.delete(n);}
function record(n,p,damage,now){
 if(resolved.has(n)||!Number.isFinite(damage)||damage<=0)return;
 let ledger=ledgers.get(n);if(!ledger){ledger=new Map();ledgers.set(n,ledger);}
 for(const [id,entry] of ledger)if(now-entry.lastHit>CREDIT_AGE)ledger.delete(id);
 const previous=ledger.get(p.id);
 ledger.set(p.id,{damage:(previous?.damage||0)+damage,lastHit:now});
}
function forget(n,id){ledgers.get(n)?.delete(id);}
function contribution(n,id){return ledgers.get(n)?.get(id)?.damage||0;}
function eligible(n,players,now){
 const candidates=[...(ledgers.get(n)||[])].filter(([id,v])=>{
  const p=players[id];return p?.loggedIn&&p.hp>0&&dist(p,n)<=CREDIT_RANGE&&now-v.lastHit<=CREDIT_AGE;
 }).map(([id,v])=>({id,damage:v.damage})).sort((a,b)=>b.damage-a.damage||a.id.localeCompare(b.id));
 const minimum=Math.max(1,Math.ceil(n.maxHp*.1));
 return candidates.filter((c,i)=>i===0||c.damage>=minimum);
}
function settle(n,players,now){
 if(n.hp>0||resolved.has(n))return null;
 resolved.add(n);
 const participants=eligible(n,players,now),budget=Math.max(2,n.level*2);
 const total=participants.reduce((sum,p)=>sum+p.damage,0);
 const rewards=participants.map(p=>({...p,gold:Math.floor(budget*p.damage/total),remainder:(budget*p.damage)%total}));
 let left=budget-rewards.reduce((sum,p)=>sum+p.gold,0);
 for(const p of [...rewards].sort((a,b)=>b.remainder-a.remainder||b.damage-a.damage||a.id.localeCompare(b.id))){if(left--<=0)break;p.gold++;}
 return {ownerId:participants[0]?.id||null,rewards:rewards.map(({remainder,...p})=>p),budget};
}
function target(n,p,players,now){
 if(!n||n.hp<=0)return null;
 return {id:n.id,name:n.name,level:n.level,hp:n.hp,maxHp:n.maxHp,damage:contribution(n,p.id),
  qualifies:eligible(n,players,now).some(v=>v.id===p.id),minimumDamage:Math.max(1,Math.ceil(n.maxHp*.1))};
}
module.exports={forget,record,settle,reset,target,contribution,CREDIT_RANGE,CREDIT_AGE};
