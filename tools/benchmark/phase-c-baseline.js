#!/usr/bin/env node
'use strict';

const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {performance}=require('perf_hooks');
const {spawnSync}=require('child_process');

const ROOT=path.resolve(__dirname,'../..');
const APP_VERSION=require(path.join(ROOT,'package.json')).version;
const MIB=1024*1024;

const PROFILES=Object.freeze({
  smoke:Object.freeze({
    samples:2,warmup:0,
    workloads:Object.freeze({curve100k:4000,curve1m:8000,matrix:24,artifacts:40,plots:4,plotPoints:200})
  }),
  full:Object.freeze({
    samples:5,warmup:1,
    workloads:Object.freeze({curve100k:100000,curve1m:1000000,matrix:500,artifacts:1000,plots:20,plotPoints:2000})
  })
});

const SCENARIOS=Object.freeze([
  Object.freeze({id:'curve-100k',title:'100k-point curve',kind:'curve',workload:'curve100k',currentContractCopyPasses:6}),
  Object.freeze({id:'curve-1m',title:'1M-point curve',kind:'curve',workload:'curve1m',currentContractCopyPasses:6}),
  Object.freeze({id:'matrix-500',title:'500×500 matrix',kind:'matrix',workload:'matrix',currentContractCopyPasses:4}),
  Object.freeze({id:'artifacts-1000',title:'1000 small Artifacts',kind:'artifacts',workload:'artifacts',currentContractCopyPasses:4}),
  Object.freeze({id:'plots-20',title:'20 live plots',kind:'plots',workload:'plots',currentContractCopyPasses:1})
]);

function numberArg(value,fallback,{min=0}={}){
  const parsed=Number(value);
  return Number.isFinite(parsed)?Math.max(min,Math.floor(parsed)):fallback;
}

function parseArgs(argv){
  const out={};
  for(let index=0;index<argv.length;index+=1){
    const token=String(argv[index]||'');
    if(!token.startsWith('--'))continue;
    const key=token.slice(2),next=argv[index+1];
    if(next!==undefined&&!String(next).startsWith('--')){out[key]=next;index+=1;}else out[key]=true;
  }
  return out;
}

function round(value,digits=3){
  const scale=10**digits;
  return Math.round((Number(value)||0)*scale)/scale;
}

function quantile(values,q){
  const rows=(values||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!rows.length)return 0;
  if(rows.length===1)return rows[0];
  const position=(rows.length-1)*Math.min(1,Math.max(0,Number(q)||0));
  const lower=Math.floor(position),upper=Math.ceil(position),weight=position-lower;
  return rows[lower]+(rows[upper]-rows[lower])*weight;
}

function memory(){
  const row=process.memoryUsage();
  return {heapUsed:row.heapUsed,rss:row.rss,arrayBuffers:row.arrayBuffers||0};
}

function updatePeak(peak,current=memory()){
  peak.heapUsed=Math.max(peak.heapUsed,current.heapUsed);
  peak.rss=Math.max(peak.rss,current.rss);
  peak.arrayBuffers=Math.max(peak.arrayBuffers,current.arrayBuffers);
  return current;
}

function loadDataRuntime(){
  const context={console,performance,structuredClone,ArrayBuffer,Float32Array,Float64Array,Int8Array,Uint8Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap};
  context.window=context;context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/core/data/model.js'),'utf8'),context,{filename:'src/core/data/model.js'});
  return context.DKDSData;
}

function phaseTimer(phases,probe,name,fn){
  const started=performance.now();
  const value=fn();
  phases[name]=(phases[name]||0)+(performance.now()-started);
  probe();
  return value;
}

function curveFixture(points){
  const x=new Float64Array(points),y=new Float64Array(points);
  for(let index=0;index<points;index+=1){const value=index/Math.max(1,points-1);x[index]=value;y[index]=Math.sin(value*24)*Math.exp(-value*.15);}
  return {x,y};
}

function matrixFixture(size){
  const x=new Float64Array(size),y=new Float64Array(size),z=new Array(size);
  for(let row=0;row<size;row+=1){
    x[row]=row;y[row]=row;
    const values=new Float64Array(size);
    for(let column=0;column<size;column+=1)values[column]=Math.sin(row*.01)*Math.cos(column*.01);
    z[row]=values;
  }
  return {x,y,z};
}

function createPlotRuntime(){
  const frames=[];
  let renderCalls=0;
  const classList=()=>({add(){},remove(){},toggle(){}});
  const chartScope={
    react(target,traces,layout,config){renderCalls+=1;target.data=traces;target.layout=layout;target._context=config;return target;},
    bind(){return()=>{};},resize(){return true;},purge(){return true;},restyle(){return true;},relayout(){return true;},
    adoptDisplayScale(){},clearLegendSelection(){},selectLegendForTrace(){}
  };
  const context={
    console,performance,structuredClone,setTimeout,clearTimeout,
    requestAnimationFrame:callback=>{frames.push(callback);return frames.length;},cancelAnimationFrame(){},
    document:{getElementById(){return null;},querySelector(){return null;}},
    DKDSCharts:{createScope:()=>chartScope},DKDSPerformance:{skip(){}},
    localStorage:{getItem(){return null;},setItem(){}}
  };
  context.window=context;context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/core/scientific/plot-runtime.js'),'utf8'),context,{filename:'src/core/scientific/plot-runtime.js'});
  return {
    runtime:context.DKDSScientificPlot,
    frames,
    renderCalls:()=>renderCalls,
    resetCalls:()=>{renderCalls=0;},
    target:index=>({nodeType:1,id:`bench-plot-${index}`,dataset:{},classList:classList(),data:[],addEventListener(){},removeEventListener(){}})
  };
}

function fixtureFor(scenario,config){
  const amount=config.workloads[scenario.workload];
  if(scenario.kind==='curve')return {data:loadDataRuntime(),amount,input:curveFixture(amount)};
  if(scenario.kind==='matrix')return {data:loadDataRuntime(),amount,input:matrixFixture(amount)};
  if(scenario.kind==='artifacts')return {data:loadDataRuntime(),amount};
  if(scenario.kind==='plots')return {plot:createPlotRuntime(),amount,plotPoints:config.workloads.plotPoints};
  throw new Error(`Unknown benchmark kind: ${scenario.kind}`);
}

async function runCurveSample(fixture,probe){
  const phases={},D=fixture.data;
  let artifact=phaseTimer(phases,probe,'factory',()=>D.createSeries({id:'bench:curve',name:'Benchmark Curve',x:fixture.input.x,y:fixture.input.y}));
  let store=phaseTimer(phases,probe,'store-create',()=>D.createStore());
  phaseTimer(phases,probe,'store-write',()=>store.add(artifact));
  let read=phaseTimer(phases,probe,'store-read',()=>store.get(artifact.id));
  const fingerprint=phaseTimer(phases,probe,'fingerprint',()=>store.fingerprint(artifact.id));
  const checksum=round(read.x[0]+read.y[read.length-1]+read.length+fingerprint.length,6);
  artifact=null;read=null;store=null;
  return {phases,checksum};
}

async function runMatrixSample(fixture,probe){
  const phases={},D=fixture.data;
  let artifact=phaseTimer(phases,probe,'factory',()=>D.createMatrix({id:'bench:matrix',name:'Benchmark Matrix',x:fixture.input.x,y:fixture.input.y,z:fixture.input.z}));
  let store=phaseTimer(phases,probe,'store-create',()=>D.createStore());
  phaseTimer(phases,probe,'store-write',()=>store.add(artifact));
  let read=phaseTimer(phases,probe,'store-read',()=>store.get(artifact.id));
  const checksum=round(read.x.length+read.y.length+read.z.length+read.z[0].length+read.z.at(-1).at(-1),6);
  artifact=null;read=null;store=null;
  return {phases,checksum};
}

async function runArtifactsSample(fixture,probe){
  const phases={},D=fixture.data;
  let artifacts=phaseTimer(phases,probe,'factory',()=>Array.from({length:fixture.amount},(_,index)=>D.createAnalysisResult({
    id:`bench:artifact:${index}`,name:`Artifact ${index}`,summary:{index,score:index%17},payload:{values:[index,index+1,index+2,index+3]}
  })));
  let store=phaseTimer(phases,probe,'store-create',()=>D.createStore());
  phaseTimer(phases,probe,'store-write',()=>store.batch(api=>artifacts.forEach(artifact=>api.add(artifact))));
  let rows=phaseTimer(phases,probe,'store-list',()=>store.list());
  const checksum=rows.length+store.revision()+rows.at(-1).payload.values[3];
  artifacts=null;rows=null;store=null;
  return {phases,checksum};
}

async function drainFrames(plot,promises,expected,probe){
  let turns=0,maxFrameBlockMs=0;
  while(plot.renderCalls()<expected){
    const callback=plot.frames.shift();
    if(!callback){await new Promise(resolve=>setImmediate(resolve));continue;}
    const started=performance.now();callback(performance.now());maxFrameBlockMs=Math.max(maxFrameBlockMs,performance.now()-started);
    turns+=1;probe();
    await new Promise(resolve=>setImmediate(resolve));
    if(turns>expected*3)throw new Error('ScientificPlot benchmark queue did not drain.');
  }
  await Promise.all(promises);
  return {turns,maxFrameBlockMs};
}

async function runPlotsSample(fixture,probe){
  const phases={},plot=fixture.plot;
  plot.resetCalls();plot.frames.splice(0);
  const scope=plot.runtime.createScope('benchmark.phase-c');
  const targets=Array.from({length:fixture.amount},(_,index)=>plot.target(index));
  const x=Array.from({length:fixture.plotPoints},(_,index)=>index),y=x.map(value=>Math.sin(value*.02));
  const enqueueStarted=performance.now();
  const promises=targets.map((target,index)=>scope.react(target,[{name:`Curve ${index}`,x,y,line:{width:1.5}}],{xaxis:{},yaxis:{}},{responsive:true},{renderPriority:index===0?'frame':'idle',renderKey:`bench-${index}`}));
  phases.enqueue=performance.now()-enqueueStarted;probe();
  const drainStarted=performance.now();
  const drained=await drainFrames(plot,promises,fixture.amount,probe);
  phases['queue-drain']=performance.now()-drainStarted;
  phases['max-frame-callback']=drained.maxFrameBlockMs;
  probe();
  const checksum=plot.renderCalls()+drained.turns+targets.reduce((sum,target)=>sum+(target.data?.[0]?.x?.length||0),0);
  scope.dispose();targets.forEach(target=>{target.data=[];});
  return {phases,checksum};
}

async function runOneSample(scenario,fixture,baseline,peak){
  const probe=()=>updatePeak(peak);
  if(scenario.kind==='curve')return runCurveSample(fixture,probe);
  if(scenario.kind==='matrix')return runMatrixSample(fixture,probe);
  if(scenario.kind==='artifacts')return runArtifactsSample(fixture,probe);
  if(scenario.kind==='plots')return runPlotsSample(fixture,probe);
  throw new Error(`Unsupported benchmark scenario: ${scenario.id}`);
}

function aggregateSamples(scenario,fixture,samples){
  const phaseNames=[...new Set(samples.flatMap(sample=>Object.keys(sample.phases)))];
  const phaseStats=Object.fromEntries(phaseNames.map(name=>{
    const values=samples.map(sample=>sample.phases[name]);
    return [name,{medianMs:round(quantile(values,.5)),p95Ms:round(quantile(values,.95)),maxMs:round(Math.max(...values))}];
  }));
  const totals=samples.map(sample=>sample.totalMs),blocks=samples.map(sample=>sample.blockingMs);
  return {
    id:scenario.id,title:scenario.title,kind:scenario.kind,
    workload:scenario.kind==='plots'?{plots:fixture.amount,pointsPerPlot:fixture.plotPoints}:scenario.kind==='matrix'?{rows:fixture.amount,columns:fixture.amount}:scenario.kind==='artifacts'?{artifacts:fixture.amount}:{points:fixture.amount},
    samples:samples.length,
    total:{medianMs:round(quantile(totals,.5)),p95Ms:round(quantile(totals,.95)),maxMs:round(Math.max(...totals))},
    blocking:{medianMs:round(quantile(blocks,.5)),p95Ms:round(quantile(blocks,.95)),maxMs:round(Math.max(...blocks))},
    memory:{
      peakHeapDeltaMiB:round(Math.max(...samples.map(sample=>sample.peakHeapDeltaBytes))/MIB),
      peakRssDeltaMiB:round(Math.max(...samples.map(sample=>sample.peakRssDeltaBytes))/MIB),
      peakArrayBufferDeltaMiB:round(Math.max(...samples.map(sample=>sample.peakArrayBufferDeltaBytes))/MIB),
      processPeakRssMiB:round((process.resourceUsage().maxRSS*1024)/MIB)
    },
    currentContractCopyPasses:scenario.currentContractCopyPasses,
    phases:phaseStats,
    checksum:samples.at(-1)?.checksum??null
  };
}

async function runWorker(scenario,config){
  const fixture=fixtureFor(scenario,config),samples=[];
  const totalRuns=config.warmup+config.samples;
  for(let index=0;index<totalRuns;index+=1){
    global.gc?.();
    const baseline=memory(),peak={...baseline},started=performance.now();
    const result=await runOneSample(scenario,fixture,baseline,peak);
    const totalMs=performance.now()-started;
    updatePeak(peak);
    const blockingMs=Math.max(0,...Object.entries(result.phases).filter(([name])=>name!=='queue-drain').map(([,value])=>Number(value)||0));
    if(index>=config.warmup)samples.push({
      totalMs,blockingMs,phases:result.phases,checksum:result.checksum,
      peakHeapDeltaBytes:Math.max(0,peak.heapUsed-baseline.heapUsed),
      peakRssDeltaBytes:Math.max(0,peak.rss-baseline.rss),
      peakArrayBufferDeltaBytes:Math.max(0,peak.arrayBuffers-baseline.arrayBuffers)
    });
    global.gc?.();
  }
  return aggregateSamples(scenario,fixture,samples);
}

function environmentSnapshot(){
  const cpus=os.cpus()||[];
  return {
    platform:process.platform,release:os.release(),arch:process.arch,node:process.version,
    cpu:cpus[0]?.model||'unknown',logicalCores:cpus.length,totalMemoryMiB:round(os.totalmem()/MIB,1),
    exposedGc:true
  };
}

function runChild(scenario,profile,samples,warmup){
  const result=spawnSync(process.execPath,['--expose-gc',__filename,'--worker',scenario.id,'--profile',profile,'--samples',String(samples),'--warmup',String(warmup)],{
    cwd:ROOT,encoding:'utf8',maxBuffer:20*MIB,env:{...process.env,DKDS_PHASE_C_BENCHMARK_CHILD:'1'}
  });
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`Benchmark ${scenario.id} failed (${result.status}): ${String(result.stderr||result.stdout).trim()}`);
  try{return JSON.parse(String(result.stdout||'').trim());}
  catch(error){throw new Error(`Benchmark ${scenario.id} returned invalid JSON: ${error.message}`);}
}

async function runBenchmark(options={}){
  const profile=String(options.profile||'full');
  const base=PROFILES[profile];
  if(!base)throw new Error(`Unknown benchmark profile: ${profile}`);
  const samples=numberArg(options.samples,base.samples,{min:1}),warmup=numberArg(options.warmup,base.warmup,{min:0});
  const results=SCENARIOS.map(scenario=>runChild(scenario,profile,samples,warmup));
  const ranking=[...results].sort((a,b)=>b.total.p95Ms-a.total.p95Ms).map((row,index)=>({rank:index+1,id:row.id,p95Ms:row.total.p95Ms,peakHeapDeltaMiB:row.memory.peakHeapDeltaMiB}));
  return {
    schema:'dkds.phase-c-baseline/1',appVersion:APP_VERSION,capturedAt:new Date().toISOString(),profile,samples,warmup,
    environment:environmentSnapshot(),
    methodology:{
      isolation:'Each scenario runs in a fresh Node process with explicit GC between samples.',
      timing:'Fixture construction is excluded; Core factory, Store and scheduler operations are included.',
      memory:'Peak deltas are sampled at Core phase boundaries; processPeakRssMiB is the per-process high-water mark.',
      copyPasses:'currentContractCopyPasses is a static trace of full-payload boundary passes, not a profiler counter.',
      interpretation:'Results are same-machine trend baselines, not cross-machine release thresholds.',
      rendererScope:'The 20-plot case measures Core ScientificPlot cloning, mapping and frame scheduling with a deterministic chart adapter; D3 layout, GPU and paint are excluded.'
    },
    results,ranking
  };
}

function workloadLabel(row){
  if(row.workload.points)return `${row.workload.points.toLocaleString('en-US')} points`;
  if(row.workload.rows)return `${row.workload.rows}×${row.workload.columns}`;
  if(row.workload.artifacts)return `${row.workload.artifacts} Artifacts`;
  return `${row.workload.plots} × ${row.workload.pointsPerPlot} points`;
}

function markdownReport(report){
  const lines=[
    `# DKDS Phase C performance baseline — ${report.appVersion}`,'',
    '> This report is a same-machine trend baseline. It does not define portable pass/fail time limits.','',
    '## Environment','',
    '| Item | Value |','| --- | --- |',
    `| Captured | ${report.capturedAt} |`,`| Platform | ${report.environment.platform} ${report.environment.release} (${report.environment.arch}) |`,
    `| Node | ${report.environment.node} |`,`| CPU | ${report.environment.cpu} |`,`| Logical cores | ${report.environment.logicalCores} |`,
    `| System memory | ${report.environment.totalMemoryMiB} MiB |`,`| Samples | ${report.samples} measured + ${report.warmup} warm-up per scenario |`,'',
    '## Results','',
    '| Rank | Scenario | Workload | Median | p95 | p95 blocking | Peak heap Δ | Peak RSS Δ | Process peak RSS | Contract copy passes |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];
  const ranks=new Map(report.ranking.map(row=>[row.id,row.rank]));
  for(const row of report.results)lines.push(`| ${ranks.get(row.id)} | ${row.title} | ${workloadLabel(row)} | ${row.total.medianMs} ms | ${row.total.p95Ms} ms | ${row.blocking.p95Ms} ms | ${row.memory.peakHeapDeltaMiB} MiB | ${row.memory.peakRssDeltaMiB} MiB | ${row.memory.processPeakRssMiB} MiB | ${row.currentContractCopyPasses} |`);
  lines.push('','## Phase breakdown','');
  for(const row of report.results){
    lines.push(`### ${row.title}`,'','| Phase | Median | p95 |','| --- | ---: | ---: |');
    for(const [name,stats] of Object.entries(row.phases))lines.push(`| ${name} | ${stats.medianMs} ms | ${stats.p95Ms} ms |`);
    lines.push('');
  }
  const top=report.ranking[0],copyHeavy=[...report.results].sort((a,b)=>b.currentContractCopyPasses-a.currentContractCopyPasses)[0];
  lines.push('## Bottleneck order','');
  for(const row of report.ranking)lines.push(`${row.rank}. **${row.id}**: p95 ${row.p95Ms} ms; peak heap delta ${row.peakHeapDeltaMiB} MiB.`);
  lines.push('',`The highest measured end-to-end cost is **${top.id}**. The current contract's largest statically traced full-payload copy count is **${copyHeavy.id}** (${copyHeavy.currentContractCopyPasses} passes). These are separate signals and should not be collapsed into one diagnosis.`,'',
    '## Decision boundary','',
    '- Keep the current serializable Artifact representation until range-read and ownership semantics are designed together.','- Use this report to choose the first Phase C implementation target; rerun on the same machine after each change.','- Do not infer Electron/D3/GPU paint performance from the deterministic 20-plot scheduler case. A renderer/device capture remains a separate acceptance step.','');
  return lines.join('\n');
}

async function cli(){
  const args=parseArgs(process.argv.slice(2)),profile=String(args.profile||'full'),base=PROFILES[profile];
  if(!base)throw new Error(`Unknown benchmark profile: ${profile}`);
  const samples=numberArg(args.samples,base.samples,{min:1}),warmup=numberArg(args.warmup,base.warmup,{min:0});
  if(args.worker){
    const scenario=SCENARIOS.find(row=>row.id===String(args.worker));
    if(!scenario)throw new Error(`Unknown benchmark scenario: ${args.worker}`);
    const report=await runWorker(scenario,{...base,samples,warmup});
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }
  const report=await runBenchmark({profile,samples,warmup}),markdown=markdownReport(report);
  if(args.json){const target=path.resolve(ROOT,String(args.json));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,`${JSON.stringify(report,null,2)}\n`);}
  if(args.markdown){const target=path.resolve(ROOT,String(args.markdown));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,markdown);}
  if(!args.json&&!args.markdown)process.stdout.write(`${markdown}\n`);
  else console.log(`Phase C baseline captured: ${report.results.length} scenarios; slowest p95=${report.ranking[0].id} (${report.ranking[0].p95Ms} ms).`);
}

if(require.main===module)cli().catch(error=>{console.error(error.stack||error);process.exit(1);});

module.exports={PROFILES,SCENARIOS,quantile,runBenchmark,markdownReport};
