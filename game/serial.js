'use strict';
// Independent accounts run concurrently; operations for one account run in order.
function serialQueue(){
 const pending=new Map();
 function run(key,operation){
  const next=(pending.get(key)||Promise.resolve()).catch(()=>{}).then(operation);
  pending.set(key,next);
  const clear=()=>{if(pending.get(key)===next)pending.delete(key);};
  next.then(clear,clear);return next;
 }
 return {run,wait:key=>pending.get(key)||Promise.resolve(),size:()=>pending.size};
}
module.exports={serialQueue};
