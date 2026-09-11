'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const displayCode=read('src/core/scientific/display-runtime.js');
const renderer=read('src/core/scientific/d3-chart-renderer.js');
const index=read('src/index.html');
const dedicated=read('src/plugin-window/runtime.js');

assert(index.includes('core/scientific/display-runtime.js')&&index.indexOf('core/scientific/display-runtime.js')<index.indexOf('core/scientific/d3-chart-renderer.js'),'Scientific Display Runtime must load before the D3 renderer.');
assert(dedicated.includes("'scientific-display-runtime':'../core/scientific/display-runtime.js'")&&dedicated.indexOf("'scientific-display-runtime'")<dedicated.indexOf("'heatmap-canvas-runtime'")&&dedicated.indexOf("'heatmap-canvas-runtime'")<dedicated.indexOf("'d3-chart-renderer'"),'Dedicated plugin windows must load Scientific Display and Canvas Heatmap owners before D3.');
assert(renderer.includes("attr('class','dkds-d3-trace-group').attr('data-series-id',seriesKey)"),'D3 scatter traces must expose stable series-owned groups.');
assert(renderer.includes('reusableTraceGroups(state)')&&renderer.includes('plotNode.appendChild(groupNode)'),'D3 data/geometry renders must reuse matching trace groups rather than recreating every trace node.');
assert(renderer.includes(".data(markerData,point=>String(point.i))"),'Marker nodes must be keyed by original source point index.');
assert(renderer.includes("Display.sampleTrace(trace,{layout:state.layout,pixelWidth:state.innerW})"),'D3 rendering must consume viewport-first display sampling from the Core display owner.');
assert(renderer.includes('nearestDisplayPointPixel(points,x,scaleY,px,py)'),'Hover/click lookup must use sampled display points while returning original source indices.');

const context={window:{},console,performance};context.window=context;vm.createContext(context);vm.runInContext(displayCode,context,{filename:'display-runtime.js'});const Display=context.DKDSScientificDisplay;
assert(Display&&Display.VERSION==='1.0.0');
assert.strictEqual(Display.seriesKey({seriesId:'series-direct',meta:{seriesId:'meta-id'}},0),'series-direct');
assert.strictEqual(Display.seriesKey({meta:{seriesId:'meta-id'}},0),'meta-id');

const n=100000;
const x=new Array(n),y=new Array(n);for(let i=0;i<n;i++){x[i]=i/100;y[i]=Math.sin(i/170)*2+Math.cos(i/31)*.15;}
y[0]=7;y[n-1]=-8;y[12345]=55;y[67890]=-44;y[40000]=NaN;y[40001]=NaN;
const trace={seriesId:'curve:stable',x,y};
let sampled=Display.sampleTrace(trace,{pixelWidth:800,layout:{xaxis:{}}});
const ids=sampled.points.filter(point=>point.valid).map(point=>point.i);
assert(ids.includes(0)&&ids.includes(n-1),'Full-view sampling must preserve source endpoints.');
assert(ids.includes(12345)&&ids.includes(67890),'Min/max bucket sampling must preserve scientifically meaningful extrema.');
assert(sampled.points.some(point=>point.gap&&!point.valid),'NaN gaps must survive as explicit line-break sentinels.');
assert(sampled.displayCount<=sampled.budget+32,'Display sampling must stay bounded near the pixel-derived budget.');
assert(sampled.displayCount<n/10,'Large curves must not project every source point into SVG.');
for(const point of sampled.points.filter(point=>point.valid))assert.strictEqual(point.x,x[point.i],'Every sampled point must retain its original source-row identity.');

const zoomed=Display.sampleTrace(trace,{pixelWidth:800,layout:{xaxis:{range:[500,510]}}});
const zoomIds=zoomed.points.filter(point=>point.valid).map(point=>point.i);
assert(zoomIds.length&&Math.min(...zoomIds)>=49999&&Math.max(...zoomIds)<=51001,'Viewport-first sampling must only retain the visible numeric window plus one boundary neighbor.');
assert(zoomed.visibleCount<2000,'Viewport-first range lookup must avoid treating the whole million-scale source as visible.');
const shifted=Display.sampleTrace(trace,{pixelWidth:800,layout:{xaxis:{range:[500.2,510.2]}}}),zoomKeySet=new Set(zoomed.points.filter(point=>point.valid).map(point=>point.i)),shiftedKeys=shifted.points.filter(point=>point.valid).map(point=>point.i),overlap=shiftedKeys.filter(id=>zoomKeySet.has(id)).length/Math.max(1,shiftedKeys.length);
assert(overlap>.70,`Adjacent viewport sampling should retain most point keys for DOM reuse; overlap=${overlap.toFixed(3)}`);

const scan={seriesId:'scan',x:[0,1,2,3,4,3,2,1,0],y:[1,3,2,6,5,4,-2,2,1]};
const scanAnalysis=Display.analyzeTrace(scan),scanSample=Display.sampleTrace(scan,{pixelWidth:64,layout:{xaxis:{}}});
assert.strictEqual(scanAnalysis.segments.length,2,'A scan-direction reversal must remain two display sampling segments.');
assert(scanSample.points.filter(p=>p.valid).some(p=>p.i===4),'The scan turning point must be preserved across segment boundaries.');
assert(scanSample.points.filter(p=>p.valid).some(p=>p.i===6),'Segment-local extrema must survive sampling.');

const noisy={seriesId:'noisy',x:Array.from({length:5000},(_,i)=>Math.sin(i*.91)*100+i*.001),y:Array.from({length:5000},(_,i)=>Math.cos(i*.17))};
const noisyAnalysis=Display.analyzeTrace(noisy),noisySample=Display.sampleTrace(noisy,{pixelWidth:400,layout:{xaxis:{range:[-10,10]}}});
assert(noisyAnalysis.segments.length<10,'High-frequency X reversals must collapse to bounded non-monotonic runs instead of creating thousands of scan segments.');
assert(noisySample.displayCount<=noisySample.budget+8,'Non-monotonic fallback must remain display-bounded even when viewport binary search is unsafe.');

// Performance guard: analyze once, then repeated viewport changes should use the cached
// monotonic segment analysis and binary-search the visible slice instead of rescanning N.
const bigN=1_000_000,bigX=new Array(bigN),bigY=new Array(bigN);for(let i=0;i<bigN;i++){bigX[i]=i*.001;bigY[i]=Math.sin(i*.003);}const big={seriesId:'million',x:bigX,y:bigY};
Display.sampleTrace(big,{pixelWidth:1200,layout:{xaxis:{}}});
const times=[];let last=null;for(let i=0;i<5;i++){const start=performance.now();last=Display.sampleTrace(big,{pixelWidth:1200,layout:{xaxis:{range:[500+i,510+i]}}});times.push(performance.now()-start);}times.sort((a,b)=>a-b);const median=times[2];
assert(last.visibleCount<11000&&last.displayCount<=last.budget+8,'1M-point viewport rendering must remain bounded by the display budget.');
assert(median<80,`Cached 1M-point viewport sampling should stay interactive; median=${median.toFixed(2)}ms.`);
console.log(`v3.68.84 stable SVG identity + viewport display sampling PASS (1M viewport median ${median.toFixed(2)} ms, display ${last.displayCount}/${bigN})`);
