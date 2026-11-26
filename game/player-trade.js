'use strict';
const {ITEMS,BAG_SLOTS}=require('./content');
const {count,addItem,removeItem}=require('./rules');
const MAX_OFFER_ITEMS=6;
function validProfile(profile){
 if(!profile||!Number.isSafeInteger(profile.gold)||profile.gold<0||!Array.isArray(profile.inventory)||profile.inventory.length>BAG_SLOTS)return false;
 return profile.inventory.every(entry=>entry&&typeof entry.id==='string'&&Object.hasOwn(ITEMS,entry.id)&&Number.isSafeInteger(entry.qty)&&entry.qty>0&&(ITEMS[entry.id].stackable||entry.qty===1));
}
function validateOffer(profile,offer){
 const reject=message=>({ok:false,message});
 if(!validProfile(profile))return reject('Invalid character inventory or gold.');
 if(!offer||typeof offer!=='object'||Array.isArray(offer))return reject('Invalid trade offer.');
 const gold=offer.gold??0,items=offer.items??[];
 if(!Number.isSafeInteger(gold)||gold<0||gold>profile.gold)return reject('You do not have enough gold for this offer.');
 if(!Array.isArray(items)||items.length>MAX_OFFER_ITEMS)return reject('Offer up to '+MAX_OFFER_ITEMS+' different item types.');
 const normalized=[],seen=new Set();
 for(const entry of items){
  if(!entry||typeof entry.id!=='string'||!Object.hasOwn(ITEMS,entry.id)||ITEMS[entry.id].tradeable===false||entry.id==='coin')return reject('This item cannot be traded.');
  if(seen.has(entry.id))return reject('Each item can appear only once in an offer.');
  if(!Number.isSafeInteger(entry.qty)||entry.qty<1||entry.qty>999999||count(profile.inventory,entry.id)<entry.qty)return reject('You do not have enough '+ITEMS[entry.id].name+'.');
  seen.add(entry.id);normalized.push({id:entry.id,qty:entry.qty});
 }
 return {ok:true,offer:{gold,items:normalized}};
}
function reconcileEquipment(profile){
 if(!profile.equipment||typeof profile.equipment!=='object')return;
 for(const slot of Object.keys(profile.equipment))if(profile.equipment[slot]&&!count(profile.inventory,profile.equipment[slot]))profile.equipment[slot]=null;
 if(!profile.equipment.weapon)profile.combatStyle='accurate';
}
function planPlayerTrade(profileA,profileB,offerA,offerB){
 const reject=message=>({ok:false,message});
 if(!validProfile(profileA)||!validProfile(profileB))return reject('Invalid character profile.');
 const a=validateOffer(profileA,offerA),b=validateOffer(profileB,offerB);
 if(!a.ok)return a;if(!b.ok)return b;
 const nextA=structuredClone(profileA),nextB=structuredClone(profileB);
 for(const entry of a.offer.items)if(!removeItem(nextA.inventory,entry.id,entry.qty))return reject('The first offer changed. Review the trade again.');
 for(const entry of b.offer.items)if(!removeItem(nextB.inventory,entry.id,entry.qty))return reject('The second offer changed. Review the trade again.');
 nextA.gold-=a.offer.gold;nextB.gold-=b.offer.gold;
 nextA.gold+=b.offer.gold;nextB.gold+=a.offer.gold;
 if(!Number.isSafeInteger(nextA.gold)||!Number.isSafeInteger(nextB.gold)||nextA.gold<0||nextB.gold<0)return reject('Gold limit reached.');
 for(const entry of b.offer.items)if(!addItem(nextA.inventory,entry.id,entry.qty))return reject('Your inventory has no room for '+ITEMS[entry.id].name+'.');
 for(const entry of a.offer.items)if(!addItem(nextB.inventory,entry.id,entry.qty))return reject('Your partner has no room for '+ITEMS[entry.id].name+'.');
 reconcileEquipment(nextA);reconcileEquipment(nextB);
 return {ok:true,message:'Player trade completed.',profileA:nextA,profileB:nextB};
}
module.exports={MAX_OFFER_ITEMS,validProfile,validateOffer,planPlayerTrade};
