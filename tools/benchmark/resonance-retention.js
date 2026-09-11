#!/usr/bin/env node
'use strict';
const path=require('path');
const {spawnSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../..');
const MIB=1048576;

function median(values){
  const rows=[...values].sort((a,b)=>a-b);
  return rows[Math.floor(rows.length/2)];
}
function pct(before,after){return before>0?((before-after)/before)*100:0;}
function gc(){for(let i=0;i<4;i++)global.gc?.();}

function worker(mode='new',n=100000){
  if(typeof global.gc!=='function')throw new Error('worker requires --expose-gc');
  global.window=globalThis;
  require(path.join(ROOT,'src/core/data/model.js'));
  const D=globalThis.DKDSData;
  require(path.join(ROOT,'src/science/common.js'));
  const Peaks=require(path.join(ROOT,'src/science/peaks.js'));
  let v=new Array(n),i=new Array(n);
  for(let k=0;k<n;k++){
    const half=Math.floor(n/2),q=k<half?k:(n-1-k);
    v[k]=-1+2*q/Math.max(1,half-1);
    i[k]=1e-7*Math.sin(v[k]*8)+k*1e-14;
  }
  let table=D.createTable({
    id:'table:resonance-retention-bench',name:'bench',semanticType:'science.transport.iv',
    metadata:{seriesPath:'bench',dataAssignments:['builtin.resonance-workbench'],vg:10},
    columns:[
      {id:'Vd',name:'Vd',role:'x',dtype:'float64',values:v},
      {id:'Id',name:'Id',role:'y',dtype:'float64',values:i}
    ]
  });
  const store=D.createStore([table]);
  v=null;i=null;table=null;gc();
  let rows=store.list({kind:'data.table',includeTransient:true});
  let full=D.transportDatasetsFromArtifacts(rows,{consumer:'builtin.resonance-workbench'});
  rows=null;
  const sweeps=full.flatMap(ds=>Peaks.buildSweeps(ds)||[]);
  let datasets;
  if(mode==='new'){
    datasets=full.map(ds=>{const {points:_points,...meta}=ds;return meta;});
    full=null;
  }else if(mode==='old'){
    datasets=full;
  }else throw new Error(`Unknown mode: ${mode}`);
  gc();
  const mem=process.memoryUsage();
  return {
    mode,n,
    sweeps:sweeps.length,
    sweepPoints:sweeps.reduce((a,s)=>a+(s.points?.length||0),0),
    datasetPoints:datasets.reduce((a,d)=>a+(d.points?.length||0),0),
    heapUsed:mem.heapUsed,rss:mem.rss,
    store:store.storageProfile()
  };
}

function sample(mode,n,samples){
  const rows=[];
  for(let index=0;index<samples;index++){
    const child=spawnSync(process.execPath,['--expose-gc',__filename,'--worker',mode,String(n)],{
      cwd:ROOT,encoding:'utf8',maxBuffer:4*MIB
    });
    if(child.status!==0)throw new Error(child.stderr||child.stdout||`worker exited ${child.status}`);
    rows.push(JSON.parse(child.stdout));
  }
  return {
    mode,samples,n,
    heapUsedMedian:median(rows.map(row=>row.heapUsed)),
    rssMedian:median(rows.map(row=>row.rss)),
    store:rows.at(-1).store,
    sweeps:rows.at(-1).sweeps,
    sweepPoints:rows.at(-1).sweepPoints,
    datasetPoints:rows.at(-1).datasetPoints
  };
}
function run(n=100000,samples=5){
  const oldMode=sample('old',n,samples);
  const newMode=sample('new',n,samples);
  return {
    schema:'dkds.resonance-retention-benchmark/1',
    appVersion:require(path.join(ROOT,'package.json')).version,
    points:n,samples,
    old:oldMode,new:newMode,
    delta:{
      heapReductionPercent:+pct(oldMode.heapUsedMedian,newMode.heapUsedMedian).toFixed(3),
      rssReductionPercent:+pct(oldMode.rssMedian,newMode.rssMedian).toFixed(3),
      heapOldMiB:+(oldMode.heapUsedMedian/MIB).toFixed(3),
      heapNewMiB:+(newMode.heapUsedMedian/MIB).toFixed(3),
      rssOldMiB:+(oldMode.rssMedian/MIB).toFixed(3),
      rssNewMiB:+(newMode.rssMedian/MIB).toFixed(3)
    },
    note:'This isolates the duplicate long-lived source dataset point-object layer. It is not a whole-Electron memory benchmark; V8/allocator pages may remain in RSS after objects are released.'
  };
}

if(require.main===module){
  const args=process.argv.slice(2);
  if(args[0]==='--worker')process.stdout.write(JSON.stringify(worker(args[1],Number(args[2])||100000))+'\n');
  else process.stdout.write(JSON.stringify(run(Number(args[0])||100000,Number(args[1])||5),null,2)+'\n');
}
module.exports={run};
