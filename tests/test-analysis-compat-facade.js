const assert=require('assert');
const A=require('../src/analysis.js');

// The facade is intentionally small: it proves that callers using the preserved
// `Analysis` entry still reach the shared science engine. UI/host architecture
// is covered by dedicated Core/plugin regression tests, not this compatibility file.
const points=[];
for(let v=0;v<=2.0001;v+=0.02)points.push({v:+v.toFixed(2),i:v});
for(let v=2;v>=-2.0001;v-=0.02)points.push({v:+v.toFixed(2),i:v});
for(let v=-2;v<=0.0001;v+=0.02)points.push({v:+v.toFixed(2),i:v});
const sweeps=A.buildSweeps({path:'x.csv',name:'x.csv',vg:0,points});
assert.strictEqual(sweeps.filter(row=>row.direction>0).length,1,'forward sweep reconstruction changed');
assert.strictEqual(sweeps.filter(row=>row.direction<0).length,1,'reverse sweep reconstruction changed');
assert(sweeps.find(row=>row.direction>0).points[0].v<-1.99,'forward sweep must cover the negative endpoint');
assert(sweeps.find(row=>row.direction>0).points.at(-1).v>1.99,'forward sweep must cover the positive endpoint');

assert.strictEqual(A.ALG_SYMBOLS.raw,'circle');
assert.strictEqual(A.ALG_SYMBOLS.snr,'diamond');
assert.strictEqual(A.ALG_SYMBOLS.diff,'triangle');
assert.strictEqual(A.ALG_SYMBOLS.detrend,'square');
assert.strictEqual(A.ALG_SYMBOLS.curvature,'cross');

const fakeSweeps=[
  {id:'u',datasetPath:'x',vg:10,direction:1,step:0.1,points:[{v:0.9,i:1.8},{v:1,i:2},{v:1.1,i:2.2}]},
  {id:'d',datasetPath:'x',vg:10,direction:-1,step:0.1,points:[{v:0.9,i:0.9},{v:1,i:1},{v:1.1,i:1.1}]}
];
const fakePeaks=[
  {id:'p1u',sweepId:'u',accepted:true,peakLabel:'峰1',vg:10,direction:1,v:1,i:2},
  {id:'p1d',sweepId:'d',accepted:true,peakLabel:'峰1',vg:10,direction:-1,v:1,i:1},
  {id:'p2u',sweepId:'u',accepted:true,peakLabel:'峰2',vg:10,direction:1,v:1,i:5},
  {id:'p2d',sweepId:'d',accepted:true,peakLabel:'峰2',vg:10,direction:-1,v:1,i:4}
];
const ter=A.computeTerForLabel(fakePeaks,fakeSweeps,'峰1');
assert.strictEqual(ter.length,1,'TER label pairing changed');
assert(Math.abs(ter[0].ter-100)<1e-9,'TER 2/1 compatibility result changed');

console.log('Analysis compatibility facade smoke checks passed.');
