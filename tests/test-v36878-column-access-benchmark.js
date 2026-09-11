'use strict';
const assert=require('assert');
const {run}=require('../tools/benchmark/column-access');
const report=run({points:12000,rangeLimit:256,samples:5});
assert(report.correctness.metadataHasNoValues,'Metadata benchmark path must omit column values.');
assert(report.correctness.rangeLength,'Bounded range benchmark must return the requested slice.');
assert(report.results.metadataList.peakHeapMiB<report.results.fullList.peakHeapMiB,'Metadata enumeration should allocate less heap than a full Artifact list clone in the smoke workload.');
assert(report.results.boundedRange.peakHeapMiB<report.results.fullColumn.peakHeapMiB,'Bounded range should allocate less heap than a full-column snapshot in the smoke workload.');
console.log('v3.68.78 column-access benchmark correctness/allocation smoke passed.');
