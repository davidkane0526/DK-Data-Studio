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
assert(toolbar.includes('sort(toolbar);markToolbarSections(toolbar);'),'Toolbar sections must be normalized before measuring real button geometry.');
assert(!toolbar.includes('getBoundingClientRect().width)+3'),'Magic +3 button width accounting must not return.');

// ParameterSchema autoFit is a Core structure contract because dkds.structure
// intentionally cascades after dkds.plugin. Data Center only opts into it.
const schema=read('src/styles/structure/schema-and-plugin-ui.css');
assert(schema.includes('grid-template-columns:var(--dkds-parameter-auto-fit-columns,repeat(auto-fit,minmax(140px,205px)))')&&/\.schema-parameter-panel\.auto-fit\{[\s\S]*?justify-content:start;[\s\S]*?align-items:end/.test(schema),'Desktop auto-fit forms must retain the compact fallback while Core exposes a configuration token.');
assert(/\.schema-parameter-panel\.auto-fit\.compact \.schema-param-field\{[\s\S]*?--dkds-field-control-min-height:[^;]+;[\s\S]*?--dkds-field-control-padding-block:[^;]+;[\s\S]*?--dkds-field-control-padding-inline:[^;]+/.test(schema),'Compact auto-fit controls must size the canonical dkds-field-control geometry, not only the legacy schema fallback variables.');
const dcRuntime=read('src/plugins/data-center/feature-runtime.js'),dcCss=read('src/plugins/data-center/plugin.css');
assert(dcRuntime.includes('compact:true,autoFit:true'),'Data Center chart preview must request Core compact auto-fit layout.');
assert(!/#dcChartParams[^\n{]*\{[^}]*grid-template-columns/s.test(dcCss),'Data Center must not fight the later Core structure layer with a private chart grid override.');

console.log('v3.68.6 measured shell allocation + Core ParameterSchema auto-fit closure PASS');
