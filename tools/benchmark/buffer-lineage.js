#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {performance}=require('perf_hooks');
const ROOT=path.resolve(__dirname,'../..');
const MODEL_PATH=process.env.DKDS_MODEL_PATH||path.join(ROOT,'src/core/data/model.js');
function loadData(){const c={console,performance,structuredClone,ArrayBuffer,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap,Promise};c.window=c;c.globalThis=c;vm.createContext(c);vm.runInContext(fs.readFileSync(MODEL_PATH,'utf8'),c,{filename:'model.js'});return c.DKDSData;}
function q(values,p=.5){const a=[...values].sort((x,y)=>x-y),x=(a.length-1)*p,l=Math.floor(x),h=Math.ceil(x);return a[l]+(a[h]-a[l])*(x-l);}
function measurePrepared(setup,run,samples=5){const times=[];let last=null;for(let i=0;i<samples;i++){const state=setup();global.gc?.();const t=performance.now();last=run(state);times.push(performance.now()-t);}return {medianMs:+q(times).toFixed(3),p95Ms:+q(times,.95).toFixed(3),last};}
function makeTable(D,id,parent=null,value=0){return D.createTable({id,lineage:{parents:parent?[parent]:[]},columns:[{id:`col:${id}`,key:'v',dtype:'float64',values:[value]}]});}
function run({artifacts=1000,samples=5}={}){
  const D=loadData();
  const create=measurePrepared(()=>{const rows=[];for(let i=0;i<artifacts;i++)rows.push(makeTable(D,`chain:${i}`,i?`chain:${i-1}`:null,i));return rows;},rows=>{const store=D.createStore(rows);return {store,size:store.size()};},samples);
  const move=measurePrepared(()=>{const rootA=makeTable(D,'root:a',null,1),rootB=makeTable(D,'root:b',null,2),rows=[rootA,rootB];for(let i=0;i<artifacts;i++)rows.push(makeTable(D,`child:${i}`,rootA.id,i));return {rootA,rootB,store:D.createStore(rows)};},state=>{state.store.batch(api=>{for(let i=0;i<artifacts;i++){const row=api.get(`child:${i}`);row.lineage.parents=[state.rootB.id];api.upsert(row);}});return state;},samples);
  const createCorrect=create.last.size===artifacts&&create.last.store.lineage(`chain:${artifacts-1}`).ancestors.length===Math.max(0,artifacts-1),moveCorrect=move.last.store.children(move.last.rootA.id).length===0&&move.last.store.children(move.last.rootB.id).length===artifacts;
  const preciseSupported=typeof D.createStore([]).columnRevision==='function';
  let precise=null;
  if(preciseSupported){
    const table=D.createTable({id:'revision:table',columns:[{id:'x',key:'x',dtype:'float64',values:[0,1,2]},{id:'y',key:'y',dtype:'float64',values:[10,11,12]}]}),store=D.createStore([table]),x=store.columnBuffer(table.id,'x'),y=store.columnBuffer(table.id,'y'),artifactBefore=store.artifactRevision(table.id),xBefore=x.bufferRevision,yBefore=y.bufferRevision;
    store.transactColumn(y,draft=>{draft[1]=99;});
    precise={artifactAdvanced:store.artifactRevision(table.id)>artifactBefore,xStable:store.columnRevision(table.id,'x')===xBefore,yAdvanced:store.columnRevision(table.id,'y')>yBefore,xTransactionStillValid:store.transactColumn(x,draft=>{draft[0]=5;}).changed===true};
  }
  return {schema:'dkds.phase-c-buffer-lineage/1',appVersion:require(path.join(ROOT,'package.json')).version,modelPath:MODEL_PATH,artifacts,samples,results:{lineageCreate:{medianMs:create.medianMs,p95Ms:create.p95Ms},lineageBatchMove:{medianMs:move.medianMs,p95Ms:move.p95Ms}},correctness:{createSize:createCorrect,tailAncestors:createCorrect,moveFinalEdges:moveCorrect,preciseSupported,...(precise||{})}};
}
if(require.main===module)process.stdout.write(JSON.stringify(run({artifacts:Number(process.argv[2])||1000,samples:Number(process.argv[3])||5}),null,2)+'\n');
module.exports={run};
