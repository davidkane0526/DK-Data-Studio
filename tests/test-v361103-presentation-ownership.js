'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const {ownerMap,duplicates}=require('./helpers/style-ownership');
const assert=require('assert');

const relDir='src/styles/presentation';
assert(!fs.existsSync(path.join(root,relDir,'workspace-theme-boundary.css')),'The catch-all workspace-theme-boundary compatibility patch layer must not return.');
const {files,text,owners}=ownerMap(root,relDir);
for(const name of files.filter(name=>name!=='control-status.css')){
  assert(!text[name].includes('.dkds-analysis-nav-btn'),`${name} must not own AnalysisWorkbench navigation state.`);
  assert(!text[name].includes('.plugin-status-item'),`${name} must not own status-item state.`);
  assert(!text[name].includes('#statusBar.statusbar'),`${name} must not own status-bar chrome.`);
}
for(const token of ['.dkds-analysis-nav-btn','#statusBar.statusbar','.plugin-status-item'])assert(text['control-status.css'].includes(token),`control-status.css is missing geometry owner ${token}.`);
assert(!text['control-status.css'].includes('.plugin-status-item.active')&&!text['control-status.css'].includes('.dkds-analysis-nav-btn.active'),'Presentation must not own Theme-managed active paint for status or analysis navigation controls.');
assert(!text['scientific.css'].includes('body.dkds-modern-ui button:hover:not(:disabled)'),'Scientific presentation must not own generic button hover geometry.');
assert(text['shell.css'].includes('body.dkds-modern-ui button:hover:not(:disabled){transform:none}'),'Shell must own geometry-stable generic button hover.');
const component=fs.readFileSync(path.join(root,'src/styles/theme/component-appearance.css'),'utf8');
assert(!text['shell.css'].includes('box-shadow:var(--dkui-selected-shadow)')&&!text['plugin-chrome.css'].includes('box-shadow:var(--dkui-selected-shadow)'),'Presentation modules must not own semantic selected-state shadow paint.');
assert(component.includes('--dkds-ca-action-shadow-selected:var(--dkui-component-toolbar-action-shadow-selected,var(--dkds-ca-action-shadow))')&&component.includes('box-shadow:var(--dkds-ca-action-shadow-selected)'),'Canonical Component Appearance must be the single consumer of Theme 3.10 selected-state depth.');
const dup=duplicates(owners);
assert.equal(dup.length,0,`Presentation selectors must have one file owner; duplicates: ${dup.map(([s,n])=>`${s}=>${[...n].join('|')}`).join(', ')}`);
console.log(`v3.62 presentation ownership PASS: ${files.length} modules, duplicate selectors=0.`);
