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
  smoke:Object.freeze({samples:1,warmup:0,curve100k:4000,curve1m:8000}),
  full:Object.freeze({samples:3,warmup:1,curve100k:100000,curve1m:1000000})
});
const WORKLOADS=Object.freeze([
  Object.freeze({id:'curve-100k',title:'100k-point curve',pointsKey:'curve100k'}),
  Object.freeze({id:'curve-1m',title:'1M-point curve',pointsKey:'curve1m'})
]);

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){const token=String(argv[i]||'');if(!token.startsWith('--'))continue;const key=token.slice(2),next=argv[i+1];if(next!==undefined&&!String(next).startsWith('--')){out[key]=next;i+=1;}else out[key]=true;}
  return out;
}
function numberArg(value,fallback,min=0){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.floor(n)):fallback;}
function round(value,digits=3){const scale=10**digits;return Math.round((Number(value)||0)*scale)/scale;}
function quantile(values,q){const rows=(values||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);if(!rows.length)return 0;if(rows.length===1)return rows[0];const pos=(rows.length-1)*Math.min(1,Math.max(0,Number(q)||0)),lo=Math.floor(pos),hi=Math.ceil(pos);return rows[lo]+(rows[hi]-rows[lo])*(pos-lo);}
function mem(){const row=process.memoryUsage();return {heap:row.heapUsed,rss:row.rss};}

function loadData(){
  const context={console,performance,structuredClone,ArrayBuffer,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap};
  context.window=context;context.globalThis=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/core/data/model.js'),'utf8'),context,{filename:'src/core/data/model.js'});
  return context.DKDSData;
}

function fixture(points){
  const x=new Float64Array(points),y=new Float64Array(points);
  for(let i=0;i<points;i+=1){const t=i/Math.max(1,points-1);x[i]=t;y[i]=Math.sin(t*24)*Math.exp(-t*.15);}
  return {x,y};
}

function fnvText(hash,text){const value=String(text??'');let h=hash;for(let i=0;i<value.length;i+=1){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h;}
const digestBuffer=new ArrayBuffer(8),digestView=new DataView(digestBuffer);
function fnvNumber(hash,value){
  let number=Number(value);
  if(Number.isNaN(number))number=Number.NaN;
  if(Object.is(number,-0))number=0;
  digestView.setFloat64(0,number,false);
  let h=hash;for(let i=0;i<8;i+=1){h^=digestView.getUint8(i);h=Math.imul(h,16777619);}return h;
}

// Prototype only: it intentionally covers the numeric payload and stable
// identity fields, not the complete Artifact canonicalization contract.
function numericPayloadDigest(artifact){
  let hash=2166136261;
  hash=fnvText(hash,`${artifact?.kind||''}\0${artifact?.id||''}\0${artifact?.x?.length||0}\0${artifact?.y?.length||0}`);
  for(const value of artifact?.x||[])hash=fnvNumber(hash,value);
  for(const value of artifact?.y||[])hash=fnvNumber(hash,value);
  return (hash>>>0).toString(36);
}

function legacyCanonicalize(value){
  if(value===null||value===undefined)return value;
  if(Array.isArray(value))return value.map(legacyCanonicalize);
  if(typeof value==='object'){const out={};for(const key of Object.keys(value).sort()){if(['createdAt','updatedAt'].includes(key))continue;out[key]=legacyCanonicalize(value[key]);}return out;}
  if(typeof value==='number'&&Number.isNaN(value))return null;
  return value;
}
function legacyFingerprint(D,artifact){return D.hashString(JSON.stringify(legacyCanonicalize(artifact)));}

function digestModes(D,artifact,store){
  return {
    'full-json':()=>legacyFingerprint(D,artifact),
    'revision-only':()=>String(store.revision('data.series')),
    'numeric-stream':()=>numericPayloadDigest(artifact)
  };
}

async function worker(workload,profile,samples,warmup){
  const D=loadData(),points=profile[workload.pointsKey],raw=fixture(points);
  const artifact=D.createSeries({id:`bench:${workload.id}`,name:workload.title,x:raw.x,y:raw.y,metadata:{source:'phase-c-fingerprint-spike',revision:1}});
  const store=D.createStore();store.add(artifact);
  const source=store.get(artifact.id),modes=digestModes(D,artifact,store),names=Object.keys(modes),rows=Object.fromEntries(names.map(name=>[name,[]]));
  for(let i=0;i<warmup+samples;i+=1){
    global.gc?.();
    for(const name of names){const before=mem(),started=performance.now(),digest=modes[name](),elapsed=performance.now()-started,after=mem();if(i>=warmup)rows[name].push({elapsed,digest,heapDelta:Math.max(0,after.heap-before.heap),rssDelta:Math.max(0,after.rss-before.rss)});}
  }
  const result=Object.fromEntries(names.map(name=>{
    const samplesForMode=rows[name],times=samplesForMode.map(row=>row.elapsed);
    return [name,{samples:samplesForMode.length,medianMs:round(quantile(times,.5)),p95Ms:round(quantile(times,.95)),maxMs:round(Math.max(...times)),peakHeapDeltaMiB:round(Math.max(...samplesForMode.map(row=>row.heapDelta))/MIB),peakRssDeltaMiB:round(Math.max(...samplesForMode.map(row=>row.rssDelta))/MIB),digest:samplesForMode.at(-1)?.digest||null}];
  }));
  const metadataChanged={...source,metadata:{...(source.metadata||{}),revision:2}};
  const dataChanged={...source,y:[...source.y],metadata:{...(source.metadata||{})}};dataChanged.y[Math.floor(dataChanged.y.length/2)]+=1;
  const second=D.createStore();second.add(source);second.add(D.createSeries({id:`bench:${workload.id}:other`,x:[0],y:[0]}));
  return {id:workload.id,title:workload.title,points,modes:result,correctness:{numericIgnoresMetadataChange:numericPayloadDigest(source)===numericPayloadDigest(metadataChanged),numericDetectsDataChange:numericPayloadDigest(source)!==numericPayloadDigest(dataChanged),revisionOverInvalidatesUnrelatedArtifact:second.revision('data.series')>1,sourceDigest:numericPayloadDigest(source)}};
}

function runChild(workload,profile,samples,warmup){
  const result=spawnSync(process.execPath,['--expose-gc',__filename,'--worker',workload.id,'--profile',profile,'--samples',String(samples),'--warmup',String(warmup)],{cwd:ROOT,encoding:'utf8',maxBuffer:8*MIB,env:{...process.env,DKDS_FINGERPRINT_SPIKE_CHILD:'1'}});
  if(result.error)throw result.error;if(result.status!==0)throw new Error(`Fingerprint spike ${workload.id} failed (${result.status}): ${String(result.stderr||result.stdout).trim()}`);
  try{return JSON.parse(String(result.stdout||'').trim());}catch(error){throw new Error(`Fingerprint spike ${workload.id} returned invalid JSON: ${error.message}`);}
}

function speedup(full,prototype){return full>0?round(full/prototype,2):0;}
async function runSpike(options={}){
  const profileName=String(options.profile||'full'),base=PROFILES[profileName];if(!base)throw new Error(`Unknown fingerprint spike profile: ${profileName}`);
  const samples=numberArg(options.samples,base.samples,1),warmup=numberArg(options.warmup,base.warmup,0),workloads=WORKLOADS.map(row=>runChild(row,profileName,samples,warmup));
  const results=workloads.map(row=>({...row,speedups:{numericStreamVsFullJson:speedup(row.modes['full-json'].medianMs,row.modes['numeric-stream'].medianMs)},correctness:row.correctness}));
  return {schema:'dkds.phase-c-fingerprint-spike/1',appVersion:APP_VERSION,capturedAt:new Date().toISOString(),profile:profileName,samples,warmup,environment:{platform:process.platform,release:os.release(),arch:process.arch,node:process.version,cpu:os.cpus()?.[0]?.model||'unknown'},methodology:{'full-json':'Current Store fingerprint: canonicalize payload then JSON.stringify + Core hashString.', 'revision-only':'Current Store kind revision lookup; constant-time but global to the kind.', 'numeric-stream':'Low-allocation prototype over identity fields and x/y numeric payload only; not a drop-in Artifact fingerprint.'},results};
}

function markdown(report){
  const lines=[`# DKDS Phase C fingerprint/revision spike — ${report.appVersion}`,'','> This is a design measurement, not a storage-contract change. Values are same-machine trend measurements.','',`Captured: ${report.capturedAt}  `,`Profile: ${report.profile}; ${report.samples} measured + ${report.warmup} warm-up samples  `,`Node: ${report.environment.node}; ${report.environment.platform} ${report.environment.arch}`,'','## Timing','', '| Workload | Full JSON median / p95 | Revision-only median / p95 | Numeric stream median / p95 | Stream speedup |','| --- | ---: | ---: | ---: | ---: |'];
  for(const row of report.results)lines.push(`| ${row.title} | ${row.modes['full-json'].medianMs} / ${row.modes['full-json'].p95Ms} ms | ${row.modes['revision-only'].medianMs} / ${row.modes['revision-only'].p95Ms} ms | ${row.modes['numeric-stream'].medianMs} / ${row.modes['numeric-stream'].p95Ms} ms | ${row.speedups.numericStreamVsFullJson}× |`);
  lines.push('','## Correctness boundary','', '| Check | 100k | 1M |','| --- | --- | --- |');
  const first=report.results[0],second=report.results[1];
  lines.push(`| Numeric digest ignores metadata-only changes | ${first.correctness.numericIgnoresMetadataChange} | ${second.correctness.numericIgnoresMetadataChange} |`,`| Numeric digest detects data changes | ${first.correctness.numericDetectsDataChange} | ${second.correctness.numericDetectsDataChange} |`,`| Kind revision over-invalidates unrelated artifact | ${first.correctness.revisionOverInvalidatesUnrelatedArtifact} | ${second.correctness.revisionOverInvalidatesUnrelatedArtifact} |`,'','## Recommendation','', '- Do not replace `fingerprintArtifact` with the numeric prototype: it intentionally misses metadata, lineage and provenance changes.', '- Do not use `revision(kind)` as an artifact identity: it is global to the kind and over-invalidates unrelated artifacts.', '- The next safe design is an artifact-local revision plus a payload digest that covers the complete canonical contract without materializing one giant JSON string.', '- Keep the current contract unchanged until that complete digest has collision, metadata, NaN/-0, save/restore and cache-invalidation tests.','');
  return lines.join('\n');
}

async function cli(){
  const args=parseArgs(process.argv.slice(2)),profile=String(args.profile||'full'),base=PROFILES[profile];if(!base)throw new Error(`Unknown fingerprint spike profile: ${profile}`);
  const samples=numberArg(args.samples,base.samples,1),warmup=numberArg(args.warmup,base.warmup,0);
  if(args.worker){const workload=WORKLOADS.find(row=>row.id===String(args.worker));if(!workload)throw new Error(`Unknown workload: ${args.worker}`);process.stdout.write(`${JSON.stringify(await worker(workload,base,samples,warmup))}\n`);return;}
  const report=await runSpike({profile,samples,warmup});if(args.json){const target=path.resolve(ROOT,String(args.json));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,`${JSON.stringify(report,null,2)}\n`);}if(args.markdown){const target=path.resolve(ROOT,String(args.markdown));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,markdown(report));}if(!args.json&&!args.markdown)process.stdout.write(`${markdown(report)}\n`);else console.log(`Fingerprint/revision spike captured: ${report.results.length} workloads.`);
}
if(require.main===module)cli().catch(error=>{console.error(error.stack||error);process.exit(1);});
module.exports={PROFILES,WORKLOADS,numericPayloadDigest,runSpike,markdown};
