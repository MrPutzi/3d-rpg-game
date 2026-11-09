'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID} = require('node:crypto');

// One owner per file/process. Not a cross-process lock or PostgreSQL adapter.
// All writers must use the same store instance.
async function openSnapshot(filename, initialState, {encode = value => value, decode = value => value} = {}) {
 let state, poisoned = false, queue = Promise.resolve();
 const clone = value => JSON.parse(JSON.stringify(value));
 const valid = value => value && Number.isSafeInteger(value.revision) && value.revision >= 0;
 async function replace(next) {
  const temporary = filename + '.' + randomUUID() + '.tmp';
  let handle, renamed = false;
  try {
   handle = await fs.open(temporary, 'wx', 0o600);
   await handle.writeFile(JSON.stringify(encode(next)));
   await handle.sync();
   await handle.close(); handle = null;
   await fs.rename(temporary, filename); renamed = true;
   const directory = await fs.open(path.dirname(filename), 'r');
   try { await directory.sync(); } finally { await directory.close(); }
  } catch (error) {
   // A rename followed by an fsync error has an uncertain durable outcome.
   // Refuse further writes until reopened from disk; never reuse stale state.
   if (renamed) poisoned = true;
   throw error;
  } finally {
   if (handle) await handle.close().catch(() => {});
   await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') poisoned = true; });
  }
 }
 await fs.mkdir(path.dirname(filename), {recursive:true});
 try { state = decode(JSON.parse(await fs.readFile(filename, 'utf8'))); }
 catch (error) {
  if (error.code !== 'ENOENT') throw error;
  state = {revision:0, data:clone(initialState)};
  await replace(state);
 }
 if (!valid(state) || !Object.hasOwn(state, 'data')) throw Error('Invalid snapshot');
 return {
  read() { if (poisoned) throw Error('Reopen snapshot after uncertain write'); return clone(state); },
  update(expectedRevision, transform) {
   const job = queue.then(async () => {
    if (poisoned) throw Error('Reopen snapshot after uncertain write');
    if (expectedRevision !== state.revision) throw Error('Stale snapshot revision');
    if (!Number.isSafeInteger(state.revision + 1)) throw Error('Snapshot revision exhausted');
    const data = clone(await transform(clone(state.data)));
    const next = {revision:state.revision + 1, data};
    await replace(next);
    state = next;
    return clone(state);
   });
   queue = job.catch(() => {});
   return job;
  }
 };
}
module.exports = {openSnapshot};
