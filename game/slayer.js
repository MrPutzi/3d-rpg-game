'use strict';
const {VILLAGE,ENEMY_TEMPLATES}=require('./content');
const {dist,addXp}=require('./rules');
const GOAL=3,XP=65;
function restore(value){return value?.kind==='wolf'&&Number.isSafeInteger(value.kills)&&value.kills>=0&&value.kills<=GOAL?{kind:'wolf',kills:value.kills}:null;}
function atGuild(p){const guild=VILLAGE.buildings.find(b=>b.id==='guild');return p.loggedIn&&p.hp>0&&p.openBuilding==='guild'&&dist(p,guild.door)<=110&&!p.intent&&!p.path?.length&&!p.production&&!p.agility;}
function accept(p){
 if(!atGuild(p))return {ok:false,message:'Visit the guild and stop other actions to accept a Slayer contract.'};
 if(p.slayerTask)return {ok:false,message:'Finish your current Slayer contract first.'};
 p.slayerTask={kind:'wolf',kills:0};return {ok:true,message:'Slayer contract: defeat three wolves, then return to the guild.'};
}
function record(p,kind){
 if(!p.slayerTask||p.slayerTask.kind!==kind)return false;
 p.slayerTask.kills=Math.min(GOAL,p.slayerTask.kills+1);return true;
}
function claim(p){
 if(!atGuild(p))return {ok:false,message:'Return to the guild and stop other actions to claim Slayer XP.'};
 if(!p.slayerTask||p.slayerTask.kills<GOAL)return {ok:false,message:'Complete your assigned wolf kills first.'};
 p.slayerTask=null;addXp(p,'slayer',XP);return {ok:true,message:'Slayer contract completed · +65 Slayer XP.'};
}
function status(p){
 const task=restore(p.slayerTask);if(!task)return null;
 const ready=task.kills===GOAL,guild=VILLAGE.buildings.find(b=>b.id==='guild');
 const [x1,y1,x2,y2]=ENEMY_TEMPLATES.find(n=>n.kind==='wolf').region;
 return {...task,goal:GOAL,xp:XP,ready,target:ready?{...guild.door,kind:'station',label:'Claim Slayer XP at the guild'}:{x:(x1+x2)/2,y:(y1+y2)/2,kind:'area',label:'Defeat wolves for your Slayer contract'}};
}
module.exports={restore,accept,record,claim,status};
