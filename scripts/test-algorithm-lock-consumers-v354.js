const assert=require('assert');const fs=require('fs');
const ter=fs.readFileSync('src/plugins/ter-analysis/analysis-service.js','utf8');const resonance=fs.readFileSync('src/plugins/resonance-workbench/feature-runtime.js','utf8');
assert(ter.includes("if(wanted.version)return api.resolve?.(wanted,{category:'ter-analysis'})||null"),'TER must not fall back from an exact locked algorithm version.');
assert(ter.includes("d.status==='missing-version'")&&ter.includes('工程锁定的 TER 算法版本缺失'),'TER must diagnose a missing exact algorithm version instead of silently upgrading it.');
assert(ter.includes("const missing=diagnostic?.status==='missing-version'"),'TER selector must preserve a missing locked version in project state.');
assert(resonance.includes("if(!provider&&active.includes('@'))return null"),'Resonance detector selection must preserve a missing exact version instead of silently resolving another provider.');
assert(resonance.includes("missingLockedAlgorithm('peak-detector'")&&resonance.includes("missingLockedAlgorithm('peak-metrics'"),'Resonance peak detector/FWHM must diagnose locked-version absence.');
console.log('Algorithm lock consumer safeguards v3.54 checks passed.');
