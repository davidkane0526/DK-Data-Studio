#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {performance}=require('perf_hooks');
const ROOT=path.resolve(__dirname,'../..');
function loadData(){const c={console,performance,structuredClone,ArrayBuffer,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap};c.window=c;c.globalThis=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(ROOT,'src/core/data/model.js'),'utf8'),c,{filename:'model.js'});return c.DKDSData;}
function q(values,p=.5){const a=[...values].sort((x,y)=>x-y);const x=(a.length-1)*p,l=Math.floor(x),h=Math.ceil(x);return a[l]+(a[h]-a[l])*(x-l);}
function measure(fn,samples=3){const times=[],heaps=[];for(let i=0;i<samples;i++){global.gc?.();const before=process.memoryUsage().heapUsed,t=performance.now(),value=fn(),elapsed=performance.now()-t,after=process.memoryUsage().heapUsed;times.push(elapsed);heaps.push(Math.max(0,after-before));if(!value)throw new Error('benchmark operation returned no value');}return {medianMs:+q(times).toFixed(3),p95Ms:+q(times,.95).toFixed(3),peakHeapMiB:+(Math.max(...heaps)/1048576).toFixed(3)};}
function run({points=1000000,rangeLimit=2048,samples=3}={}){const D=loadData(),x=new Float64Array(points),y=new Float64Array(points);for(let i=0;i<points;i++){x[i]=i;y[i]=Math.sin(i/1000);}const table=D.createTable({id:'bench:table',name:'Column access',columns:[{id:'x',key:'x',dtype:'float64',role:'x',values:x},{id:'y',key:'y',dtype:'float64',role:'y',values:y}],metadata:{dataAssignments:['*']}}),store=D.createStore([table]);return {schema:'dkds.phase-c-column-access/1',appVersion:require(path.join(ROOT,'package.json')).version,points,rangeLimit,samples,results:{fullList:measure(()=>store.list({includeTransient:true}),samples),metadataList:measure(()=>store.listMetadata({includeTransient:true}),samples),fullColumn:measure(()=>store.columnBuffer(table.id,'y'),samples),boundedRange:measure(()=>store.readColumnRange(table.id,'y',{start:Math.floor(points/2),limit:rangeLimit}),samples)},correctness:{metadataHasNoValues:store.listMetadata()[0].columns.every(c=>!Object.prototype.hasOwnProperty.call(c,'values')),rangeLength:store.readColumnRange(table.id,'y',{start:0,limit:rangeLimit}).values.length===Math.min(points,rangeLimit)}};}
if(require.main===module){const report=run({points:Number(process.argv[2])||1000000,rangeLimit:Number(process.argv[3])||2048,samples:Number(process.argv[4])||3});process.stdout.write(JSON.stringify(report,null,2)+'\n');}
module.exports={run};
