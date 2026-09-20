#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const [major,minor,patch]=String(json('package.json').version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>68||(minor===68&&patch>=6))),'Measured shell allocation and Core auto-fit closure requires v3.68.6+.');

// Current-context commands must consume the actual free workspace lane rather
// than a historical fixed 300/360 px bucket. Primary buttons remain content
// sized, while the cluster/context lane may grow into genuine spare width.
const shell=read('src/styles/structure/shell-navigation.css');
assert(/\.primary-activity-cluster\{[\s\S]*?flex:1 1 auto;[\s\S]*?width:auto;[\s\S]*?max-width:none/.test(shell),'Primary/context cluster must receive the free workspace width.');
assert(/\.primary-activity-bar\{[\s\S]*?flex:0 1 auto/.test(shell),'Primary activity buttons themselves must remain content-sized.');
assert(/\.context-commandbar\{[\s\S]*?min-width:0;[\s\S]*?flex:1 1 auto;[\s\S]*?width:auto;[\s\S]*?max-width:none/.test(shell),'Context commands must flex into the actual remaining lane.');
assert(/\.plugin-context-toolbar\{[\s\S]*?flex:0 1 auto;[\s\S]*?width:max-content;[\s\S]*?max-width:100%/.test(shell),'Visible context commands must stay content-packed instead of stretching a blank spacer before More.');
assert(shell.includes('.context-overflow-anchor{position:relative;margin-left:0;flex:0 0 auto}'),'More must sit immediately after the retained commands, not at an auto-margin edge.');
assert(!/context-commandbar\{[\s\S]{0,220}(?:360px|38vw|300px|34vw)/.test(shell),'Context command width must not regress to fixed 300/360 px or viewport-percentage caps.');

// Overflow decisions use the row's real inner pixels and real outer button
// widths, including margins/gaps. This prevents false overflow when the shell
// visibly has room and avoids the old magic +3 px accounting.
const toolbar=read('src/core/plugins/kernel/modules/shell/context-toolbar.js');
for(const token of ['row.clientWidth','getComputedStyle(row)','getComputedStyle(toolbar)','style.marginLeft','style.marginRight','toolbarStyle.columnGap','rowStyle.paddingLeft','rowStyle.paddingRight'])assert(toolbar.includes(token),`Context overflow measurement must include ${token}.`);
assert(toolbar.includes('sort(toolbar);')&&toolbar.indexOf('sort(toolbar);')<toolbar.indexOf('const visible='),'Toolbar command order must be normalized before measuring real button geometry.');
assert(toolbar.includes('markToolbarSections(toolbar);')&&toolbar.indexOf('markToolbarSections(toolbar);')<toolbar.indexOf('const visible='),'Toolbar section markers must be normalized before measuring real button geometry.');
assert(!toolbar.includes('getBoundingClientRect().width)+3'),'Magic +3 button width accounting must not return.');

// Preserve the accepted shell overflow paint/structure; clipping prevention is
// behavioral. Reflow must move complete activity buttons into 更多功能 before a
// plugin name can remain partially visible.
assert(/\.primary-activity-bar\{[\s\S]*?overflow-x:auto/.test(shell),'Accepted primary activity lane overflow structure must remain source-frozen; runtime reflow owns clipping prevention.');
assert(toolbar.includes('data-dkds-context-overflow-activity')&&toolbar.includes('primary.scrollWidth>primary.clientWidth+1'),'Primary activity overflow must be measured from real lane geometry and move whole buttons into 更多功能.');
assert(toolbar.includes('overflow.appendChild(button)'),'Overflow must reparent complete primary activity buttons rather than truncate their labels.');


// ParameterSchema autoFit is the Core default outer-grid contract. Source-parity
// Unit compositions may explicitly select layoutOwner=host, which disables only
// the default outer grid and prevents a specificity/inline-style ownership race.
const schema=read('src/styles/structure/schema-and-plugin-ui.css');
assert(schema.includes('.schema-parameter-panel.auto-fit:not(.layout-host-owned)')&&schema.includes('grid-template-columns:var(--dkds-parameter-auto-fit-columns,repeat(auto-fit,minmax(140px,205px)))'),'Desktop auto-fit forms must retain the Core fallback outside explicit host ownership.');
assert(/\.schema-parameter-panel\.auto-fit\.compact \.schema-param-field\{[\s\S]*?--dkds-field-control-min-height:[^;]+;[\s\S]*?--dkds-field-control-padding-block:[^;]+;[\s\S]*?--dkds-field-control-padding-inline:[^;]+/.test(schema),'Compact auto-fit controls must keep canonical Core field geometry even when the outer grid is host-owned.');
const dcRuntime=read('src/plugins/data-center/feature-runtime.js'),dcChartRuntime=read('src/plugins/data-center/chart-runtime.js'),dcCss=read('src/plugins/data-center/plugin.css'),dcPresentation=read('src/plugins/data-center/unit-presentation.js');
assert(dcRuntime.includes("ctx.modules.require('chart-runtime')")&&dcChartRuntime.includes("compact:true,autoFit:true,layoutOwner:'host'"),'Data Center chart preview must explicitly declare single host ownership for its accepted outer grid.');
assert(dcPresentation.includes("className:'dc-chart-params',geometry:{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(72px,.55fr)'")&&!dcCss.includes('.dc-chart-params.schema-parameter-panel.auto-fit.compact{'),'Accepted Data Center detail grid must have exactly one enclosing Unit Layout owner.');

console.log('v3.68.6 measured shell allocation + Core ParameterSchema auto-fit closure PASS');
