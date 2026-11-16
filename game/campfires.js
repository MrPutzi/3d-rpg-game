'use strict';
const {dist}=require('./rules');
const LIFETIME=60000,RANGE=80;
const fires=new Map();let serial=0;
function prune(now=Date.now()){for(const [key,f] of fires)if(now>=f.expires)fires.delete(key);}
function light(p,now=Date.now()){
 prune(now);const key=p.id;
 const fire={id:'fire_'+(++serial),x:p.x,y:p.y,expires:now+LIFETIME};
 fires.set(key,fire);return fire;
}
function nearby(p,now=Date.now()){
 prune(now);return [...fires.values()].filter(f=>dist(p,f)<=RANGE).sort((a,b)=>dist(p,a)-dist(p,b))[0]||null;
}
function snapshot(now=Date.now()){prune(now);return [...fires.values()].map(f=>({...f,remainingMs:f.expires-now}));}
module.exports={light,nearby,snapshot,LIFETIME,RANGE};
