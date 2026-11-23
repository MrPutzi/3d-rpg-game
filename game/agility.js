'use strict';
const {dist,addXp}=require('./rules');
const START={x:530,y:760};
const POINTS=[{x:650,y:760},{x:650,y:650},{x:530,y:650},START];
const OBSTACLES=[{name:'Balance beam',duration:1800},{name:'Stepping stones',duration:2400},{name:'Low hurdle',duration:1800},{name:'Landing practice',duration:1200}];
const XP=40,TIMEOUT=120000;
function interrupt(p){if(!p.agility?.action)return false;p.agility.action=null;return true;}
function cancel(p){if(!p.agility)return false;p.agility=null;return true;}
function start(p,now=Date.now()){
 if(!p.loggedIn||p.hp<=0)return {ok:false,message:'Sign in before training.'};
 if(p.agility)return {ok:false,message:'Finish or cancel your current lap.'};
 if(!p.skills.agility||p.skills.agility.level<1||dist(p,START)>24)return {ok:false,message:'Stand at the Oakvale course start.'};
 if(p.production||p.intent||p.path?.length)return {ok:false,message:'Stop other actions before starting a lap.'};
 p.openBuilding=null;p.agility={next:0,expires:now+TIMEOUT,readyAt:now+600};
 return {ok:true,message:'Lap started. Stop at each of four obstacles until its training timer finishes.'};
}
function status(p){
 const lap=p.agility;if(!lap)return null;
 return {expires:lap.expires,obstacle:{...OBSTACLES[lap.next]},action:lap.action?{...lap.action}:null,completed:lap.next,total:POINTS.length,target:{...POINTS[lap.next],kind:'activity',label:OBSTACLES[lap.next].name+' · '+(lap.next+1)+' / '+POINTS.length}};
}
function advance(p,now=Date.now()){
 const lap=p.agility;if(!lap)return null;
 if(!p.loggedIn||p.hp<=0||p.intent||p.production||p.openBuilding||dist(p,START)>300||now>=lap.expires){cancel(p);return {ok:false,message:'Agility lap cancelled. Return to the course start.'};}
 if(p.path?.length||dist(p,POINTS[lap.next])>20){
  if(interrupt(p)){return {ok:false,message:'Obstacle interrupted. Stop at the marker to retry.'};}
  return null;
 }
 if(now<lap.readyAt)return null;
 if(!lap.action){lap.action={startedAt:now,endsAt:now+OBSTACLES[lap.next].duration};return {ok:true,completed:false,message:'Training: '+OBSTACLES[lap.next].name+'. Stay at the marker.'};}
 if(now<lap.action.endsAt)return null;
 lap.action=null;
 lap.next++;lap.readyAt=now+600;
 if(lap.next<POINTS.length)return {ok:true,completed:false,message:'Checkpoint reached. Continue to the next marker.'};
 cancel(p);addXp(p,'agility',XP);
 return {ok:true,completed:true,message:'Oakvale lap completed · +'+XP+' Agility XP.'};
}
module.exports={START,POINTS,OBSTACLES,XP,start,status,advance,cancel,interrupt};
