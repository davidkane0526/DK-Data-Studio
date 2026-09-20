'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const units=read('src/core/ui/modules/composition/unit-template-scientific.js');
const spec=read('src/core/ui/modules/composition/unit-template-spec.js');
const semantic=read('src/core/theme/semantic-registry.js');
const materialCss=read('src/styles/theme/material-renderer.css');
const ter=read('src/plugins/ter-analysis/feature-runtime.js');

// Runtime-delegated plots live inside an already-materialized PlotView/card.  A
// `surface-host` here makes Semantic Registry assign a second surface recipe,
// which necessarily carries another background/shadow/backdrop layer.
const delegated=units.match(/if\(renderOwner==='runtime'\)\{[\s\S]*?return surface;\}/)?.[0]||'';
assert(delegated,'runtime-delegated ScientificPlot branch missing');
assert(!delegated.includes("classList?.add?.('dkds-scientific-chart-host')"),'delegated ScientificPlot must preserve authored structural identity until the real renderer attaches');
assert(!delegated.includes("classList?.add?.('dkds-scientific-surface-host')"),'delegated ScientificPlot must not claim a nested Material Surface');
assert(spec.includes("geometryContract:'parent-owned-canvas'")&&spec.includes('Exactly one renderer owns a plot host.'),'Unit ScientificPlot contract must retain its parent-owned/single-renderer boundary');
assert(semantic.includes('.dkds-scientific-surface-host'),'standalone scientific surfaces must remain legal Material surfaces');
assert(!semantic.includes('.dkds-scientific-chart-host'),'renderer-neutral chart hosts must remain transparent to Material role inference');
for(const recipe of ['clear','thin-glass','soft-glass']){
  const block=materialCss.match(new RegExp(`data-dkds-material-recipe="${recipe}"\\]\\{([\\s\\S]*?)\\}`))?.[1]||'';
  assert(block.includes('box-shadow:'),`${recipe} Material recipe must prove why accidental nested surface ownership produces a second shadow`);
}

// Startup ownership: page onOpen owns T.render(); linked data refresh must not
// reapply unchanged grid geometry, and heavy primary heatmap drawing yields to
// the first frame.
assert(ter.includes("onActivate:()=>ctx.workspace.openPage('terMaxPage')"),'TER activity activation must leave render synchronization to page onOpen');
assert(!ter.includes("onActivate:()=>{ctx.workspace.openPage('terMaxPage');T.render();}"),'TER activation must not retain the historical duplicate render path');
const linked=ter.match(/function renderLinkedUi\(\)\{([\s\S]*?)\n    \}/)?.[1]||'';
assert(linked&&!linked.includes('applyLayoutSettings()'),'TER linked data render must not reapply unchanged layout geometry');
assert(linked.includes('renderResistanceBase();')&&!linked.includes('renderResistanceBase();applyResistanceSelection();'),'R–V selection styling must wait for the frame-priority base render promise');
assert(ter.includes("renderKey:`ter-heatmap:${resultRevision}`,renderPriority:'frame'"),'primary TER heatmap must be frame-priority during restored-project startup');

console.log('v3.71.12 ScientificPlot material/startup ownership PASS: delegated plots are transparent card content and TER startup has one render/layout/resize owner.');
