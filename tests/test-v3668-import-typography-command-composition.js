'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const tuple=v=>String(v).split('.').slice(0,3).map(Number);
const atLeast=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
const html=read('src/index.html');
const importStructure=read('src/styles/structure/import-workbench.css');
const analysisStructure=read('src/styles/structure/analysis-shell.css');
const componentStructure=read('src/styles/structure/workbench-components.css');
const schemaStructure=read('src/styles/structure/schema-and-plugin-ui.css');
const componentAppearance=read('src/styles/theme/component-appearance.css');
const shellPresentation=read('src/styles/presentation/shell.css');

assert(atLeast(tuple(pkg.version),[3,66,8]),'Import typography/command composition closure requires DK Data Studio 3.66.8+.');

// Import workbench ordinary copy must stay on the shared application scale.
for(const bad of ['font-size:8.5px','font-size:9px','font-size:10px','font-size:10.5px']){
  assert(!analysisStructure.split(/\n/).filter(line=>line.includes('.import')).join('\n').includes(bad),`Import workbench must not reintroduce private tiny typography: ${bad}`);
  assert(!componentStructure.split(/\n/).filter(line=>line.includes('import')).join('\n').includes(bad),`Import components must not reintroduce private tiny typography: ${bad}`);
}
assert(analysisStructure.includes('.import-target-heading span,.import-target-hint{font-size:var(--ui-font-small);}')&&analysisStructure.includes('.import-file-actions button{flex:1;font-size:var(--ui-font-size);}')&&importStructure.includes('.import-preview-chip{font-size:var(--ui-font-small);}'),'Import workbench labels, metadata and actions must consume shared typography tokens.');

// Neutral workbench actions explicitly request the canonical standalone action surface.
for(const id of ['importCloseBtn','importCheckAllBtn','importInvertBtn','importUncheckAllBtn','importRemoveBtn','importCancelBtn']){
  const re=new RegExp(`<button id="${id}"[^>]*class="[^"]*dkds-action-button[^"]*"[^>]*data-dkds-action-layout="standalone"`);
  assert(re.test(html),`${id} must explicitly consume the Core standalone ToolbarAction appearance.`);
}

// Import source is a true split action: one primary silhouette, compact 18 px caret.
const importStart=html.indexOf('<div class="import-header-actions">'),importEnd=html.indexOf('<div class="import-target-bar">',importStart),header=html.slice(importStart,importEnd);
assert(header.includes('import-data-command dkds-split-action-group')&&header.includes('data-dkds-split-variant="primary"'),'Import Data and source choice must use the reusable Core split-action group.');
assert(header.includes('primary dkds-split-action-main')&&header.includes('primary menu-trigger import-source-trigger dkds-split-action-caret'),'Both split hit regions must share the primary component tone.');
assert(componentStructure.includes('width:18px;min-width:18px;')&&componentStructure.includes('margin-left:-1px;'),'Split caret must stay compact and merge its border with the main action.');
assert(componentAppearance.includes('.dkds-split-action-group[data-dkds-split-variant="primary"]{box-shadow:var(--dkui-primary-shadow);}')&&componentAppearance.includes(':is(.dkds-split-action-main,.dkds-split-action-caret){box-shadow:none;}'),'The split group, not each child, must own shared depth.');

// System commands remain one group, but natural-width labels replace 82 px reservations and separators.
assert(schemaStructure.includes('.dkds-segmented-command-group>.toolbar-btn,.dkds-segmented-command-group>.menu-anchor>.toolbar-btn{min-width:0;--dkds-command-padding-inline:9px;}'),'File and system command labels must share the same natural sizing and compact horizontal padding.');
assert(!componentStructure.includes('.system-core-tools-group>.menu-anchor:before')&&!componentAppearance.includes('.system-core-tools-group[data-dkds-component-identity="toolbarGroup"]>.menu-anchor:before')&&!shellPresentation.includes('.system-core-tools-group>.menu-anchor:before'),'System command group must not draw internal divider pseudo-elements in any style owner.');

console.log('v3.66.8 import typography and command composition PASS: shared type scale, canonical neutral actions, one-piece split import control and compact divider-free system commands are enforced.');
