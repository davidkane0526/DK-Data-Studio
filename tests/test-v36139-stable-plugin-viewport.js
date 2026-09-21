'use strict';
const sdkAtLeast=(value,floor)=>{const a=String(value||'0.0.0').split('.').map(Number),b=String(floor||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const {inspectWorkspaceStyles}=require('../sdk/layout-contract');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const contract=json('sdk/contract.json');
const css=readCoreCss(root);
const toolTemplate=read('sdk/templates/tool-plugin/plugin.js');
const topTemplate=read('sdk/templates/top-workspace-plugin/plugin.js');
const sdkReadme=read('sdk/README.md');
const topDocs=read('sdk/TOP_WORKSPACES.md');
const toolDocs=read('sdk/TOOL_PLUGINS.md');


assert(sdkAtLeast(contract.sdkVersion,'1.49.0'));
assert.equal(contract.pluginApiVersion,'1.19.0');
assert(sdkAtLeast(contract.minimumAppVersion,'3.70.6'));

const safeHost='[data-primary-scroll="safe"] .dkds-analysis-primary-host';
assert(/\.dkds-plugin-canvas-frame\[data-primary-scroll="safe"\] \.dkds-plugin-canvas-center\s*\{[^}]*overflow\s*:\s*hidden[^}]*min-height\s*:\s*0[^}]*align-items\s*:\s*stretch/i.test(css),'safe mode must keep the outer canvas geometry bounded instead of making it the scroll owner.');
assert(/\[data-primary-scroll="safe"\] \.dkds-analysis-primary-host\s*\{[^}]*height\s*:\s*100%[^}]*min-height\s*:\s*0[^}]*overflow\s*:\s*auto[^}]*flex\s*:\s*1 1 auto/i.test(css),'safe mode must make the Primary host the single bounded Core-owned scroll container.');
assert(!/\[data-primary-scroll="safe"\] \.dkds-analysis-primary-host\s*\{[^}]*height\s*:\s*auto[^}]*min-height\s*:\s*100%[^}]*overflow\s*:\s*visible/i.test(css),'safe mode must never return to document-flow self-growth semantics.');
assert(/\[data-primary-scroll="auto"\] \.dkds-analysis-primary-host\s*\{[^}]*height\s*:\s*auto[^}]*min-height\s*:\s*100%[^}]*overflow\s*:\s*visible[^}]*flex\s*:\s*0 0 auto/i.test(css),'auto mode must remain the explicit document-flow growth contract.');

for(const [name,text] of [['tool template',toolTemplate],['TOP template',topTemplate]]){
  assert(text.includes('ctx.ui.unitTemplates'),`${name} must teach the Unit-first authoring path.`);
  assert(text.includes('units.workspace.create')&&text.includes('.compose({'),`${name} must compose the default workspace through Unit Templates.`);
  assert(!text.includes('ctx.ui.workspaceSurface.create'),`${name} must not teach the low-level workspaceSurface path by default.`);
}
assert(!fs.existsSync(path.join(root,'sdk/templates/tool-plugin/plugin.css'))&&!fs.existsSync(path.join(root,'sdk/templates/top-workspace-plugin/plugin.css')),'Default TOP/Tool templates must not ship private layout CSS after the Unit-first authoring closure.');
for(const [name,text] of [['SDK README',sdkReadme],['TOP docs',topDocs],['Tool docs',toolDocs]]){
  assert(/bounded|固定视口|fixed Primary viewport/i.test(text),`${name} must document the bounded safe viewport contract.`);
}

const pulseLikeCss=`
.pulse-sampler-workbench{width:100%;min-width:0;min-height:100%}
.pulse-sampler-shell{width:100%;min-width:0;min-height:100%;display:grid;grid-template-columns:420px minmax(0,1fr);grid-template-rows:auto auto}
.ps-designer{display:grid;grid-template-rows:auto auto auto auto auto;gap:10px;padding:14px}
.ps-wave{display:grid;grid-template-rows:auto minmax(0,1fr) minmax(0,.58fr);min-height:560px}
`;
const report=inspectWorkspaceStyles({
  apiVersion:'1.19.0',pluginType:'tool',workspace:{role:'top'},styles:[{name:'plugin.css',content:pulseLikeCss}]
});
assert.equal(report.errors.length,0,'Legacy-safe plugin layout warnings must not become a breaking Plugin API 1.19 install error.');
assert(report.warnings.some(x=>x.includes('min-height:100%')),'SDK validator must flag percentage min-height chains that can feed intrinsic content height back into Tool layout.');
assert(report.warnings.some(x=>x.includes('auto Grid rows')&&x.includes('align-content:start')),'SDK validator must flag compact auto-row grids that stretch into large blank gaps when a sibling is taller.');

console.log('v3.61.39 stable PluginWorkspace viewport contract PASS');
