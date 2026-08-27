'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const bytes=rel=>fs.statSync(path.join(root,rel)).size;

assert.equal(json('package.json').version,'3.61.99','v3.61.99 release gate must own current application identity.');

const manifest=json('src/plugins/resonance-workbench/plugin.json');
const expected=['feature-context.js','feature-group-runtime.js','feature-analysis-runtime.js','feature-runtime.js'];
for(const [name,rows] of [['SUPER',manifest.scripts||[]],['TOP',manifest.window?.scripts||[]]]){
  const indexes=expected.map(item=>rows.indexOf(item));
  assert(indexes.every(i=>i>=0),`${name} Resonance path must load every feature-context module.`);
  assert(indexes.every((value,i)=>i===0||indexes[i-1]<value),`${name} Resonance path must load context/group/analysis before feature-runtime.`);
}

const main='src/plugins/resonance-workbench/feature-runtime.js';
const context='src/plugins/resonance-workbench/feature-context.js';
const group='src/plugins/resonance-workbench/feature-group-runtime.js';
const analysis='src/plugins/resonance-workbench/feature-analysis-runtime.js';
const moduleLimit=48*1024;
assert(bytes(main)<=108*1024,`Resonance coordinator must stay below the v3.61.99 108 KiB transition ceiling, got ${bytes(main)} bytes.`);
for(const rel of [context,group,analysis])assert(bytes(rel)<=moduleLimit,`${rel} must stay below the 48 KiB authored-module boundary.`);

const mainText=read(main),contextText=read(context),groupText=read(group),analysisText=read(analysis);
for(const token of [
  'const groupPortables=new Map()','const groupCards=new Map()','const groupPlotViews=new Map()','let groupRenderKey',
  'let spacingResult','let gateResult','let gateComputeKey','let physicsCache'
]) assert(!mainText.includes(token),`Resonance coordinator must not reclaim extracted state: ${token}`);

for(const name of ['workspace','project','datasets','sweeps','selectedPeakId','selectedSweepId','algorithmRuntime','pipelineRuntime','uiRuntime','workspaceRuntime'])
  assert(contextText.includes(`'${name}'`),`Feature context must expose a live getter for ${name}.`);
assert(contextText.includes('Object.defineProperty(liveView,name')&&contextText.includes('get:getter'),'Feature context must use live getters rather than state snapshots.');

for(const token of ['const groupPortables=new Map()','const groupCards=new Map()','const groupPlotViews=new Map()','let groupRenderKey'])
  assert(groupText.includes(token),`Group runtime must own ${token}.`);
for(const token of ['render:renderGroup','dispose:disposeGroupViews','invalidate,state'])
  assert(groupText.includes(token),`Group runtime contract missing ${token}.`);

for(const token of ['let spacingResult','let gateResult','let gateComputeKey','let physicsCache'])
  assert(analysisText.includes(token),`Analysis runtime must own ${token}.`);
for(const token of ['installPipeline','invalidatePhysics','getState','getGateFeatureField'])
  assert(analysisText.includes(token),`Analysis runtime contract missing ${token}.`);

for(const token of ['FeatureContext.create(','GroupRuntime.create(featureContext)','AnalysisRuntime.create(featureContext)','groupRuntime.render()','analysisRuntime.renderGate()','analysisRuntime.installPipeline()'])
  assert(mainText.includes(token),`Resonance coordinator must wire/delegate through extracted runtime: ${token}`);

console.log(`v3.61.99 Resonance feature context PASS: coordinator=${bytes(main)} B, context=${bytes(context)} B, group=${bytes(group)} B, analysis=${bytes(analysis)} B.`);
