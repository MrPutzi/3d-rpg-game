'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/client.js'),'utf8');
test('trade UI blocks double clicks and gameplay until a committed or rejected response',()=>{
 const sent=[],handlers={},nodes={};let renders=0;
 const context=vm.createContext({socket:{connected:true,emit:(...args)=>sent.push(args),on:(n,f)=>handlers[n]=f},renderBuilding:()=>renders++,notify:()=>{},closeBuilding:()=>{},$:id=>nodes[id]??=( {} )});
 const emit=source.match(/^function emit\(action,data\).*$/m)[0];
 const status=source.match(/^socket.on\('tradeStatus'.*$/m)[0];
 vm.runInContext('let tradeBusy=false,entered=true,profile={gold:100};'+emit+'\n'+status,context);
 vm.runInContext("emit('buy',{id:'bread',qty:1});emit('buy',{id:'bread',qty:1});emit('dropItem','bread');",context);
 assert.equal(sent.length,1);assert.equal(renders,1);
 handlers.tradeStatus({state:'pending'});assert.equal(vm.runInContext('profile.gold',context),100);
 handlers.tradeStatus({state:'done',ok:false});vm.runInContext("emit('sell',{id:'bread',qty:1})",context);assert.equal(sent.length,2);
 handlers.tradeStatus({state:'unknown',message:'Reload'});assert.equal(nodes['login-overlay'].hidden,false);
 vm.runInContext("emit('buy',{id:'bread',qty:1})",context);assert.equal(sent.length,2,'unknown result must not replay a trade');
});
