#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const {performance}=require('perf_hooks');
const root=path.resolve(__dirname,'../..');
const code=fs.readFileSync(path.join(root,'src/core/scientific/display-runtime.js'),'utf8');
global.window=global;global.performance=performance;(0,eval)(code);const Display=global.DKDSScientificDisplay;
function median(values){const rows=[...values].sort((a,b)=>a-b);return rows[Math.floor(rows.length/2)];}
function makeTrace(n){const x=new Array(n),y=new Array(n);for(let i=0;i<n;i++){x[i]=i*.001;y[i]=Math.sin(i*.003)+.08*Math.cos(i*.017);}y[Math.floor(n*.23)]=18;y[Math.floor(n*.71)]=-17;y[Math.floor(n*.51)]=NaN;return {seriesId:'benchmark',x,y};}
function timed(fn){const t=performance.now(),value=fn();return {ms:performance.now()-t,value};}
function run(n=1_000_000,width=1200){
  const trace=makeTrace(n),cold=timed(()=>Display.sampleTrace(trace,{pixelWidth:width,layout:{xaxis:{}}})),full=[],zoom=[];
  for(let i=0;i<7;i++){full.push(timed(()=>Display.sampleTrace(trace,{pixelWidth:width,layout:{xaxis:{}}})).ms);zoom.push(timed(()=>Display.sampleTrace(trace,{pixelWidth:width,layout:{xaxis:{range:[400+i,410+i]}}})));}
  const a=Display.sampleTrace(trace,{pixelWidth:width,layout:{xaxis:{range:[500,510]}}}),b=Display.sampleTrace(trace,{pixelWidth:width,layout:{xaxis:{range:[500.2,510.2]}}}),aKeys=new Set(a.points.filter(row=>row.valid).map(row=>row.i)),bKeys=b.points.filter(row=>row.valid).map(row=>row.i),reuse=bKeys.filter(id=>aKeys.has(id)).length/Math.max(1,bKeys.length),last=zoom.at(-1).value;
  const result={points:n,width,firstAnalysisAndSampleMs:cold.ms,warmFullMedianMs:median(full),viewportMedianMs:median(zoom.map(row=>row.ms)),rawPoints:cold.value.rawCount,displayPoints:cold.value.displayCount,displayRatio:cold.value.displayCount/Math.max(1,cold.value.rawCount),segments:cold.value.segmentCount,budget:cold.value.budget,viewportDisplay:last.displayCount,viewportVisible:last.visibleCount,adjacentViewportKeyReuseRatio:reuse};console.log(JSON.stringify(result,null,2));return result;
}
run(Number(process.argv[2])||1_000_000,Number(process.argv[3])||1200);
