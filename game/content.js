'use strict';
// Single authoritative catalogue; future equipment, shops and crafting share these definitions.
const TICK_MS=600, WORLD_SIZE=2400, BAG_SLOTS=28;
const baseTiers=[
  {id:'bronze',name:'Bronze',level:1,bonus:3,str:3,price:18,color:'#bc8057'},
  {id:'iron',name:'Iron',level:1,bonus:6,str:6,price:55,color:'#b5bec7'},
  {id:'steel',name:'Steel',level:5,bonus:11,str:11,price:170,color:'#cbd4d7'},
  {id:'mithril',name:'Mithril',level:20,bonus:20,str:20,price:650,color:'#7598bb'},
  {id:'adamant',name:'Adamant',level:30,bonus:29,str:30,price:1700,color:'#77a57c'},
  {id:'rune',name:'Rune',level:40,bonus:40,str:42,price:4400,color:'#74c2bd'}
];
const weaponTypes={
 dagger:{name:'Dagger',icon:'🗡️',speed:4,type:'stab',bonusScale:.8,strScale:.75,attackStyles:['accurate','aggressive','defensive'],twoHanded:false},
 scimitar:{name:'Scimitar',icon:'⚔️',speed:4,type:'slash',bonusScale:1,strScale:1.05,attackStyles:['accurate','aggressive','controlled','defensive'],twoHanded:false},
 longsword:{name:'Longsword',icon:'🗡️',speed:5,type:'slash',bonusScale:1.2,strScale:1.25,attackStyles:['accurate','aggressive','controlled','defensive'],twoHanded:false},
 battleaxe:{name:'Battleaxe',icon:'🪓',speed:6,type:'crush',bonusScale:1.35,strScale:1.65,attackStyles:['accurate','aggressive','defensive'],twoHanded:false},
 two_handed:{name:'2h Sword',icon:'⚔️',speed:7,type:'slash',bonusScale:1.45,strScale:2,attackStyles:['accurate','aggressive','defensive'],twoHanded:true}
};
const ITEMS={};
function item(id,props){ITEMS[id]={id,stackable:false,category:'misc',...props};}
for(const t of baseTiers){
 for(const [kind,w] of Object.entries(weaponTypes)){
  item(t.id+'_'+kind,{name:t.name+' '+w.name,icon:w.icon,category:'weapon',slot:'weapon',type:w.type,speed:w.speed,
   attackBonus:Math.round(t.bonus*w.bonusScale),strengthBonus:Math.round(t.str*w.strScale),defenceBonus:0,
   styles:w.attackStyles,level:t.level,skill:'attack',twoHanded:w.twoHanded,price:Math.round(t.price*(w.twoHanded?2.4:w.speed>=6?1.75:1)) ,color:t.color});
 }
 item(t.id+'_shield',{name:t.name+' Shield',icon:'🛡️',category:'armor',slot:'offhand',defenceBonus:Math.round(t.bonus*.9),level:t.level,skill:'defence',price:Math.round(t.price*.8),color:t.color});
}
item('shortbow',{name:'Shortbow',icon:'🏹',category:'weapon',slot:'weapon',type:'ranged',speed:4,attackBonus:9,strengthBonus:0,level:1,skill:'ranging',twoHanded:true,ammo:'arrow',styles:['range_accurate','rapid','longrange'],price:65,color:'#c69c66'});
item('longbow',{name:'Longbow',icon:'🏹',category:'weapon',slot:'weapon',type:'ranged',speed:6,attackBonus:15,strengthBonus:1,level:1,skill:'ranging',twoHanded:true,ammo:'arrow',styles:['range_accurate','rapid','longrange'],price:120,color:'#b79361'});
item('oak_shortbow',{name:'Oak Shortbow',icon:'🏹',category:'weapon',slot:'weapon',type:'ranged',speed:4,attackBonus:22,strengthBonus:4,level:5,skill:'ranging',twoHanded:true,ammo:'arrow',styles:['range_accurate','rapid','longrange'],price:280,color:'#d6a77b'});
item('crossbow',{name:'Crossbow',icon:'🏹',category:'weapon',slot:'weapon',type:'ranged',speed:5,attackBonus:26,strengthBonus:3,level:10,skill:'ranging',twoHanded:false,ammo:'bolt',styles:['range_accurate','rapid','longrange'],price:500,color:'#aebcca'});
item('bronze_arrow',{name:'Bronze arrows',icon:'➶',category:'ammo',slot:'ammo',stackable:true,ammo:'arrow',rangedStrength:2,price:2,color:'#d9bd8b'});
item('iron_arrow',{name:'Iron arrows',icon:'➶',category:'ammo',slot:'ammo',stackable:true,ammo:'arrow',rangedStrength:5,price:5,color:'#ccd4d9'});
item('bronze_bolt',{name:'Bronze bolts',icon:'➶',category:'ammo',slot:'ammo',stackable:true,ammo:'bolt',rangedStrength:5,price:5,color:'#bcb4a3'});
item('bread',{name:'Bread',icon:'🍞',category:'food',heal:7,price:8,color:'#e8b877'});
item('trout_cooked',{name:'Cooked trout',icon:'🐟',category:'food',heal:9,price:19,color:'#f0a574'});
item('logs',{name:'Logs',icon:'🪵',category:'resource',price:4});
item('oak_logs',{name:'Oak logs',icon:'🪵',category:'resource',price:15});
item('copper_ore',{name:'Copper ore',icon:'🟠',category:'resource',price:5});
item('iron_ore',{name:'Iron ore',icon:'🪨',category:'resource',price:18});
item('raw_shrimp',{name:'Raw shrimp',icon:'🦐',category:'resource',price:4});
item('raw_trout',{name:'Raw trout',icon:'🐟',category:'resource',price:20});
item('bronze_axe',{name:'Bronze axe',icon:'🪓',category:'tool',skill:'woodcutting',level:1,price:15});
item('iron_axe',{name:'Iron axe',icon:'🪓',category:'tool',skill:'woodcutting',level:1,price:60});
item('bronze_pickaxe',{name:'Bronze pickaxe',icon:'⛏️',category:'tool',skill:'mining',level:1,price:18});
item('iron_pickaxe',{name:'Iron pickaxe',icon:'⛏️',category:'tool',skill:'mining',level:1,price:65});
item('small_net',{name:'Small fishing net',icon:'🕸️',category:'tool',skill:'fishing',level:1,price:20});
item('fishing_rod',{name:'Fishing rod',icon:'🎣',category:'tool',skill:'fishing',level:5,price:40});
const VILLAGE={
 buildings:[
  {id:'tavern',x:175,y:170,w:150,h:120,name:'The Golden Tankard',label:'Tavern',door:{x:250,y:308},icon:'🍺'},
  {id:'forge',x:410,y:155,w:160,h:135,name:'Oakvale Forge',label:'Forge',door:{x:490,y:306},icon:'⚒️'},
  {id:'market',x:165,y:490,w:165,h:125,name:'Oakvale General Store',label:'Market',door:{x:247,y:475},icon:'🛒'},
  {id:'guild',x:465,y:500,w:150,h:120,name:'Adventurers Guild',label:'Guild',door:{x:540,y:483},icon:'📜'},
  {id:'bank',x:660,y:175,w:158,h:120,name:'Oakvale Bank',label:'Bank',door:{x:740,y:311},icon:'🏦'}
 ],
 roads:[{x:0,y:352,w:900,h:65},{x:353,y:0,w:65,h:850},{x:220,y:295,w:35,h:60},{x:480,y:288,w:35,h:65},{x:730,y:295,w:35,h:60},{x:235,y:416,w:35,h:70},{x:530,y:416,w:35,h:70}],
 villagers:[{id:'elder',name:'Village Elder',x:490,y:385},{id:'guard',name:'Guard',x:635,y:385}],
 fountain:{x:390,y:390}
};
const SHOPS={
 forge:{name:'Oakvale Forge',greeting:'Steel and skill are a warrior’s companions.',items:['bronze_dagger','bronze_scimitar','bronze_longsword','bronze_battleaxe','bronze_two_handed','bronze_shield','iron_scimitar','iron_longsword','steel_scimitar','steel_shield','mithril_scimitar','adamant_scimitar','rune_scimitar']},
 market:{name:'General Store',greeting:'Supplies for adventurers and gatherers.',items:['bread','trout_cooked','shortbow','longbow','oak_shortbow','crossbow','bronze_arrow','iron_arrow','bronze_bolt','bronze_axe','iron_axe','bronze_pickaxe','iron_pickaxe','small_net','fishing_rod']},
 tavern:{name:'The Golden Tankard',greeting:'A warm fire and a hot meal.',items:['bread','trout_cooked']}
};
const ENEMY_TEMPLATES=[
 {kind:'rat',name:'Rat',level:1,hp:12,count:5,region:[680,850,870,1200],color:'#8c796d',damage:1,defence:2},
 {kind:'goblin',name:'Goblin',level:3,hp:30,count:9,region:[840,300,1280,830],color:'#88ad64',damage:3,defence:5},
 {kind:'wolf',name:'Wolf',level:8,hp:55,count:7,region:[1250,750,1720,1240],color:'#9e9a90',damage:5,defence:12},
 {kind:'skeleton',name:'Skeleton',level:15,hp:85,count:7,region:[1550,180,2150,690],color:'#d8d0b3',damage:8,defence:23},
 {kind:'orc',name:'Orc',level:24,hp:145,count:6,region:[1730,1250,2240,2070],color:'#6c996b',damage:12,defence:38}
];
const RESOURCE_TEMPLATES=[
 {kind:'tree',name:'Tree',skill:'woodcutting',item:'logs',level:1,xp:25,region:[150,800,950,1420],count:15,tool:'axe'},
 {kind:'oak',name:'Oak Tree',skill:'woodcutting',item:'oak_logs',level:15,xp:55,region:[1000,1180,1750,1660],count:12,tool:'axe'},
 {kind:'copper',name:'Copper Rock',skill:'mining',item:'copper_ore',level:1,xp:18,region:[850,1450,1400,2180],count:12,tool:'pickaxe'},
 {kind:'iron',name:'Iron Rock',skill:'mining',item:'iron_ore',level:15,xp:42,region:[1480,1650,2150,2200],count:10,tool:'pickaxe'},
 {kind:'shrimp',name:'Shrimp Spot',skill:'fishing',item:'raw_shrimp',level:1,xp:20,region:[150,1600,650,2100],count:10,tool:'small_net'},
 {kind:'trout',name:'Trout Spot',skill:'fishing',item:'raw_trout',level:20,xp:55,region:[680,1810,1180,2210],count:8,tool:'fishing_rod'}
];
module.exports={TICK_MS,WORLD_SIZE,BAG_SLOTS,ITEMS,VILLAGE,SHOPS,ENEMY_TEMPLATES,RESOURCE_TEMPLATES};
