'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.93','Workbench hydration/visual contract test must track the current release.');

const coreCss=read('src/core.css');
const foundation=read('src/styles/foundation/foundation.css');
const analysisCss=read('src/styles/structure/analysis-workbench.css');
const pluginCss=read('src/styles/structure/plugin-workspace.css');
const superCss=read('src/styles/structure/super-top-contract.css');
const dataCenter=read('src/plugins/data-center/shared-views.js');
const resonance=read('src/plugins/resonance-workbench/view-components.js');

assert(coreCss.startsWith('@layer dkds.foundation, dkds.plugin, dkds.structure, dkds.presentation, dkds.theme, dkds.platform, dkds.window;'),
  'Core must use the canonical seven-layer cascade; global visibility must not be promoted above component structure.');
assert(!coreCss.includes('dkds.state')&&!coreCss.includes('styles/state/visibility.css'),
  'A global top-priority visibility layer must not return; it changes existing component visibility semantics globally.');
assert(/\.hidden\s*\{\s*display\s*:\s*none\s*;?\s*\}/.test(foundation),
  'Generic .hidden belongs to foundation; structural components that declare display must own their own .hidden override.');

assert(analysisCss.includes('grid-template-areas:\n    "left lsplit main rsplit right"'),
  'AnalysisWorkbench must retain the five-column left/resizer/main/resizer/right geometry.');
assert(analysisCss.includes('.dkds-analysis-main{grid-area:main;'),
  'AnalysisWorkbench main slot must be positioned by the canonical grid area.');
assert(pluginCss.includes('.dkds-plugin-canvas-center{grid-area:center;'),
  'PluginWorkspace scientific canvas must retain its explicit center grid area.');

for(const selector of [
  '.dkds-analysis-workbench-host', '.dkds-analysis-workbench{', '.dkds-analysis-header{',
  '.dkds-analysis-frame{', '.dkds-analysis-left{', '.dkds-analysis-main{',
  '.dkds-analysis-right{', '.dkds-analysis-bottom{', '.dkds-analysis-primary-host{'
]){
  assert(!superCss.includes(selector),`SUPER/TOP chrome must not re-own canonical AnalysisWorkbench geometry: ${selector}`);
}
assert(!/\.dkds-analysis-main\s*\{[^}]*grid-column\s*:/s.test(superCss),
  'Legacy three-column main-slot placement must not return in SUPER/TOP CSS.');
assert(!/\.dkds-analysis-frame\s*\{[^}]*grid-template-columns\s*:\s*auto\s+minmax\(0,1fr\)\s+auto/s.test(superCss),
  'Legacy three-column AnalysisWorkbench grid must not return.');

assert(dataCenter.includes("wb.compose({primary:{id:'main',label:'数据中心',scroll:'auto',leftNode:left,mainNode:main}})"),
  'Data Center must compose both its data rail and primary content into PluginWorkspace.');
assert(resonance.includes("primary:{id:'main',label:'共振分析',scroll:'contained',leftNode:leftPanel,mainNode:mainArea}"),
  'Resonance must compose both its control rail and primary scientific plot area into PluginWorkspace.');

console.log('v3.61.93 Workbench hydration + visual contract PASS: canonical five-column geometry is single-owned and primary content is composed for Data Center/Resonance.');
