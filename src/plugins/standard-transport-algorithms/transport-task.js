'use strict';
self.DKDSTaskDefinition=Object.freeze({
  async run(input){
    const A=self.DKDSStandardTransportAlgorithms;if(!A)throw new Error('Transport task algorithm runtime unavailable.');
    const op=String(input?.op||'');
    if(op==='transform')return A.computeTransformSweep(input.sweep,input.transformId,input.parameters||{});
    if(op==='scalar-field')return A.computeSweepScalarField(input.sweeps||[],input.targets||[],input.vgs||[],input.parameters||{});
    if(op==='ter')return A.computeTerMatrix(input.datasets||[],input.settings||{});
    throw new Error(`Unknown transport task operation: ${op}`);
  }
});
