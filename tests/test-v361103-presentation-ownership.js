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
for(const token of ['.dkds-analysis-nav-btn','#statusBar.statusbar','.plugin-status-item.active'])assert(text['control-status.css'].includes(token),`control-status.css is missing ${token}.`);
assert(!text['scientific.css'].includes('body.dkds-modern-ui button:hover:not(:disabled)'),'Scientific presentation must not own generic button hover geometry.');
assert(text['shell.css'].includes('body.dkds-modern-ui button:hover:not(:disabled){transform:none}'),'Shell must own geometry-stable generic button hover.');
assert(text['shell.css'].includes('box-shadow:var(--dkui-selected-shadow)'),'Shell must consume the semantic centered selected Activity shadow.');
assert(text['plugin-chrome.css'].includes('box-shadow:var(--dkui-selected-shadow)'),'Plugin chrome must consume the same semantic selected Activity shadow in dark mode.');
const dup=duplicates(owners);
assert.equal(dup.length,0,`Presentation selectors must have one file owner; duplicates: ${dup.map(([s,n])=>`${s}=>${[...n].join('|')}`).join(', ')}`);
console.log(`v3.62 presentation ownership PASS: ${files.length} modules, duplicate selectors=0.`);
