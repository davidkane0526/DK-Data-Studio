'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const unit=read('src/plugins/ter-analysis/unit-presentation.js');
const css=read('src/plugins/ter-analysis/plugin.css');
const foundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
const scientific=read('src/core/ui/modules/composition/unit-template-scientific.js');
const analysis=read('src/core/ui/modules/workbench/analysis.js');
const types=read('sdk/plugin-api.d.ts');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');
const digest=crypto.createHash('sha256').update(css).digest('hex');

assert(Number(spec.UNIT_TEMPLATE_SPEC_VERSION.split('.').at(-1))>=21,'TER source parity must retain Unit Templates 2.5.38 or later.');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG||{}).length,41);
assert.strictEqual(digest,'a601985b774667acb6c8d8fea9255db87537a46afe4bdecc2d07504ef7a1442b','TER source-detail geometry must be the accepted pre-cutover geometry source.');

// Parameter PRIME is a hard titleless contract, not CSS-hidden chrome.
for(const token of ['PARAMETER_PRIME_HEADER_FORBIDDEN','PARAMETER_PRIME_CHROME_FORBIDDEN','PARAMETER_PRIME_SURFACE_CHROME_FORBIDDEN'])assert(analysis.includes(token),`Workbench missing ${token}`);
assert(scientific.includes('UNIT_PARAMETER_PRIME_HEADER_FORBIDDEN')&&scientific.includes("row.header=false;row.chrome=false;row.placementControl=parameterPurpose?'host':'none'"),'Unit PRIME builder must hard-normalize parameter surfaces to host-only titleless chrome.');
assert(unit.includes("presentationPurpose:'parameters'")&&unit.includes('existingNode:controls')&&unit.includes("variant:'fixed-titleless'")&&!unit.includes('detailGeometry:{contentInsetPx:12}'));
assert.strictEqual(spec.BASE_METRICS.surface.parameterPrimeInsetPx,6,'Parameter PRIME outer inset must be the uniform 6 px Core metric.');
assert(!unit.includes("title:'TER 参数与显示'")&&!unit.includes('dkds-analysis-prime-head'),'TER parameter content must begin directly in the panel body without a titlebar.');

// Source-faithful anatomy remains generic Unit capability, not TER-only Core code.
assert(foundation.includes("variant==='analysis-control'")&&foundation.includes("analysisCheck=variant==='analysis-check'"));
assert(foundation.includes("spec.actionsTagName||'span'"),'Header Unit must allow source-faithful action-host element anatomy.');
assert(types.includes("DKDSUnitCheckVariant='checkbox'|'radio'|'analysis-check'"));
assert(types.includes('actionsTagName?:string')&&types.includes('titleMode?:\'header\'|\'heading\''));
assert(types.includes('gapPx?:number'));
assert(types.includes('DKDSUnitPrimeDetailGeometry')&&types.includes('DKDSUnitPlotViewDetailGeometry'),'Unit public contract must expose accepted detail geometry instead of leaking raw Workbench/PlotView geometry fields.');

// TER preserves existing persistence state and never invents new split defaults during reconstruction.
assert(unit.includes("stateVersion:'presentation-v1'")&&unit.includes("stateVersion:'ter-plot-view-v3'"));
for(const forbidden of ['layoutStateVersion','leftWidth:','leftMin:','leftReserve:'])assert(!unit.includes(forbidden),`TER source parity must not invent ${forbidden}`);
assert(unit.includes('gapPx:14')&&unit.includes('compact:true'));
assert(unit.includes("actionsTagName:'div'")&&unit.includes("className:'ter-resistance-card-header'"));
assert(unit.includes("if(resistance)setId(card,'terResistanceCard')"),'TER Unit composition must preserve the accepted R–V card id consumed by feature-runtime.');

console.log('v3.71.10 TER source-parity hard contract PASS: source is the oracle; parameter PRIME is permanently titleless.');
