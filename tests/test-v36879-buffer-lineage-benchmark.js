'use strict';
const assert=require('assert');
const {run}=require('../tools/benchmark/buffer-lineage');
const report=run({artifacts:80,samples:1});
for(const [key,value] of Object.entries(report.correctness))assert.strictEqual(value,true,`Benchmark correctness failed: ${key}`);
assert(report.results.lineageCreate.medianMs>=0&&report.results.lineageBatchMove.medianMs>=0);
console.log('v3.68.81 buffer revision + incremental lineage benchmark smoke PASS.');
