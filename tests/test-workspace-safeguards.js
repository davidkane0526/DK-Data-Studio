const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  makePreservationPlan,
  mergePreservedPeaks,
  findDuplicateImports
} = require('../src/core/recipes/workspace-safeguards.js');

const oldA={path:'A'},oldB={path:'B'};
const baseline={
  datasetRefs:new Map([['A',oldA],['B',oldB]]),
  peaks:[
    {id:'a1',datasetPath:'A',v:-0.41,peakOrder:1,manual:true,widthLeft:-0.45,widthRight:-0.38},
    {id:'b1',datasetPath:'B',v:-0.19,peakOrder:2,locked:false,widthLeft:-0.23,widthRight:-0.16}
  ]
};

const newC={path:'C'};
let plan=makePreservationPlan(baseline,[oldA,oldB,newC]);
assert.strictEqual(plan.changed,true);
assert.deepStrictEqual([...plan.unchangedPaths].sort(),['A','B']);

let merged=mergePreservedPeaks(
  [
    {id:'a-redetected',datasetPath:'A',v:0.25,peakOrder:9},
    {id:'b-redetected',datasetPath:'B',v:0.26,peakOrder:9},
    {id:'c-new',datasetPath:'C',v:-0.08,peakOrder:1}
  ],
  baseline.peaks,
  plan.unchangedPaths
);
assert.deepStrictEqual(merged.map(p=>p.id),['a1','b1','c-new']);
assert.strictEqual(merged[0].v,-0.41);
assert.strictEqual(merged[1].peakOrder,2);

const replacementB={path:'B'};
plan=makePreservationPlan(baseline,[oldA,replacementB,newC]);
assert.strictEqual(plan.changed,true);
assert.deepStrictEqual([...plan.unchangedPaths],['A']);
merged=mergePreservedPeaks(
  [
    {id:'a-redetected',datasetPath:'A',v:0.1},
    {id:'b-replacement',datasetPath:'B',v:0.2},
    {id:'c-new',datasetPath:'C',v:0.3}
  ],
  baseline.peaks.filter(p=>p.datasetPath==='A'),
  plan.unchangedPaths
);
assert.deepStrictEqual(merged.map(p=>p.id),['a1','b-replacement','c-new']);

let duplicates=findDuplicateImports(
  [
    {name:'VG=0.csv',path:'D:/new/VG=0.csv'},
    {name:'vg=0.CSV',path:'E:/other/vg=0.CSV'},
    {name:'VG=20.csv',path:'D:/new/VG=20.csv'}
  ],
  [{name:'VG=0.csv',path:'C:/old/VG=0.csv'}]
);
assert.strictEqual(duplicates.hasDuplicates,true);
assert.strictEqual(duplicates.rows.length,2);
assert.ok(duplicates.rows.every(row=>row.pendingSameName||row.existingSameName));

duplicates=findDuplicateImports(
  [{name:'VG=0.csv',path:'C:/old/VG=0.csv'}],
  [{name:'VG=0.csv',path:'C:/old/VG=0.csv'}]
);
assert.strictEqual(duplicates.rows.length,1);
assert.strictEqual(duplicates.rows[0].exactPath,true);

const appSource=fs.readFileSync(path.join(__dirname,'..','src','app.js'),'utf8');
const resetAt=appSource.indexOf('importDraft.files=[];');
const closeAt=appSource.indexOf('closeImportWorkbench();',resetAt);
assert(resetAt>=0&&closeAt>resetAt,'Successful import must clear the pending import session before closing, so reopening Import cannot replay the previous folder selection.');

console.log('Workspace safeguard checks passed.');
