'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/client.js'),'utf8');
test('bank search trims input, ignores case and supports clearing without touching inventory',()=>{
 const ctx=vm.createContext({named:id=>({iron_ore:'Iron ore',bread:'Bread'}[id])});
 vm.runInContext(source.match(/function bankMatches\(id,query\)\{[\s\S]*?\n\}/)[0],ctx);
 assert.equal(vm.runInContext("bankMatches('iron_ore',' IRON ')",ctx),true);
 assert.equal(vm.runInContext("bankMatches('bread','iron')",ctx),false);
 assert.equal(vm.runInContext("bankMatches('bread','')",ctx),true);
});
test('guild displays actual quest name, readiness and giver',()=>{
 const ctx=vm.createContext({profile:{questJournal:{herbal_supplies:{message:'Bring 2 tonics',giverName:'Thorin'}}},questsCatalog:{herbal_supplies:{name:'Tonics for Westwood'}},names:{}});
 vm.runInContext(source.match(/function guildQuestDetails\(id,q\)\{[\s\S]*?\n\}/)[0],ctx);
 assert.equal(vm.runInContext("guildQuestDetails('herbal_supplies',{status:'active'})",ctx),'Tonics for Westwood · Bring 2 tonics · Thorin');
});
