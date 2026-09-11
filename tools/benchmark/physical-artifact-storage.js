#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../..');
const MIB=1048576;
function loadData(){const c={console,structuredClone,ArrayBuffer,DataView,Float64Array,Float32Array,Int32Array,Uint32Array,Int16Array,Uint16Array,Int8Array,Uint8Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap,Promise};c.window=c;c.globalThis=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(ROOT,'src/core/data/model.js'),'utf8'),c,{filename:'model.js'});return c.DKDSData;}
function gc(){for(let i=0;i<4;i++)global.gc?.();}
function fixture(D,scenario){
  if(scenario==='table'){const n=1000000,x=new Array(n),y=new Array(n);for(let i=0;i<n;i++){x[i]=i*.001;y[i]=Math.sin(i*.001);}return D.createTable({id:'physical:table',columns:[{id:'x',key:'x',dtype:'float64',values:x},{id:'y',key:'y',dtype:'float64',values:y}]});}
  if(scenario==='series'){const n=1000000,x=new Array(n),y=new Array(n);for(let i=0;i<n;i++){x[i]=i*.001;y[i]=Math.sin(i*.001);}return D.createSeries({id:'physical:series',x,y});}
  if(scenario==='matrix'){const n=500,x=Array.from({length:n},(_,i)=>i),y=Array.from({length:n},(_,i)=>i),z=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>Math.sin(r*.01)*Math.cos(c*.01)));return D.createMatrix({id:'physical:matrix',x,y,z});}
  throw new Error(`Unknown scenario: ${scenario}`);
}
function worker(scenario){const D=loadData();gc();const before=process.memoryUsage();let store;{const artifact=fixture(D,scenario);store=D.createStore([artifact]);}gc();const resident=process.memoryUsage();const id=scenario==='table'?'physical:table':scenario==='series'?'physical:series':'physical:matrix';const snapshot=store.get(id);gc();const afterRead=process.memoryUsage();return {scenario,residentHeapMiB:+((resident.heapUsed-before.heapUsed)/MIB).toFixed(3),residentRssMiB:+((resident.rss-before.rss)/MIB).toFixed(3),fullReadHeapMiB:+(Math.max(0,afterRead.heapUsed-resident.heapUsed)/MIB).toFixed(3),storageProfile:store.storageProfile(),checksum:scenario==='matrix'?snapshot.z[499][499]:scenario==='series'?snapshot.y.at(-1):snapshot.columns[1].values.at(-1)};}
function median(values){const rows=[...values].sort((a,b)=>a-b);return rows[Math.floor(rows.length/2)];}
function run(samples=3){const scenarios=['table','series','matrix'],results=[];for(const scenario of scenarios){const rows=[];for(let i=0;i<samples;i++){const child=spawnSync(process.execPath,['--expose-gc',__filename,'--worker',scenario],{cwd:ROOT,encoding:'utf8',maxBuffer:4*MIB});if(child.status!==0)throw new Error(child.stderr||child.stdout);rows.push(JSON.parse(child.stdout));}results.push({scenario,samples,residentHeapMiB:+median(rows.map(r=>r.residentHeapMiB)).toFixed(3),residentRssMiB:+median(rows.map(r=>r.residentRssMiB)).toFixed(3),fullReadHeapMiB:+median(rows.map(r=>r.fullReadHeapMiB)).toFixed(3),storageProfile:rows.at(-1).storageProfile,checksum:rows.at(-1).checksum});}return {schema:'dkds.phase-c-physical-storage/1',appVersion:require(path.join(ROOT,'package.json')).version,samples,results};}
if(require.main===module){const args=process.argv.slice(2);if(args[0]==='--worker')process.stdout.write(JSON.stringify(worker(args[1]))+'\n');else process.stdout.write(JSON.stringify(run(Number(args[0])||3),null,2)+'\n');}
module.exports={run};
