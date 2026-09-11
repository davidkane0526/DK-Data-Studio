'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const context={console,structuredClone,ArrayBuffer,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8'),context,{filename:'model.js'});
const D=context.DKDSData,table=D.createTable({id:'table:kernel',name:'Kernel table',columns:[{id:'cx',key:'x',name:'X',dtype:'float64',values:[0,1,2,3]},{id:'cy',key:'y',name:'Y',dtype:'float64',values:[10,11,12,13]}]}),store=D.createStore([table]);
let fullGets=0;const artifacts={...store,get(id){fullGets+=1;return store.get(id);},listMetadata:o=>store.listMetadata(o),columnMetadata:id=>store.columnMetadata(id),readColumnRange:(id,ref,o)=>store.readColumnRange(id,ref,o)};
vm.runInContext(fs.readFileSync(path.join(root,'src/core/host/studio-kernel-runtime.js'),'utf8'),context,{filename:'kernel.js'});context.DKDSKernel.configure({artifacts:()=>artifacts});
(async()=>{
 const listed=await context.DKDSKernel.call('data.artifacts.list',{includeTransient:true});assert.strictEqual(fullGets,0,'Kernel metadata listing must not hydrate full Artifacts.');assert.strictEqual(listed[0].columns.length,2);assert(!('values' in listed[0].columns[0]));
 const columns=await context.DKDSKernel.call('data.artifacts.columns',{id:table.id});assert.strictEqual(columns[1].key,'y');assert.strictEqual(fullGets,0);
 const range=await context.DKDSKernel.call('data.artifacts.column-range',{id:table.id,column:'y',start:1,limit:2});assert.deepStrictEqual(Array.from(range.values),[11,12]);assert.strictEqual(range.totalLength,4);assert.strictEqual(fullGets,0);
 const preview=await context.DKDSKernel.call('data.artifacts.preview',{id:table.id,limit:2});assert.strictEqual(fullGets,0,'DataTable preview must use bounded column ranges instead of get().');assert.deepStrictEqual(Array.from(preview.rows,r=>[r.x,r.y]),[[0,10],[1,11]]);assert.strictEqual(preview.truncated,true);
 console.log('v3.68.78 Kernel/MCP metadata + bounded table preview path passed.');
})().catch(err=>{console.error(err?.stack||err);process.exit(2);});
