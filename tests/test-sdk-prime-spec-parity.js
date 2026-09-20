'use strict';
const assert=require('assert');const fs=require('fs');
const dts=fs.readFileSync('sdk/plugin-api.d.ts','utf8'),runtime=fs.readFileSync('src/core/ui/modules/workbench/analysis.js','utf8');
const fields=['chrome','handle','controlsHost','controlsPlacement','useTargetAsWrapper','closeSelector','collapseSelector','onCollapse','onPlacementChanged','contentInset','header','fixed','placementControl'];
const block=dts.match(/export interface DKDSPluginWorkspacePrimeSpec \{[\s\S]*?\n\}/)?.[0]||'';for(const field of fields)assert(new RegExp(`\\b${field}\\?\\s*:`).test(block),`Prime d.ts missing ${field}`);
for(const field of ['chrome','handle','controlsHost','useTargetAsWrapper','closeSelector','collapseSelector','onCollapse','onPlacementChanged','contentInset','header','fixed','placementControl'])assert(runtime.includes(`spec.${field}`)||runtime.includes(`row.${field}`),`Runtime parity missing ${field}`);
assert(dts.includes("chrome?:boolean|'auto'"));assert(dts.includes("placementControl?:'host'|'surface'|'none'"));assert(dts.includes("mode?:'adopt'|'generated'"));assert(dts.includes("DKDSTitlePolicy='preserve'|'host-only'|'page-only'|'both'|'auto'"));
console.log('SDK PRIME spec parity PASS');
