'use strict';
const assert=require('assert');
const benchmark=require('../tools/benchmark/artifact-identity');

assert.strictEqual(benchmark.PROFILES.full.curve100k,100000);
assert.strictEqual(benchmark.PROFILES.full.curve1m,1000000);

(async()=>{
  const report=await benchmark.runBenchmark({profile:'smoke',samples:1,warmup:0});
  assert.strictEqual(report.schema,'dkds.phase-c-artifact-identity/1');
  assert.strictEqual(report.results.length,2);
  for(const row of report.results){
    assert(row.modes['legacy-json'].medianMs>=0&&row.modes['canonical-stream'].medianMs>=0&&row.modes['artifact-revision'].medianMs>=0);
    assert(row.speedups.canonicalStreamVsLegacyJson>0);
    assert(Object.values(row.correctness).every(Boolean),'Every identity correctness gate must pass.');
  }
  const text=benchmark.markdown(report);
  assert(text.includes('Canonical parity')&&text.includes('Store-local invalidation stamp'));
  console.log('v3.68.76 Artifact identity benchmark contract and runtime smoke PASS.');
})().catch(error=>{console.error(error);process.exit(1);});
