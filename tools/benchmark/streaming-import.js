#!/usr/bin/env node
'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');
const {performance}=require('perf_hooks');
const root=path.resolve(__dirname,'../..');
function loadScience(){const c={console};c.window=c;c.globalThis=c;vm.createContext(c);for(const f of ['src/science/common.js','src/science/import.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});return c.DKDSScience;}
function mem(){const m=process.memoryUsage();return {heap:m.heapUsed,rss:m.rss};}
function mb(n){return n/1024/1024;}
function emit(value){process.stdout.write(JSON.stringify(value));}
async function child(mode,filePath){
  const S=loadScience();if(global.gc)global.gc();const before=mem();let peak={...before};const mark=()=>{const m=mem();peak.heap=Math.max(peak.heap,m.heap);peak.rss=Math.max(peak.rss,m.rss);};
  const name=path.basename(filePath),options={...S.defaultImportOptions(),layout:'sharedX',xCol:0,yCols:[1,2]};const start=performance.now();let parsed;
  if(mode==='full'){
    const text=fs.readFileSync(filePath,'utf8');mark();parsed=S.parseFlexibleData({name,path:filePath,text,encoding:'utf-8'},options);mark();
  }else{
    const fd=fs.openSync(filePath,'r'),previewBuffer=Buffer.alloc(384*1024),n=fs.readSync(fd,previewBuffer,0,previewBuffer.length,0);fs.closeSync(fd);const preview=previewBuffer.subarray(0,n).toString('utf8');
    const inspection=S.inspectDataText({name,path:filePath,text:preview,encoding:'utf-8'},options),parser=S.createFlexibleDataStream({name,path:filePath,text:preview,encoding:'utf-8'},options,inspection);
    let carry='',line=1;const stream=fs.createReadStream(filePath,{encoding:'utf8',highWaterMark:256*1024});
    for await(const chunk of stream){const merged=carry+chunk,rows=merged.split(/\n/);carry=rows.pop()||'';if(rows.length){await parser.pushLines(rows,{startLine:line,endLine:line+rows.length-1});line+=rows.length;}mark();}
    if(carry){await parser.pushLines([carry.replace(/\r$/,'')],{startLine:line,endLine:line});line++;}parsed=parser.finish({encoding:'utf-8',lineCount:line-1});mark();
  }
  const elapsed=performance.now()-start,after=mem(),datasets=parsed.datasets||[];
  const digest=datasets.map(d=>{const points=Array.isArray(d.points)?d.points:null,columnar=d.columnar&&Array.isArray(d.columnar.v)&&Array.isArray(d.columnar.i)?d.columnar:null,count=columnar?Math.min(columnar.v.length,columnar.i.length):(points?.length||0);return {points:count,first:count?(columnar?[columnar.v[0],columnar.i[0]]:[points[0].v,points[0].i]):null,last:count?(columnar?[columnar.v[count-1],columnar.i[count-1]]:[points[count-1].v,points[count-1].i]):null};});
  emit({mode,elapsedMs:elapsed,heapPeakDeltaMiB:mb(peak.heap-before.heap),rssPeakDeltaMiB:mb(peak.rss-before.rss),heapEndDeltaMiB:mb(after.heap-before.heap),datasets:digest});
}
function generate(filePath,rows){const fd=fs.openSync(filePath,'w');try{fs.writeSync(fd,'Vd(V),Id(A),I2(A)\n');const block=5000;for(let start=0;start<rows;start+=block){const lines=[];for(let i=start;i<Math.min(rows,start+block);i++){const v=(i%4001-2000)/1000,base=(i+1)*1e-12;lines.push(`${v},${base},${base*2}\n`);}fs.writeSync(fd,lines.join(''));}}finally{fs.closeSync(fd);}}
(async()=>{
  if(process.argv[2]==='--child'){await child(process.argv[3],process.argv[4]);return;}
  const rows=Math.max(10000,Number(process.argv[2])||300000),tmp=path.join(os.tmpdir(),`dkds-stream-import-${process.pid}.csv`);generate(tmp,rows);
  try{const run=mode=>{const r=spawnSync(process.execPath,['--expose-gc',__filename,'--child',mode,tmp],{encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error(r.stderr||`child ${mode} failed`);return JSON.parse(r.stdout);};const full=run('full'),stream=run('stream');if(JSON.stringify(full.datasets)!==JSON.stringify(stream.datasets))throw new Error('Streaming result digest differs from full parse.');console.log(JSON.stringify({rows,fileBytes:fs.statSync(tmp).size,full,stream,speedup:full.elapsedMs/stream.elapsedMs,heapPeakReduction:full.heapPeakDeltaMiB/Math.max(stream.heapPeakDeltaMiB,1e-9),rssPeakReduction:full.rssPeakDeltaMiB/Math.max(stream.rssPeakDeltaMiB,1e-9)},null,2));}finally{try{fs.unlinkSync(tmp);}catch{}}
})().catch(err=>{console.error(err);process.exit(1);});
