'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const {PURPOSES,isPresentationPurpose}=require('../src/core/contracts/presentation');

assert.strictEqual(PURPOSES.PARAMETERS,'parameters');
assert.strictEqual(isPresentationPurpose('parameters'),true);
assert.strictEqual(isPresentationPurpose('data-object-rail'),false);

const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(portable.includes("const PORTABLE_SEMANTIC_KINDS=new Set(['panel','inspector']);"),'PortableView material semantics must remain bounded to panel/inspector.');
assert(!portable.includes("'parameters'"),'PortableView must not treat parameter purpose as a Material/Portable semanticKind.');

const firstPartyFiles=[
  'src/plugins/resonance-workbench/workbench-shared.js',
  'src/plugins/ter-analysis/shared-views.js',
  'src/plugins/ter-analysis/feature-runtime.js',
  'src/plugins/pulse-analysis/shared-views.js',
  'src/plugins/pulse-analysis/feature-runtime.js',
  'src/plugins/pulse-sampler-tool/plugin.js',
  'src/plugins/transfer-vth-lab/plugin.js'
];
for(const rel of firstPartyFiles){
  const source=read(rel);
  assert(!/semanticKind\s*:\s*['"]parameters['"]/.test(source),`${rel} must not overload semanticKind with parameter navigation purpose.`);
  assert(source.includes("presentationPurpose:'parameters'"),`${rel} must declare the canonical parameter presentation purpose.`);
}

const pluginWorkspace=read('src/core/ui/modules/workbench/plugin.js');
const hostApi=read('src/core/ui/modules/host/api.js');
const model=read('src/core/ui/modules/presentation/model.js');
const mobileTypes=read('mobile/src/model/shell-types.ts');
const mobileModel=read('mobile/src/model/shell-model.ts');
const sdk=read('sdk/plugin-api.d.ts');
const top=read('src/core/plugins/kernel/modules/workspace/top.js');

assert(pluginWorkspace.includes("presentationPurpose:String(row?.presentationPurpose||'')"),'PluginWorkspace navigation registry must preserve presentationPurpose.');
assert(hostApi.includes("presentationPurpose:String(action.presentationPurpose||'')"),'Core UI host registry must preserve presentationPurpose.');
assert(model.includes('presentationPurpose:text(row.presentationPurpose)')&&model.includes('presentationPurpose:text(row.presentationPurpose||fallback?.presentationPurpose)'),'PresentationModel must merge parameter purpose from contract and live runtime.');
assert(mobileTypes.includes('presentationPurpose?: string;'),'Native shell surface type must carry presentationPurpose.');
assert(mobileModel.includes("surface.role === 'data-control'")&&mobileModel.includes('canonicalDataControlSurface'),'Native control promotion must consume the common data-control role; parameter purpose remains optional metadata.');
assert(!mobileModel.includes("semanticKind || '').toLowerCase() === 'parameters'"),'Native parameter promotion must not overload semanticKind.');
assert(sdk.includes("export type DKDSPresentationSurfacePurpose='parameters';")&&sdk.includes('presentationPurpose?:DKDSPresentationSurfacePurpose'),'SDK must expose the bounded platform-neutral parameter purpose.');
assert(top.includes('isPresentationPurpose')&&top.includes('declares unknown presentationPurpose'),'TOP workspace validator must reject unknown presentation purposes.');

console.log('v3.67.37 parameter surface semantic separation passed.');
