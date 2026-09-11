'use strict';
self.DKDSTaskDefinition=Object.freeze({async run(input){const A=self.DKDSTransferVthAnalysis;if(!A)throw new Error('Vth task analysis runtime unavailable.');const curve={points:Array.isArray(input?.curve?.points)?input.curve.points:A.pointsOfArtifact(input?.curve)};return A.analyzeCurve(curve,{...A.defaults(),...(input?.parameters||{})},input?.manualWindow||null);}});
