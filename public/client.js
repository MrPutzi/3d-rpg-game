'use strict';
const socket=io(),canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let world={players:{},npcs:{},nodes:{},groundItems:{},projectiles:[]};
let items={},shops={},recipes={},questsCatalog={},regions=[],stations={},marketInfo={},village={buildings:[],roads:[],villagers:[],fountain:{x:390,y:390}};
let bankQuantity=1,trackedQuest=null;
let profile=null,entered=false,modalId=null,shopTab='buy',camera={x:380,y:380};
let viewport={w:1000,h:720},marker=null,lastProfileSignature='';
let SIZE=3600,authMode='signin';
const iconFor={attack:'⚔️',strength:'💪',defence:'🛡️',ranging:'🏹',hitpoints:'❤️',woodcutting:'🪓',mining:'⛏️',fishing:'🎣'};
const zoneName=p=>[...regions].reverse().find(r=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h)?.name||'The Frontier';
const iconNode={tree:'🌳',oak:'🌲',copper:'🟠',iron:'🪨',shrimp:'🐟',trout:'🎣'};
const styleNames={
 accurate:['Accurate','Attack XP'],aggressive:['Aggressive','Strength XP'],defensive:['Defensive','Defence XP'],
 controlled:['Controlled','Shared XP'],range_accurate:['Accurate','Ranged XP'],rapid:['Rapid','Faster attacks'],longrange:['Longrange','Ranged + Defence XP']
};
const names={welcome:'First Steps — Speak with the Elder',goblin_hunt:'Goblin Menace — Defeat 3 Goblins'};
function notify(t){$('notice').textContent=String(t).slice(0,220);}
function emit(action,data){if(socket.connected&&entered)socket.emit(action,data);}
function named(id){return items[id]?.name||id||'None';}
function gear(){return items[profile?.equipment.weapon]||{name:'Unarmed',icon:'👊',type:'crush',speed:4,styles:['accurate','aggressive','defensive']};}
function elem(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function detail(title,lines){
 $('detail-title').textContent=title;const box=$('detail-content');box.replaceChildren();
 for(const line of lines){const p=elem('p','shop-description',line);box.append(p);}
 $('detail-backdrop').hidden=false;
}
function examineItem(id){
 const i=items[id];if(!i)return;
 const bonus=['attackBonus','strengthBonus','defenceBonus','rangedStrength'].filter(k=>i[k]!==undefined).map(k=>k.replace('Bonus','')+': +'+i[k]).join(' · ');
 detail(i.icon+' '+i.name,[i.category.toUpperCase()+(i.slot?' · '+i.slot:''),i.type?'Attack type: '+i.type:'',i.speed?'Attack speed: '+i.speed+' game ticks ('+(i.speed*.6).toFixed(1)+'s)':'',
 i.skill?'Requires '+i.skill+' level '+i.level:'',i.twoHanded?'Two-handed weapon — shield unavailable':'',bonus,'Price: '+i.price+' coins'].filter(Boolean));
}
function contextMenu(title,options,x,y){
 const menu=$('context-menu');menu.replaceChildren();
 const head=elem('div','context-head',title);menu.append(head);
 for(const option of options){
  const b=elem('button','',option.label);b.type='button';b.onclick=e=>{e.preventDefault();e.stopPropagation();menu.hidden=true;option.action();};menu.append(b);
 }
 menu.hidden=false;
 menu.style.left=Math.max(5,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';
 menu.style.top=Math.max(5,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
}
function itemMenu(entry,event){
 const item=items[entry.id];if(!item)return;
 const options=[];
 if(['head','cape','neck','weapon','body','offhand','legs','hands','feet','ring','ammo'].includes(item.slot)){
  if(profile?.equipment[item.slot]===entry.id)options.push({label:'Unequip '+item.name,action:()=>emit('unequip',item.slot)});
  options.push({label:'Equip '+item.name,action:()=>emit('equip',entry.id)});
 }
 if(item.category==='food')options.push({label:'Eat '+item.name,action:()=>emit('useItem',entry.id)});
 if(entry.id==='bones')options.push({label:'Bury Bones (+Prayer XP)',action:()=>emit('craft','bury_bones')});
 options.push({label:'Drop 1 × '+item.name,action:()=>emit('dropItem',entry.id)});
 options.push({label:'Examine '+item.name,action:()=>examineItem(entry.id)});
 options.push({label:'Cancel',action:()=>{}});
 contextMenu(item.name,options,event.clientX,event.clientY);
}
socket.on('connect',()=>{
 $('connection').textContent='● Connected';
 if(entered){entered=false;profile=null;$('login-overlay').hidden=false;closeBuilding();}
 const token=localStorage.getItem('miniscape_session');
 if(token)socket.emit('resumeSession',{token});
});
socket.on('disconnect',()=>{$('combat-target').hidden=true;$('connection').textContent='● Reconnecting…';});
socket.on('catalog',data=>{
 items=data.items||{};shops=data.shops||{};village=data.village||village;
 recipes=data.recipes||{};questsCatalog=data.quests||{};regions=data.regions||[];stations=data.stations||{};
 SIZE=data.size||3600;
});
socket.on('shopState',data=>{if(data?.id){marketInfo[data.id]=data;if(modalId===data.id&&profile)renderBuilding();}});
socket.on('serverMessage',text=>{notify(text);if(!entered)$('login-error').textContent=String(text).slice(0,100);});
socket.on('authFailed',text=>{$('login-error').textContent=String(text).slice(0,140);localStorage.removeItem('miniscape_session');});
socket.on('sessionReplaced',()=>{localStorage.removeItem('miniscape_session');notify('This account was opened on another device.');});
socket.on('loginSuccess',data=>{
 if(data?.token)localStorage.setItem('miniscape_session',data.token);
 entered=true;$('login-overlay').hidden=true;$('login-error').textContent='';
 $('logout-button').hidden=false;
});
socket.on('loggedOut',()=>{localStorage.removeItem('miniscape_session');entered=false;profile=null;$('login-overlay').hidden=false;});
const logoutBtn=elem('button','','Odhlásiť sa');logoutBtn.id='logout-button';logoutBtn.hidden=true;logoutBtn.style.fontSize='11px';
logoutBtn.onclick=()=>{localStorage.removeItem('miniscape_session');emit('logout');};
document.querySelector('header').append(logoutBtn);
for(const b of document.querySelectorAll('[data-auth-mode]'))b.onclick=()=>{
 authMode=b.dataset.authMode;
 document.querySelectorAll('[data-auth-mode]').forEach(x=>x.classList.toggle('active',x===b));
 $('submit-auth').textContent=authMode==='register'?'VYTVORIŤ ÚČET':'PRIHLÁSIŤ SA';
 $('password').autocomplete=authMode==='register'?'new-password':'current-password';
 $('login-error').textContent='';
};
$('login-form').onsubmit=e=>{
 e.preventDefault();
 if(!socket.connected){$('login-error').textContent='Server is not connected.';return;}
 socket.emit(authMode==='register'?'register':'signIn',{username:$('character-name').value.trim(),password:$('password').value});
};
$('guest-button').onclick=()=>{
 if(!socket.connected){$('login-error').textContent='Server is not connected.';return;}
 socket.emit('guestLogin',{name:$('character-name').value.trim()||'Guest'});
};
socket.on('profile',data=>{profile=data;updateUI();if(modalId&&profile.openBuilding===modalId)renderBuilding();else if(modalId&&profile.openBuilding!==modalId)closeBuilding();});
socket.on('state',data=>{
 if(data?.players)world=data;
 const p=world.players[socket.id];
 if(p){$('coords').textContent=Math.round(p.x)+', '+Math.round(p.y);
 $('zone').textContent=zoneName(p);$('online').textContent=Object.keys(world.players).length+' players online';}
});
socket.on('combatTarget',target=>{
 $('combat-target').hidden=!target;
 if(!target)return;
 $('target-name').textContent=target.name+' · Lv '+target.level+' · '+target.hp+'/'+target.maxHp+' HP';
 $('target-hp').max=target.maxHp;$('target-hp').value=target.hp;
 $('target-credit').textContent='Your damage: '+target.damage+' · '+(target.qualifies?'Eligible for shared rewards':'Deal at least '+target.minimumDamage+' damage or lead the encounter')+'. Stay nearby; credit expires after 30s without a hit.';
});
socket.on('combatReward',reward=>notify(reward.name+' defeated · +'+reward.gold+' coins · Quest/Slayer credit if applicable'+(reward.lootOwner?' · Your drops are protected for 15s.':'.')));
socket.on('buildingOpen',data=>{modalId=data.id;shopTab='buy';renderBuilding();$('building-backdrop').hidden=false;});
function closeBuilding(){modalId=null;$('building-backdrop').hidden=true;}
$('close-building').onclick=closeBuilding;$('close-detail').onclick=()=>$('detail-backdrop').hidden=true;
document.querySelectorAll('.modal-backdrop').forEach(b=>b.addEventListener('pointerdown',e=>{if(e.target===b)b.hidden=true;if(b.id==='building-backdrop'&&b.hidden)modalId=null;}));
document.addEventListener('pointerdown',e=>{if(!$('context-menu').contains(e.target))$('context-menu').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('context-menu').hidden=true;$('detail-backdrop').hidden=true;$('map-backdrop').hidden=true;closeBuilding();}});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));
 document.querySelectorAll('.tab-pane').forEach(p=>p.hidden=p.id!=='pane-'+b.dataset.tab);
});
function updateUI(){
 if(!profile||!entered)return;
 $('player-name').textContent=profile.name;
 $('health').textContent=profile.hp+' / '+profile.maxHp;
 $('hp-bar').style.width=(profile.hp/profile.maxHp*100)+'%';
 $('gold').textContent=profile.gold;
 const w=gear();$('weapon-name').textContent=w.name;$('weapon-icon').textContent=w.icon;
 $('weapon-info').textContent=(w.type||'crush').toUpperCase()+' · '+(w.speed||4)+' ticks';
 const s=profile.skills;
 const combatLvl=Math.floor(.25*(s.defence.level+s.hitpoints.level+Math.floor(s.attack.level/2))+
 Math.max((s.attack.level+s.strength.level)*.325,s.ranging.level*.4875));
 $('combat-level').textContent=combatLvl;
 $('auto-retaliate').textContent='Auto-retaliate: '+(profile.autoRetaliate?'ON':'OFF');
 $('auto-retaliate').classList.toggle('active',!!profile.autoRetaliate);
 const styles=$('combat-styles');styles.replaceChildren();
 for(const id of w.styles||[]){
  const b=elem('button',profile.combatStyle===id?'active':'');
  const details=styleNames[id]||[id,''];
  b.textContent=details[0];b.title=details[1];b.onclick=()=>emit('setStyle',id);styles.append(b);
 }
 const inv=$('inventory');inv.replaceChildren();$('bag-count').textContent=profile.inventory.length+' / 28';
 for(let i=0;i<28;i++){
  const entry=profile.inventory[i],cell=elem('div','item-slot'+(entry?' filled':''));
  if(entry&&items[entry.id]){
   const item=items[entry.id];cell.dataset.tooltip=item.name+(entry.qty>1?' × '+entry.qty:'');
   cell.title=item.name;cell.tabIndex=0;cell.setAttribute('role','button');cell.setAttribute('aria-label',item.name);
   if(Object.values(profile.equipment).includes(entry.id))cell.classList.add('equipped');
   cell.append(elem('span','glyph',item.icon||'📦'));
   if(entry.qty>1)cell.append(elem('span','qty',entry.qty>=1000?Math.floor(entry.qty/1000)+'k':String(entry.qty)));
   cell.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')showItemTooltip(item.name,e);});
   cell.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')showItemTooltip(item.name,e);});
   cell.addEventListener('pointerleave',()=>{$('item-tooltip').hidden=true;});
   cell.addEventListener('click',()=>{if(['head','cape','neck','weapon','body','offhand','legs','hands','feet','ring','ammo'].includes(item.slot))emit('equip',entry.id);else if(item.category==='food')emit('useItem',entry.id);else examineItem(entry.id);});
   cell.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();itemMenu(entry,e);});
   cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cell.click();}if(e.key==='ContextMenu'){e.preventDefault();itemMenu(entry,{clientX:innerWidth/2,clientY:innerHeight/2});}});
   attachLongPress(cell,e=>itemMenu(entry,e));
  }
  inv.append(cell);
 }
 const skills=$('skills-list');skills.replaceChildren();
 for(const [id,stat] of Object.entries(profile.skills)){
  const row=elem('div','skill',(iconFor[id]||'✦')+' '+id[0].toUpperCase()+id.slice(1));
  row.append(elem('strong','', 'Lv '+stat.level+' · '+Math.floor(stat.xp)+' XP'));skills.append(row);
 }
 const equipment=$('equipment');equipment.replaceChildren();
 equipment.append(elem('div','paper-avatar','🧍'));
 for(const slot of ['head','cape','neck','weapon','body','offhand','legs','hands','feet','ring','ammo']){
  const id=profile.equipment[slot];
  const button=elem('button','paper-slot'+(id?'':' empty'),id?(items[id]?.icon||'📦'):'◇');
  button.dataset.slot=slot;button.title=slot.toUpperCase()+' — '+(id?named(id):'Empty');
  button.setAttribute('aria-label',button.title);
  button.onclick=()=>{if(id)examineItem(id);else notify('Empty '+slot+' slot. Equip an item from inventory.');};
  button.addEventListener('contextmenu',e=>{e.preventDefault();contextMenu(button.title,id?[
   {label:'Unequip '+named(id),action:()=>emit('unequip',slot)},
   {label:'Examine '+named(id),action:()=>examineItem(id)}
  ]:[{label:'Empty '+slot,action:()=>{}}],e.clientX,e.clientY);});
  equipment.append(button);
 }
 let attack=0,strength=0,defence=0;
 for(const id of Object.values(profile.equipment)){const i=items[id];attack+=i?.attackBonus||0;strength+=(i?.strengthBonus||0)+(i?.rangedStrength||0);defence+=i?.defenceBonus||0;}
 $('equipment-bonuses').textContent='Attack +'+attack+' · Strength +'+strength+' · Defence +'+defence;
 const activity=$('recipes');activity.replaceChildren();
 const active=profile.production;
 $('production-status').textContent=active?namedRecipe(active.id)+' · '+active.completed+'/'+active.total+' complete':'Choose a recipe. Each action takes 1.8 seconds.';
 $('cancel-production').hidden=!active;
 $('production-progress').hidden=!active;
 for(const [id,recipe] of Object.entries(recipes)){
  const row=elem('div','recipe-row');
  const info=elem('div','recipe-info');
  info.append(elem('strong','',recipe.name+' · '+recipe.skill+' Lv'+recipe.level));
  const inputs=Object.entries(recipe.inputs||{}),outputs=Object.entries(recipe.outputs||{});
  const owned=k=>profile.inventory.reduce((n,e)=>n+(e.id===k?e.qty:0),0);
  info.append(elem('small','',inputs.length?inputs.map(([k,v])=>named(k)+' '+owned(k)+'/'+v).join(' · '):'No ingredients'));
  info.append(elem('small','', '→ '+(outputs.map(([k,v])=>named(k)+' ×'+v).join(', ')||'Training')+' · '+recipe.xp+' XP · '+recipe.station));
  const missing=inputs.some(([k,v])=>owned(k)<v);
  const reason=active?'Batch in progress':(profile.skills[recipe.skill]?.level||0)<recipe.level?'Level too low':missing?'Missing ingredients':'';
  const controls=elem('div','recipe-controls');
  for(const qty of [1,5,28]){
   const b=elem('button','',qty===28?'Make 28':'Make '+qty);b.disabled=!!reason;b.title=reason||'Stops if ingredients run out or you move.';
   b.onclick=()=>emit('craft',{id,qty});controls.append(b);
  }
  const station=village.buildings.find(b=>b.id===recipe.station);
  if(station){
   const go=elem('button','','Go to '+station.label);
   go.title='Walk to '+station.name+'. Movement cancels unfinished production.';
   go.onclick=()=>{closeBuilding();emit('visitBuilding',station.id);notify('Walking to '+station.name+'…');};
   controls.append(go);
  }
  if(reason)info.append(elem('small','',reason));
  row.append(info,controls);activity.append(row);
 }
 const pinned=$('tracked-quest');if(trackedQuest&&profile.quests[trackedQuest]?.status!=='active')trackedQuest=null;
 pinned.hidden=!trackedQuest;if(trackedQuest)pinned.textContent=(questsCatalog[trackedQuest]?.name||trackedQuest)+' · '+(profile.questJournal?.[trackedQuest]?.message||'')+' · '+(profile.questJournal?.[trackedQuest]?.giverName||'');
 const quests=$('quests');quests.replaceChildren();
 for(const [id,q] of Object.entries(profile.quests)){
  const row=elem('div','quest-row');const el=elem('div');
  el.append(elem('strong','',questsCatalog[id]?.name||names[id]||id));
  const guidance=profile.questJournal?.[id],def=questsCatalog[id];
  el.append(elem('small','',guidance?.message||q.status));
  if(guidance)el.append(elem('small','','Return to '+guidance.giverName));
  if(def)el.append(elem('small','','Reward: '+(def.rewardGold||0)+' coins'+Object.entries(def.rewardItems||{}).map(([item,qty])=>' · '+named(item)+' ×'+qty).join('')));
  if(q.status==='active'){
   if(guidance?.target){el.append(elem('small','',guidance.target.label));const show=elem('button','','Show objective');show.onclick=()=>{trackedQuest=id;updateUI();openMap();};el.append(show);}
   const track=elem('button','',trackedQuest===id?'Untrack':'Track');track.onclick=()=>{trackedQuest=trackedQuest===id?null:id;updateUI();};el.append(track);
   if(guidance?.giver){const go=elem('button','','Go to '+guidance.giverName);go.onclick=()=>emit('interact',guidance.giver);el.append(go);}
  }
  row.append(el);quests.append(row);
 }
}
function shopEntry(id){
 const item=items[id],row=elem('div','shop-entry');
 row.append(elem('span','shop-icon',item?.icon||'📦'));
 const info=elem('div');info.append(elem('strong','',item.name));info.append(elem('small','',item.price+' coins'+(item.level?' · lvl '+item.level:'')));row.append(info);
 const buy=elem('button','','Buy');buy.onclick=()=>emit('buy',{id,qty:1});
 const stock=marketInfo[modalId]?.stock?.[id]??20;
 const actualPrice=marketInfo[modalId]?.prices?.[id]?.buy??item.price;
 buy.disabled=stock<=0||profile.gold<actualPrice;
 info.lastChild.textContent=actualPrice+' coins · stock '+stock+(item.level?' · lvl '+item.level:'');
 row.append(buy);
 row.addEventListener('contextmenu',e=>{e.preventDefault();contextMenu(item.name,[
  {label:'Buy 1',action:()=>emit('buy',{id,qty:1})},{label:'Buy 5',action:()=>emit('buy',{id,qty:5})},
  {label:'Buy 10',action:()=>emit('buy',{id,qty:10})},{label:'Examine',action:()=>examineItem(id)}
 ],e.clientX,e.clientY);});
 return row;
}
function renderBuilding(){
 if(!modalId||!profile)return;
 const b=village.buildings.find(x=>x.id===modalId);if(!b)return;
 $('building-title').textContent=(b.icon||'🏠')+' '+b.name;
 const box=$('building-content');box.replaceChildren();
 box.append(elem('div','shop-coins','🪙 Your gold: '+profile.gold.toLocaleString()+' coins'));
 if(shops[modalId]){
  box.append(elem('p','shop-description',shops[modalId].greeting));
  const actions=elem('div','modal-actions');
  for(const tab of ['buy','sell']){
   const button=elem('button',shopTab===tab?'active':'',tab==='buy'?'🛒 Shop':'🪙 Sell items');
   button.onclick=()=>{shopTab=tab;renderBuilding();};actions.append(button);
  }
  box.append(actions);const list=elem('div','shop-list');
  if(shopTab==='buy')for(const id of shops[modalId].items)list.append(shopEntry(id));
  else for(const entry of profile.inventory){
   const item=items[entry.id],row=elem('div','shop-entry');
   row.append(elem('span','shop-icon',item.icon));const info=elem('div');
   info.append(elem('strong','',item.name));info.append(elem('small','',(Math.max(1,Math.floor((marketInfo[modalId]?.prices?.[item.id]?.sell||item.price*.45))))+' coins each · '+entry.qty+' owned'));row.append(info);
   const sell=elem('button','','Sell 1');sell.onclick=()=>emit('sell',{id:item.id,qty:1});row.append(sell);list.append(row);
   row.addEventListener('contextmenu',e=>{e.preventDefault();contextMenu(item.name,[
    {label:'Sell 1',action:()=>emit('sell',{id:item.id,qty:1})},{label:'Sell 5',action:()=>emit('sell',{id:item.id,qty:5})},
    {label:'Sell 10',action:()=>emit('sell',{id:item.id,qty:10})},{label:'Examine',action:()=>examineItem(item.id)}
   ],e.clientX,e.clientY);});
  }
  if(!list.children.length)list.append(elem('div','empty','No items.'));box.append(list);
  if(modalId==='tavern'){const b=elem('button','','🛏 Rest and restore health · 10 coins');b.style.marginTop='15px';b.onclick=()=>emit('rest');box.append(b);}
 }else if(modalId==='bank'){
  box.append(elem('p','shop-description','Registered accounts save bank contents with character progress. Guest progress is temporary.'));
  box.append(elem('p','helper','Backpack '+profile.inventory.length+'/28 slots · Bank '+profile.bank.length+'/200 slots. All transfers the complete amount or leaves it unchanged.'));
  const amounts=elem('div');
  for(const qty of [1,5,10,50,'all']){const b=elem('button',bankQuantity===qty?'active':'',String(qty));b.style.margin='3px';b.onclick=()=>{bankQuantity=qty;renderBuilding();};amounts.append(b);}
  box.append(amounts);
  const cols=elem('div','bank-list');
  for(const [title,arr,event] of [['Backpack',profile.inventory,'bankDeposit'],['Bank',profile.bank,'bankWithdraw']]){
   const col=elem('div','bank-column');col.append(elem('h3','',title));
   if(!arr.length)col.append(elem('p','muted','Empty'));
   const grouped=new Map();for(const e of arr)grouped.set(e.id,(grouped.get(e.id)||0)+e.qty);
   for(const [id,qty] of grouped){
    const entry={id,qty};
    const r=elem('div','bank-row');
    r.append(elem('span','',(items[entry.id]?.icon||'📦')+' '+named(entry.id)+' ×'+entry.qty));
    const b=elem('button','',event==='bankDeposit'?'Deposit':'Withdraw');b.disabled=bankQuantity!=='all'&&entry.qty<bankQuantity;b.onclick=()=>emit(event,{id:entry.id,qty:bankQuantity});r.append(b);
    r.addEventListener('contextmenu',e=>{e.preventDefault();contextMenu(named(entry.id),[1,5,10,50,'all'].map(q=>({label:(event==='bankDeposit'?'Deposit ':'Withdraw ')+q,action:()=>emit(event,{id:entry.id,qty:q})})),e.clientX,e.clientY);});col.append(r);
   }
   cols.append(col);
  }
  box.append(cols);
 }else if(modalId==='guild'){
  box.append(elem('p','shop-description','Adventurers Guild — contracts, training notes and progress.'));
  for(const [id,q] of Object.entries(profile.quests)){
   box.append(elem('div','quest-row',(names[id]||id)+' · '+(q.status==='complete'?'Complete':q.status==='locked'?'Locked':q.progress+'/'+q.goal)));
  }
  box.append(elem('p','shop-description','Train Attack, Strength, Defence and Ranged by fighting. Woodcutting, Mining and Fishing require the correct tools and skill levels.'));
  box.append(elem('p','shop-description','Quest rewards are claimed from the Village Elder beside the fountain.'));
 }
 box.append(elem('div','foot-tag','Press Esc to close · Right click a shop item for more actions'));
}
function showItemTooltip(text,event){
 const t=$('item-tooltip');t.textContent=text;t.hidden=false;
 t.style.left=Math.max(4,Math.min(event.clientX+15,innerWidth-t.offsetWidth-5))+'px';
 t.style.top=Math.max(4,Math.min(event.clientY+13,innerHeight-t.offsetHeight-5))+'px';
}
$('auto-retaliate').onclick=()=>{if(profile)emit('toggleRetaliate',!profile.autoRetaliate);};
function attachLongPress(el,handler){
 let timer=0,startX=0,startY=0,triggered=false;
 el.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;startX=e.clientX;startY=e.clientY;clearTimeout(timer);timer=setTimeout(()=>{timer=0;triggered=true;handler({clientX:startX,clientY:startY});},480);});
 el.addEventListener('click',e=>{if(triggered){e.preventDefault();e.stopImmediatePropagation();triggered=false;}},true);
 for(const ev of ['pointerup','pointercancel','pointerleave','pointermove'])el.addEventListener(ev,e=>{if(ev==='pointermove'&&Math.hypot(e.clientX-startX,e.clientY-startY)<14)return;clearTimeout(timer);timer=0;});
}
function resize(){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
 viewport={w:r.width,h:r.height,dpr};
}
new ResizeObserver(resize).observe(canvas);resize();
function pointFromEvent(e){const rect=canvas.getBoundingClientRect();return{x:e.clientX-rect.left-viewport.w/2+camera.x,y:e.clientY-rect.top-viewport.h/2+camera.y};}
function hitAt(pt){
 const ground=Object.values(world.groundItems||{}).find(n=>Math.hypot(n.x-pt.x,n.y-pt.y)<20);if(ground)return{kind:'loot',object:ground};
 const npc=Object.values(world.npcs||{}).find(n=>n.hp>0&&Math.hypot(n.x-pt.x,n.y-pt.y)<23);if(npc)return{kind:'enemy',object:npc};
 const villager=village.villagers.find(n=>Math.hypot(n.x-pt.x,n.y-pt.y)<23);if(villager)return{kind:'npc',object:villager};
 const node=Object.values(world.nodes||{}).find(n=>Math.hypot(n.x-pt.x,n.y-pt.y)<24);if(node)return{kind:'node',object:node};
 const found=Object.entries(stations).find(([id,p])=>Math.hypot(p.x-pt.x,p.y-pt.y)<30);
 if(found)return{kind:'station',object:{id:found[0],x:found[1].x,y:found[1].y,name:found[0]}};
 const building=village.buildings.find(b=>pt.x>=b.x&&pt.x<b.x+b.w&&pt.y>=b.y&&pt.y<b.y+b.h);if(building)return{kind:'building',object:building};
 return{kind:'ground',object:pt};
}
function clickAction(hit){
 const o=hit.object;
 if(hit.kind==='loot')emit('pickup',o.id);
 else if(hit.kind==='enemy')emit('attack',o.id);
 else if(hit.kind==='npc')emit('interact',o.id);
 else if(hit.kind==='node')emit('gather',o.id);
 else if(hit.kind==='station'){emit('move',{x:o.x,y:o.y});notify('Walking to '+o.name+' station.');}
 else if(hit.kind==='building'){emit('visitBuilding',o.id);notify('Walking to '+o.name+'…');}
 else {marker={x:o.x,y:o.y,expires:Date.now()+2300};emit('move',o);}
}
function hitMenu(hit,e){
 const o=hit.object,walk=pos=>emit('move',pos);let title='',options=[];
 const examine=()=>{};
 if(hit.kind==='enemy'){
  title=o.name+' (level '+o.level+')';
  options=[{label:'⚔ Attack '+o.name,action:()=>emit('attack',o.id)},
   {label:'✨ Cast Wind Strike',action:()=>emit('castSpell',o.id)},
   {label:'Walk here',action:()=>walk(o)},{label:'Examine '+o.name,action:()=>detail(o.name,['Combat level: '+o.level,'Hitpoints: '+o.hp+'/'+o.maxHp,'Defence: '+o.defence,'Damage on retaliation: up to '+o.damage])}];
 }else if(hit.kind==='npc'){
  title=o.name;options=[{label:'Talk to '+o.name,action:()=>emit('interact',o.id)},
  {label:'Walk here',action:()=>walk(o)},{label:'Examine',action:()=>detail(o.name,[o.id==='elder'?'The village quest giver.':'A watchful guardian of Oakvale.'])}];
 }else if(hit.kind==='building'){
  title=o.name;options=[{label:'Enter '+o.name,action:()=>emit('visitBuilding',o.id)},{label:'Walk to entrance',action:()=>walk(o.door)},
  {label:'Examine',action:()=>detail(o.name,[o.id==='bank'?'Deposit or withdraw your items.':o.id==='guild'?'Quest journal and training information.':'Trade, relax or browse the shop.'])}];
 }else if(hit.kind==='node'){
  title=o.name;const action=o.skill==='woodcutting'?'Chop':o.skill==='mining'?'Mine':'Fish';
  options=[{label:action+' '+o.name,action:()=>emit('gather',o.id)},{label:'Walk here',action:()=>walk(o)},
   {label:'Examine',action:()=>detail(o.name,['Skill: '+o.skill,'Required level: '+o.level,'XP: '+o.xp,'Resource: '+named(o.item)])}];
 }else if(hit.kind==='station'){
  title='Training: '+o.name;
  options=[{label:'Walk to '+o.name,action:()=>walk(o)},
   {label:'Open skill training',action:()=>{
    const b=document.querySelector('[data-tab=skills]');if(b)b.click();
    notify('Training location: '+o.name+'. Choose a recipe when you arrive.');
   }},{label:'Examine',action:()=>detail('Training site',[
    'Skill activities here: '+Object.values(recipes).filter(x=>x.station===o.name).map(x=>x.name).join(', ')
   ])}];
 }else if(hit.kind==='loot'){
  title=named(o.item);options=[{label:'Take '+named(o.item),action:()=>emit('pickup',o.id)},{label:'Walk here',action:()=>walk(o)},{label:'Examine',action:()=>examineItem(o.item)}];
 }else{
  title='Ground · '+Math.round(o.x)+', '+Math.round(o.y);
  options=[{label:'Walk here',action:()=>clickAction(hit)},
   {label:'Mark location',action:()=>{marker={x:o.x,y:o.y,expires:Date.now()+9000};notify('Marked '+Math.round(o.x)+', '+Math.round(o.y));}},
   {label:'Examine terrain',action:()=>detail('Terrain',['World coordinates: '+Math.round(o.x)+', '+Math.round(o.y),'Region: '+zoneName(o)])}];
 }
 options.push({label:'Cancel',action:()=>{}});
 contextMenu(title,options,e.clientX,e.clientY);
}
let touchGesture=null;
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'){
  touchGesture={x:e.clientX,y:e.clientY,long:false,timer:setTimeout(()=>{if(touchGesture){touchGesture.long=true;hitMenu(hitAt(pointFromEvent(e)),e);}},490)};return;
 }
 if(e.button!==0||!entered||!socket.connected||!$('building-backdrop').hidden||!$('detail-backdrop').hidden)return;
 clickAction(hitAt(pointFromEvent(e)));
});
canvas.addEventListener('pointermove',e=>{if(touchGesture&&Math.hypot(e.clientX-touchGesture.x,e.clientY-touchGesture.y)>12){clearTimeout(touchGesture.timer);touchGesture=null;}});
canvas.addEventListener('pointerup',e=>{if(!touchGesture||e.pointerType!=='touch')return;clearTimeout(touchGesture.timer);const g=touchGesture;touchGesture=null;if(!g.long&&entered&&socket.connected)clickAction(hitAt(pointFromEvent(e)));});
canvas.addEventListener('pointercancel',()=>{if(touchGesture)clearTimeout(touchGesture.timer);touchGesture=null;});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(!entered)return;hitMenu(hitAt(pointFromEvent(e)),e);});

const inView=(x,y,pad=80)=>Math.abs(x-camera.x)<viewport.w/2+pad&&Math.abs(y-camera.y)<viewport.h/2+pad;
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function label(t,x,y,color='#fff',size=12){ctx.font='700 '+size+'px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#102028';ctx.strokeText(t,x,y);ctx.fillStyle=color;ctx.fillText(t,x,y);}
function draw(){
 const size=SIZE;rect(0,0,size,size,'#2e5a42');
 const minX=Math.max(0,Math.floor((camera.x-viewport.w/2-60)/64)*64),maxX=Math.min(size,camera.x+viewport.w/2+70);
 const minY=Math.max(0,Math.floor((camera.y-viewport.h/2-60)/64)*64),maxY=Math.min(size,camera.y+viewport.h/2+70);
 for(let x=minX;x<maxX;x+=64)for(let y=minY;y<maxY;y+=64){
  const seed=(Math.floor(x/64)*37+Math.floor(y/64)*71)%11;
  rect(x,y,64,64,seed<4?'#315c43':'#2b5742');
  if(seed===1){circle(x+15,y+21,3,'#4e8b5a');circle(x+36,y+40,2,'#7eaa73');}
 }
 for(const region of regions){
  if(!inView(region.x+region.w/2,region.y+region.h/2,Math.max(region.w,region.h)))continue;
  ctx.globalAlpha=.12;rect(region.x,region.y,region.w,region.h,region.color);ctx.globalAlpha=1;
 }
 rect(70,1500,1150,760,'#355e62');rect(95,1520,1090,700,'#3c869b');
 for(const road of village.roads)rect(road.x,road.y,road.w,road.h,'#aa8e66');
 for(const b of village.buildings){
  if(!inView(b.x+b.w/2,b.y+b.h/2,150))continue;
  rect(b.x+8,b.y+11,b.w,b.h,'#182a27aa');rect(b.x,b.y,b.w,b.h,'#77513d');
  rect(b.x+7,b.y+8,b.w-14,b.h-17,'#bd8a60');rect(b.x+12,b.y+13,b.w-24,10,'#dfb178');
  rect(b.x+b.w/2-14,b.y+b.h-19,28,19,'#533629');
  label((b.icon||'🏠')+' '+b.label,b.x+b.w/2,b.y+33,'#ffdfae',13);
 }
 const f=village.fountain;if(inView(f.x,f.y)){circle(f.x,f.y,31,'#a7b8bd');circle(f.x,f.y,24,'#5bb1d5');}
 for(const v of village.villagers){if(!inView(v.x,v.y))continue;circle(v.x,v.y+8,13,'#102f2b66');circle(v.x,v.y,13,'#dfb079');label('◆ '+v.name,v.x,v.y-23,'#ffdea4');}
 for(const [id,site] of Object.entries(stations)){
  if(!inView(site.x,site.y))continue;
  circle(site.x,site.y,17,'#927b50');label('✦',site.x,site.y+5,'#ffe4a3',17);
  label(id.toUpperCase(),site.x,site.y-25,'#f3dbb3',11);
 }
 for(const n of Object.values(world.nodes||{})){
  if(!inView(n.x,n.y))continue;const ready=Date.now()>=n.readyAt;ctx.globalAlpha=ready?1:.35;
  if(n.kind==='tree'||n.kind==='oak'){rect(n.x-4,n.y,8,20,'#74513a');circle(n.x,n.y-8,n.kind==='oak'?22:18,n.kind==='oak'?'#357844':'#308751');circle(n.x-6,n.y-14,7,'#5ea86a');}
  else if(n.kind==='copper'||n.kind==='iron'){circle(n.x,n.y,18,'#637478');circle(n.x-3,n.y-5,12,n.kind==='copper'?'#c88750':'#8aa2b0');}
  else{circle(n.x,n.y,16,'#5da7cf');label('≈',n.x,n.y+6,'#e1faff',17);}
  ctx.globalAlpha=1;
 }
 for(const g of Object.values(world.groundItems||{})){if(!inView(g.x,g.y))continue;circle(g.x,g.y,12,'#d2a85c');label(items[g.item]?.icon||'📦',g.x,g.y+5,'#fff',16);}
 for(const n of Object.values(world.npcs||{})){
  if(!n.hp||!inView(n.x,n.y))continue;
  circle(n.x,n.y+10,17,'#13251c77');circle(n.x,n.y,15,n.color);
  circle(n.x-5,n.y-4,2,'#172720');circle(n.x+5,n.y-4,2,'#172720');
  label(n.name+' · Lv '+n.level,n.x,n.y-26,n.level>=15?'#ffbba3':'#f8eacb');
  rect(n.x-18,n.y+20,36,5,'#633b42');rect(n.x-18,n.y+20,36*n.hp/n.maxHp,5,'#85d291');
 }
 for(const [id,p] of Object.entries(world.players||{})){
  if(!inView(p.x,p.y))continue;
  circle(p.x,p.y+9,16,'#152c2b88');circle(p.x,p.y,14,id===socket.id?'#f3d390':'#81b9e0');
  rect(p.x-4,p.y-2,8,12,p.weapon?.includes('bow')?'#9edba8':'#e6eff4');
  label(p.name,p.x,p.y-24,id===socket.id?'#ffe5ae':'#e7f3ff',13);
 }
 for(const e of world.projectiles||[]){
  ctx.strokeStyle=e.style==='ranged'?'#e9ee8a':'#ffb08c';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(e.fromX,e.fromY);ctx.lineTo(e.x,e.y);ctx.stroke();
  label(String(e.damage),e.x,e.y-30,'#ffda99',15);
 }
 if(marker&&Date.now()<marker.expires){ctx.strokeStyle='#ffe1a1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(marker.x,marker.y,16,0,Math.PI*2);ctx.stroke();}
}
let frameCount=0;
$('cancel-production').onclick=()=>emit('cancelProduction');
function namedRecipe(id){return recipes[id]?.name||id;}
let profileReceivedAt=Date.now();
socket.on('profile',()=>{profileReceivedAt=Date.now();});
function frame(){
 const job=profile?.production;
 if(job){const estimated=profile.serverNow+(Date.now()-profileReceivedAt);$('production-progress').value=Math.max(0,Math.min(1,(estimated-job.startedAt)/(job.endsAt-job.startedAt)));}
 requestAnimationFrame(frame);
 const me=world.players[socket.id];if(me){camera.x+=(me.x-camera.x)*.17;camera.y+=(me.y-camera.y)*.17;}
 ctx.setTransform(viewport.dpr,0,0,viewport.dpr,0,0);ctx.clearRect(0,0,viewport.w,viewport.h);
 ctx.save();ctx.translate(viewport.w/2,viewport.h/2);ctx.translate(-camera.x,-camera.y);draw();ctx.restore();
 if(frameCount++%6===0)drawAtlas($('minimap'));
 if(!$('map-backdrop').hidden&&frameCount%12===0)drawAtlas($('world-map'));

}

function drawAtlas(canvas){
 const context=canvas.getContext('2d'),w=canvas.width,h=canvas.height,ratioX=w/SIZE,ratioY=h/SIZE;
 context.clearRect(0,0,w,h);
 context.fillStyle='#244c37';context.fillRect(0,0,w,h);
 for(const region of regions){
  context.fillStyle=region.color||'#547d64';
  context.globalAlpha=.75;context.fillRect(region.x*ratioX,region.y*ratioY,region.w*ratioX,region.h*ratioY);
  context.globalAlpha=1;
  if(canvas.id==='world-map'){
   context.font='bold 12px system-ui';context.fillStyle='#f4e7cb';
   context.textAlign='center';context.fillText(region.name,(region.x+region.w/2)*ratioX,(region.y+region.h/2)*ratioY);
  }
 }
 for(const b of village.buildings){context.fillStyle='#e6c58a';context.fillRect(b.x*ratioX,b.y*ratioY,Math.max(3,b.w*ratioX),Math.max(3,b.h*ratioY));}
 for(const site of Object.values(stations)){
  context.fillStyle='#f5d084';context.beginPath();
  context.arc(site.x*ratioX,site.y*ratioY,canvas.id==='world-map'?5:2.5,0,Math.PI*2);context.fill();
 }
 for(const n of Object.values(world.nodes||{})){
  if(canvas.id!=='world-map')break;
  context.fillStyle=n.skill==='fishing'?'#82d7f7':n.skill==='mining'?'#c7b39a':'#66b976';
  context.fillRect(n.x*ratioX,n.y*ratioY,2.4,2.4);
 }
 for(const n of Object.values(world.npcs||{})){
  if(!n.hp)continue;context.fillStyle='#f08b80';context.beginPath();
  context.arc(n.x*ratioX,n.y*ratioY,canvas.id==='world-map'?3:1.3,0,Math.PI*2);context.fill();
 }
 for(const n of village.villagers){
  context.fillStyle='#fae190';context.beginPath();context.arc(n.x*ratioX,n.y*ratioY,canvas.id==='world-map'?4:2.1,0,Math.PI*2);context.fill();
 }
 const target=profile?.questJournal?.[trackedQuest]?.target;
 if(target){
  context.strokeStyle='#64fff1';context.fillStyle='#64fff122';context.lineWidth=2;
  if(target.bounds){const b=target.bounds;context.fillRect(b.x*ratioX,b.y*ratioY,b.w*ratioX,b.h*ratioY);context.strokeRect(b.x*ratioX,b.y*ratioY,b.w*ratioX,b.h*ratioY);}
  context.beginPath();context.arc(target.x*ratioX,target.y*ratioY,canvas.id==='world-map'?9:5,0,Math.PI*2);context.stroke();
  if(canvas.id==='world-map'){context.fillStyle='#64fff1';context.font='bold 12px sans-serif';context.textAlign='left';context.fillText('Quest target',Math.min(canvas.width-85,target.x*ratioX+12),Math.max(14,target.y*ratioY-12));}
 }
 const me=world.players?.[socket.id];
 if(me){
  context.fillStyle='#f9d078';context.beginPath();
  context.arc(me.x*ratioX,me.y*ratioY,canvas.id==='world-map'?8:5,0,Math.PI*2);context.fill();
  context.strokeStyle='#0d2530';context.lineWidth=1.5;context.stroke();
  if(canvas.id==='minimap'){
   const left=Math.max(0,(camera.x-viewport.w/2)*ratioX),top=Math.max(0,(camera.y-viewport.h/2)*ratioY);
   context.strokeStyle='#fcfcfcbb';context.lineWidth=.7;context.strokeRect(left,top,viewport.w*ratioX,viewport.h*ratioY);
  }
 }
}
function openMap(){if(!entered)return;updateQuestMapLabel();$('map-backdrop').hidden=false;drawAtlas($('world-map'));}
$('minimap').onclick=openMap;$('open-world-map').onclick=openMap;
$('close-map').onclick=()=>{$('map-backdrop').hidden=true;};
$('world-map').addEventListener('click',e=>{
 if(!entered)return;
 const rect=e.currentTarget.getBoundingClientRect();
 const x=clampNumber((e.clientX-rect.left)/rect.width*SIZE,20,SIZE-20);
 const y=clampNumber((e.clientY-rect.top)/rect.height*SIZE,20,SIZE-20);
 emit('move',{x,y});marker={x,y,expires:Date.now()+4500};$('map-backdrop').hidden=true;
});
const clampNumber=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

requestAnimationFrame(frame);

// Convenience only: the server independently validates every consumption.
function quickFood(){
 return profile?.inventory.find(e=>items[e.id]?.category==='food'&&e.qty>0);
}
function updateFoodButton(){
 const button=$('quick-eat'),entry=quickFood();
 const now=(profile?.serverNow||0)+Math.max(0,Date.now()-profileReceivedAt);
 const remaining=Math.max(0,(profile?.nextEat||0)-now);
 button.disabled=!entered||!socket.connected||!entry||profile.hp>=profile.maxHp||remaining>0;
 button.textContent=remaining>0?'Eat in '+(remaining/1000).toFixed(1)+'s':entry?'Eat '+items[entry.id].name:'No food';
 button.title=entry?'Heals up to '+items[entry.id].heal+' HP; delays your next attack by at least 1.8s. Uses first food in backpack.':'Cook food or visit a merchant.';
}
$('quick-eat').onclick=()=>{const entry=quickFood();if(entry&&!$('quick-eat').disabled)emit('useItem',entry.id);};
setInterval(updateFoodButton,100);

// Stable rows keep focus and clicks intact across server snapshots.
const lootRows=new Map();
socket.on('nearbyLoot',drops=>{
 const box=$('nearby-loot'),ids=new Set(drops.map(g=>g.id));
 for(const [id,row] of lootRows)if(!ids.has(id)){row.remove();lootRows.delete(id);}
 if(!drops.length){if(!box.querySelector('p'))box.append(elem('p','helper','No nearby drops.'));return;}
 box.querySelector('p')?.remove();
 for(const g of drops){
  let row=lootRows.get(g.id);
  if(!row){row=elem('button');row.style.cssText='display:block;width:100%;text-align:left;margin:5px 0;font-size:11px';row.onclick=()=>emit('pickup',g.id);lootRows.set(g.id,row);box.append(row);}
  row.disabled=g.access==='reserved';
  const access=g.access==='reserved'?'Reserved '+Math.ceil(g.unlockIn/1000)+'s':g.access==='yours'?'Yours':'Public';
  row.textContent=named(g.item)+' ×'+g.qty+' · '+access+' · '+g.distance+'u · expires '+Math.ceil(g.expiresIn/1000)+'s';
  row.title='Walk to and take this drop. Inventory space and ownership are checked by the server.';
 }
});
socket.on('disconnect',()=>{lootRows.clear();$('nearby-loot').replaceChildren(elem('p','helper','Reconnect to see nearby drops.'));});

let registeredSave=false,saveButtonUntil=0;
socket.on('loginSuccess',data=>{
 registeredSave=!!data.registered;$('save-progress').hidden=!registeredSave;
 $('save-status').textContent=registeredSave?'Autosave every 20s':'Guest progress is temporary';
 saveButtonUntil=0;$('save-progress').disabled=false;
});
socket.on('saveStatus',data=>{
 if(!registeredSave)return;
 $('save-status').textContent=data.state==='saved'?'Snapshot saved at '+new Date(data.at).toLocaleTimeString():data.state==='error'?'Save failed — retry; stay connected':'Saving snapshot…';
});
$('save-progress').onclick=()=>{if(!registeredSave||!socket.connected)return;saveButtonUntil=Date.now()+5000;$('save-progress').disabled=true;emit('saveProgress');};
setInterval(()=>{$('save-progress').disabled=!socket.connected||Date.now()<saveButtonUntil;},250);
socket.on('disconnect',()=>{$('save-status').textContent=registeredSave?'Disconnected — save status unknown':'Guest progress is temporary';});

socket.on('loginSuccess',()=>{trackedQuest=null;$('tracked-quest').hidden=true;});

function updateQuestMapLabel(){const target=profile?.questJournal?.[trackedQuest]?.target;$('quest-map-label').textContent=target?(questsCatalog[trackedQuest]?.name||'Quest')+' — '+target.label:'Track a quest to highlight its objective.';}
socket.on('profile',updateQuestMapLabel);
