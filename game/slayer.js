'use strict';
const {VILLAGE,ENEMY_TEMPLATES}=require('./content');
const {dist,addXp}=require('./rules');
const TASKS={wolf:{name:'Wolves',level:1,goal:3,xp:65},skeleton:{name:'Skeletons',level:5,goal:3,xp:100},bandit:{name:'Bandits',level:10,goal:3,xp:140}};
function definition(kind){return typeof kind==='string'&&Object.hasOwn(TASKS,kind)?TASKS[kind]:null;}
function options(p){return Object.entries(TASKS).map(([kind,d])=>({kind,...d,available:(p.skills.slayer?.level||1)>=d.level}));}
function restore(value){return definition(value?.kind)&&Number.isSafeInteger(value.kills)&&value.kills>=0&&value.kills<=definition(value.kind).goal?{kind:value.kind,kills:value.kills}:null;}
function atGuild(p){const guild=VILLAGE.buildings.find(b=>b.id==='guild');return p.loggedIn&&p.hp>0&&p.openBuilding==='guild'&&dist(p,guild.door)<=110&&!p.intent&&!p.path?.length&&!p.production&&!p.agility;}
function accept(p,kind='wolf'){
 if(!atGuild(p))return {ok:false,message:'Visit the guild and stop other actions to accept a Slayer contract.'};
 if(p.slayerTask)return {ok:false,message:'Finish your current Slayer contract first.'};
 const d=definition(kind);if(!d)return {ok:false,message:'Unknown Slayer contract.'};
 if((p.skills.slayer?.level||1)<d.level)return {ok:false,message:'Requires Slayer level '+d.level+'.'};
 p.slayerTask={kind,kills:0};return {ok:true,message:'Slayer contract: defeat '+d.goal+' '+d.name.toLowerCase()+', then return to the guild.'};
}
function record(p,kind){
 if(!p.slayerTask||p.slayerTask.kind!==kind)return false;
 p.slayerTask.kills=Math.min(definition(kind).goal,p.slayerTask.kills+1);return true;
}
function claim(p){
 if(!atGuild(p))return {ok:false,message:'Return to the guild and stop other actions to claim Slayer XP.'};
 const d=definition(p.slayerTask?.kind);
 if(!d||p.slayerTask.kills<d.goal)return {ok:false,message:'Complete your assigned kills first.'};
 p.slayerTask=null;addXp(p,'slayer',d.xp);return {ok:true,message:'Slayer contract completed · +'+d.xp+' Slayer XP.'};
}
function status(p){
 const task=restore(p.slayerTask);if(!task)return null;
 const d=definition(task.kind),ready=task.kills===d.goal,guild=VILLAGE.buildings.find(b=>b.id==='guild');
 const [x1,y1,x2,y2]=ENEMY_TEMPLATES.find(n=>n.kind===task.kind).region;
 return {...task,name:d.name,goal:d.goal,xp:d.xp,ready,target:ready?{...guild.door,kind:'station',label:'Claim Slayer XP at the guild'}:{x:(x1+x2)/2,y:(y1+y2)/2,kind:'area',label:'Defeat '+d.name.toLowerCase()+' for your Slayer contract'}};
}
module.exports={options,restore,accept,record,claim,status};
