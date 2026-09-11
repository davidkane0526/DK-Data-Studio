'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const benchmark=require('../tools/benchmark/phase-c-baseline');

assert.strictEqual(benchmark.PROFILES.full.workloads.curve100k,100000,'Full profile must retain the required 100k curve workload.');
assert.strictEqual(benchmark.PROFILES.full.workloads.curve1m,1000000,'Full profile must retain the required 1M curve workload.');
assert.strictEqual(benchmark.PROFILES.full.workloads.matrix,500,'Full profile must retain the required 500×500 matrix workload.');
assert.strictEqual(benchmark.PROFILES.full.workloads.artifacts,1000,'Full profile must retain the required 1000-Artifact workload.');
assert.strictEqual(benchmark.PROFILES.full.workloads.plots,20,'Full profile must retain the required 20-live-plot workload.');
assert.deepStrictEqual(benchmark.SCENARIOS.map(row=>row.id),['curve-100k','curve-1m','matrix-500','artifacts-1000','plots-20']);
assert.strictEqual(benchmark.quantile([1,2,3,4],.5),2.5);
assert(Math.abs(benchmark.quantile([1,2,3,4],.95)-3.85)<1e-9);

const source=fs.readFileSync(path.join(root,'tools/benchmark/phase-c-baseline.js'),'utf8');
assert(source.includes('Each scenario runs in a fresh Node process')&&source.includes('same-machine trend baselines'),'Benchmark methodology must state isolation and prohibit cross-machine thresholds.');
assert(source.includes('D3 layout, GPU and paint are excluded'),'The deterministic plot scheduler must not be misrepresented as a renderer/device benchmark.');

(async()=>{
  const report=await benchmark.runBenchmark({profile:'smoke',samples:1,warmup:0});
  assert.strictEqual(report.schema,'dkds.phase-c-baseline/1');
  assert.strictEqual(report.results.length,5);
  assert.strictEqual(report.ranking.length,5);
  for(const row of report.results){
    assert(Number.isFinite(row.total.medianMs)&&row.total.medianMs>=0,`${row.id} median must be finite.`);
    assert(Number.isFinite(row.total.p95Ms)&&row.total.p95Ms>=0,`${row.id} p95 must be finite.`);
    assert(Number.isFinite(row.memory.processPeakRssMiB)&&row.memory.processPeakRssMiB>0,`${row.id} must report process peak RSS.`);
    assert(row.checksum!==null&&row.checksum!==undefined,`${row.id} must consume its result.`);
    assert(Object.keys(row.phases).length>=2,`${row.id} must expose phase timings.`);
  }
  const markdown=benchmark.markdownReport(report);
  assert(markdown.includes('Bottleneck order')&&markdown.includes('Decision boundary')&&markdown.includes('Contract copy passes'));
  console.log('v3.68.69 Phase C isolated performance baseline contract and runtime smoke PASS.');
})().catch(error=>{console.error(error);process.exit(1);});
