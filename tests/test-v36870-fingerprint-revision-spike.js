'use strict';
const assert=require('assert');
const spike=require('../tools/benchmark/fingerprint-revision-spike');

assert.strictEqual(spike.PROFILES.full.curve100k,100000);
assert.strictEqual(spike.PROFILES.full.curve1m,1000000);
assert.deepStrictEqual(spike.WORKLOADS.map(row=>row.id),['curve-100k','curve-1m']);

(async()=>{
  const report=await spike.runSpike({profile:'smoke',samples:1,warmup:0});
  assert.strictEqual(report.schema,'dkds.phase-c-fingerprint-spike/1');
  assert.strictEqual(report.results.length,2);
  for(const row of report.results){
    assert(row.modes['full-json'].medianMs>=0&&row.modes['numeric-stream'].medianMs>=0);
    assert(row.speedups.numericStreamVsFullJson>0);
    assert.strictEqual(row.correctness.numericIgnoresMetadataChange,true,'The prototype boundary must expose metadata coverage as unsafe.');
    assert.strictEqual(row.correctness.numericDetectsDataChange,true);
    assert.strictEqual(row.correctness.revisionOverInvalidatesUnrelatedArtifact,true);
  }
  const text=spike.markdown(report);
  assert(text.includes('Correctness boundary')&&text.includes('Do not replace `fingerprintArtifact`'));
  console.log('v3.68.70 fingerprint/revision design-spike contract and runtime smoke PASS.');
})().catch(error=>{console.error(error);process.exit(1);});
