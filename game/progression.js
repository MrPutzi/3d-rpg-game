'use strict';
// Modular OSRS-inspired gameplay catalogue: beginner recipes, quest loops, territorial loot.
const SKILLS=['attack','strength','defence','ranging','hitpoints','woodcutting','mining','fishing',
 'cooking','firemaking','smithing','crafting','fletching','magic','prayer','agility','thieving',
 'runecrafting','herblore','farming','construction','hunter','slayer'];
const RECIPES={
 cook_shrimp:{name:'Cook shrimp',skill:'cooking',level:1,xp:30,inputs:{raw_shrimp:1},outputs:{cooked_shrimp:1},station:'tavern'},
 cook_rabbit:{name:'Roast rabbit',skill:'cooking',level:1,xp:35,inputs:{raw_rabbit:1},outputs:{cooked_rabbit:1},station:'tavern'},
 cook_trout:{name:'Cook trout',skill:'cooking',level:15,xp:70,inputs:{raw_trout:1},outputs:{trout_cooked:1},station:'tavern'},
 firemaking_logs:{name:'Light logs',skill:'firemaking',level:1,xp:40,inputs:{logs:1},outputs:{},station:'any'},
 fletch_shafts:{name:'Make arrow shafts',skill:'fletching',level:1,xp:15,inputs:{logs:1},outputs:{arrow_shafts:15},station:'any'},
 fletch_arrows:{name:'Fletch bronze arrows',skill:'fletching',level:1,xp:40,inputs:{arrow_shafts:15,feathers:15,bronze_arrowtips:15},outputs:{bronze_arrow:15},station:'any'},
 smelt_bronze:{name:'Smelt bronze bar',skill:'smithing',level:1,xp:55,inputs:{copper_ore:1,tin_ore:1},outputs:{bronze_bar:1},station:'forge'},
 smith_arrowtips:{name:'Smith bronze arrowtips',skill:'smithing',level:1,xp:40,inputs:{bronze_bar:1},outputs:{bronze_arrowtips:15},station:'forge'},
 smith_dagger:{name:'Smith bronze dagger',skill:'smithing',level:1,xp:45,inputs:{bronze_bar:1},outputs:{bronze_dagger:1},station:'forge'},
 craft_gloves:{name:'Craft leather gloves',skill:'crafting',level:1,xp:45,inputs:{leather:1},outputs:{leather_gloves:1},station:'any'},
 bury_bones:{name:'Bury bones',skill:'prayer',level:1,xp:45,inputs:{bones:1},outputs:{},station:'any'},
 brew_potion:{name:'Brew healing potion',skill:'herblore',level:3,xp:60,inputs:{guam_leaf:1,vial_of_water:1},outputs:{healing_potion:1},station:'tavern'},
 craft_air_runes:{name:'Craft air runes',skill:'runecrafting',level:1,xp:30,inputs:{rune_essence:1},outputs:{air_rune:5},station:'altar'},
 build_stool:{name:'Build a stool',skill:'construction',level:1,xp:55,inputs:{plank:2},outputs:{},station:'guild'},
 farm_guam:{name:'Harvest herbs',skill:'farming',level:1,xp:55,inputs:{guam_seed:1},outputs:{guam_leaf:2},station:'farm'},
 hunt_rabbit:{name:'Set a rabbit snare',skill:'hunter',level:1,xp:45,inputs:{},outputs:{raw_rabbit:1},station:'hunt'},
 run_course:{name:'Run beginner agility course',skill:'agility',level:1,xp:40,inputs:{},outputs:{},station:'course'},
 pickpocket:{name:'Pickpocket a villager',skill:'thieving',level:1,xp:25,inputs:{},outputs:{},gold:4,station:'village'},
 slayer_contract:{name:'Claim Slayer training',skill:'slayer',level:1,xp:65,inputs:{},outputs:{},station:'guild',requiresSlayerKills:3}
};
const QUESTS={
 welcome:{giver:'elder',name:'Welcome to Oakvale',type:'talk',target:'elder',goal:1,rewardGold:10},
 goblin_hunt:{giver:'elder',name:'Goblin Menace',type:'kill',target:'goblin',goal:3,rewardGold:40,rewardItems:{bronze_shield:1,bread:1},after:'welcome'},
 forest_supplies:{giver:'forester',name:'Forest Supplies',type:'gather',target:'logs',goal:5,rewardGold:45,rewardItems:{guam_seed:2},after:'welcome'},
 cooked_supplies:{name:'Meals for the Frontier',giver:'fisher',type:'craft',target:'cook_shrimp',goal:3,deliverItems:{cooked_shrimp:3},rewardGold:20,after:'first_catch'},
 first_catch:{giver:'fisher',name:'The Fisherman’s Request',type:'gather',target:'raw_shrimp',goal:3,rewardGold:40,rewardItems:{vial_of_water:2},after:'welcome'},
 guard_supplies:{giver:'guard',name:'Points for the Patrol',type:'craft',target:'smith_arrowtips',goal:2,deliverItems:{bronze_arrowtips:30},rewardGold:25,rewardItems:{feathers:30},after:'goblin_hunt'},
 patrol_provisions:{giver:'ranger',name:'Provisions for Newhaven',type:'craft',target:'cook_rabbit',goal:3,deliverItems:{cooked_rabbit:3},rewardGold:30,after:'wilds_patrol'},
 wilds_patrol:{giver:'ranger',name:'Eastern Wilds Patrol',type:'kill',target:'wolf',goal:2,rewardGold:110,rewardItems:{iron_arrow:25},after:'goblin_hunt'}
};
const DROPS={
 rat:[{id:'bones',chance:.7,min:1,max:1},{id:'guam_seed',chance:.12,min:1,max:1},{id:'rune_essence',chance:.08,min:1,max:2}],
 goblin:[{id:'bones',chance:.88,min:1,max:1},{id:'copper_ore',chance:.18,min:1,max:2},{id:'bronze_arrow',chance:.22,min:3,max:10},{id:'feathers',chance:.36,min:4,max:11},{id:'bronze_arrowtips',chance:.08,min:3,max:12},{id:'guam_leaf',chance:.11,min:1,max:1},{id:'iron_dagger',chance:.018,min:1,max:1}],
 wolf:[{id:'bones',chance:1,min:1,max:2},{id:'leather',chance:.7,min:1,max:2},{id:'guam_leaf',chance:.15,min:1,max:1},{id:'steel_scimitar',chance:.025,min:1,max:1}],
 skeleton:[{id:'bones',chance:1,min:2,max:3},{id:'rune_essence',chance:.38,min:2,max:6},{id:'air_rune',chance:.55,min:3,max:15},{id:'mind_rune',chance:.48,min:3,max:12},{id:'mithril_dagger',chance:.035,min:1,max:1}],
 bandit:[{id:'bones',chance:.85,min:1,max:2},{id:'bronze_arrow',chance:.5,min:3,max:10},{id:'leather',chance:.35,min:1,max:2},{id:'mind_rune',chance:.25,min:2,max:8},{id:'iron_scimitar',chance:.04,min:1,max:1}],
 swamp_troll:[{id:'bones',chance:1,min:2,max:4},{id:'guam_leaf',chance:.6,min:1,max:3},{id:'rune_essence',chance:.4,min:2,max:5},{id:'mithril_scimitar',chance:.02,min:1,max:1},{id:'healing_potion',chance:.25,min:1,max:2}],
 mountain_golem:[{id:'iron_ore',chance:1,min:2,max:5},{id:'rune_essence',chance:.5,min:4,max:9},{id:'adamant_scimitar',chance:.03,min:1,max:1},{id:'rune_shield',chance:.008,min:1,max:1}],
 orc:[{id:'bones',chance:1,min:2,max:4},{id:'iron_ore',chance:.8,min:1,max:3},{id:'iron_arrow',chance:.6,min:6,max:20},{id:'adamant_shield',chance:.025,min:1,max:1},{id:'rune_scimitar',chance:.006,min:1,max:1}]
};
function rollDrops(kind,rng=Math.random){
 const rolled=[];
 for(const e of DROPS[kind]||[])if(rng()<e.chance){
  rolled.push({id:e.id,qty:e.min+Math.floor(rng()*(e.max-e.min+1))});
 }
 return rolled;
}
const REGIONS=[
 {id:'oakvale',name:'Oakvale Village',x:0,y:0,w:900,h:850,type:'village',color:'#ac8d62'},
 {id:'westwood',name:'Westwood Forest',x:0,y:850,w:1250,h:700,type:'forest',color:'#357a50'},
 {id:'quarry',name:'Southstone Quarry',x:850,y:1500,w:1350,h:950,type:'mine',color:'#b68a62'},
 {id:'lake',name:'Moonwater Lake',x:70,y:1520,w:1150,h:700,type:'water',color:'#4c93ad'},
 {id:'wilds',name:'Eastern Wilds',x:1250,y:500,w:1200,h:1250,type:'wilderness',color:'#6d8d69'},
 {id:'northpass',name:'Northern Pass',x:2150,y:0,w:1450,h:1000,type:'mountains',color:'#7f9292'},
 {id:'newhaven',name:'Newhaven Outpost',x:2600,y:900,w:850,h:800,type:'outpost',color:'#a89267'},
 {id:'marsh',name:'Misty Marsh',x:2250,y:1780,w:1250,h:1550,type:'marsh',color:'#597b71'}
];
module.exports={SKILLS,RECIPES,QUESTS,DROPS,REGIONS,rollDrops};
