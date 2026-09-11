'use strict';
self.DKDSTaskDefinition=Object.freeze({
  async run(input){
    const fn=self.DKDSScience?.computeResonantTerForLabel;
    if(typeof fn!=='function')throw new Error('Resonant TER science runtime unavailable.');
    return fn(input?.peaks||[],input?.sweeps||[],String(input?.label||''),Array.isArray(input?.visibleSweepIds)?input.visibleSweepIds:null,input?.options||{});
  }
});
