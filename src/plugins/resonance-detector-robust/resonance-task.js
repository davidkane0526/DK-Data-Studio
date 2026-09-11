'use strict';
self.DKDSTaskDefinition=Object.freeze({
  async run(input){const A=self.DKDSResonanceAlgorithms;if(!A)throw new Error('Resonance task algorithm runtime unavailable.');const op=String(input?.op||'');if(op==='detect')return A.detectPeaks(input.sweep,input.settings||{},input.options||{});if(op==='metrics-batch')return (Array.isArray(input?.items)?input.items:[]).map(row=>A.peakMetrics(row?.peak,row?.sweep));throw new Error(`Unknown resonance task operation: ${op}`);}
});
