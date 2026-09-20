'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



const coreCss=read('src/core.css');
const foundation=read('src/styles/foundation/foundation.css');
const utility=read('src/styles/utility/visibility.css');
const analysisCss=read('src/styles/structure/analysis-workbench.css');
const pluginCss=read('src/styles/structure/plugin-workspace.css');
const superCss=read('src/styles/structure/super-top-contract.css');
const dataCenter=read('src/plugins/data-center/unit-presentation.js');
const resonance=read('src/plugins/resonance-workbench/unit-presentation.js');

assert(coreCss.startsWith('@layer dkds.foundation, dkds.plugin, dkds.plugin-platform, dkds.structure, dkds.presentation, dkds.theme, dkds.motion, dkds.platform, dkds.window, dkds.utility;'),
  'Core must keep workbench geometry below a final paint-free visibility utility.');
assert(!coreCss.includes('dkds.state')&&!coreCss.includes('styles/state/visibility.css'),
  'Legacy dkds.state must not return; visibility is a narrow utility contract rather than a general state/paint layer.');
assert(!/(^|[},])\s*\.hidden\s*\{\s*display\s*:\s*none/m.test(foundation)&&/:where\(\.hidden,\[hidden\]\)\{display:none;\}/.test(utility),
  'Global hidden state must be single-owned by the final utility layer without changing Workbench grid geometry.');

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

assert(dataCenter.includes('workbench.compose({')&&dataCenter.includes("id:'data-control'")&&dataCenter.includes("presentationRole:'data-control'")&&!dataCenter.includes("layout.className='dc-workspace-layout'"),
  'Data Center production Unit composition must publish the data rail as a semantic data-control PRIME without private desktop rail geometry.');
assert(resonance.includes("primary:{id:'main',label:'共振分析',presentationRole:'scientific-primary'")&&resonance.includes("scroll:'contained'")&&resonance.includes("mainNode")&&resonance.includes("const dataControl=units.prime.build({id:'data-control'")&&resonance.includes("autoOpen:true,existingNode:dataNode"),
  'Resonance production Unit composition must compose the scientific PRIMARY and semantic data-control PRIME through PluginWorkspace without hard-coding desktop left geometry into PRIMARY.');

console.log('v3.61.93 Workbench hydration + visual contract PASS: canonical Core geometry remains single-owned while plugins retain domain-specific PRIMARY composition.');
