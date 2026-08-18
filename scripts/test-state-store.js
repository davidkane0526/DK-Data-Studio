const assert=require('assert');const fs=require('fs');const vm=require('vm');const path=require('path');
const src=fs.readFileSync(path.resolve(__dirname,'../src/core/state-store.js'),'utf8');
const context={window:{},structuredClone:global.structuredClone,JSON,console};vm.createContext(context);vm.runInContext(src,context);
const {create}=context.window.DKDSState;const store=create({n:1,nested:{a:2}},{historyLimit:3});
let seen=0;store.subscribe(()=>seen++);store.patch({n:2});assert.equal(store.get().n,2);assert.equal(seen,1);
store.update(d=>{d.nested.a=7});assert.equal(store.get().nested.a,7);assert(store.canUndo());store.undo();assert.equal(store.get().nested.a,2);store.redo();assert.equal(store.get().nested.a,7);
const snap=store.snapshot();snap.nested.a=99;assert.equal(store.get().nested.a,7,'snapshot must be detached');
store.reset();assert.equal(store.get().n,1);console.log('State store checks passed.');
