#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const [major,minor,patch]=String(json('package.json').version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>68||(minor===68&&patch>=8))),'Responsive preview/chrome closure requires v3.68.8+.');

const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const dcCss=read('src/plugins/data-center/plugin.css');
const dcRuntime=read('src/plugins/data-center/feature-runtime.js');
const dcChartRuntime=read('src/plugins/data-center/chart-runtime.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const resonancePresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
const desktopChrome=read('src/styles/structure/desktop-chrome-geometry.css');
const appearance=read('src/styles/theme/component-appearance.css');

// Dense auto-fit controls must keep the user's compact minimum but use spare
// horizontal space instead of freezing at a narrow 116 px max track.
assert(/\.schema-parameter-panel\.auto-fit\.compact:not\(\.layout-host-owned\)\{[\s\S]*?grid-template-columns:var\(--dkds-parameter-auto-fit-compact-columns,repeat\(auto-fit,minmax\(96px,1fr\)\)\);[\s\S]*?justify-content:stretch;[\s\S]*?gap:4px 6px/.test(schema),'Core-owned compact+autoFit must stretch 96 px minimum tracks to consume the available row.');
assert(!schema.includes('repeat(auto-fit,minmax(96px,116px))'),'compact+autoFit must not reintroduce the fixed 116 px ceiling that left unused row space.');
const dcUnits=read('src/plugins/data-center/unit-presentation.js');
assert(dcRuntime.includes("ctx.modules.require('chart-runtime')")&&dcChartRuntime.includes("compact:true,autoFit:true,layoutOwner:'host'")&&dcUnits.includes("className:'dc-chart-params',geometry:{display:'grid'"),'Data Center delegated chart preview must retain compact field semantics while one enclosing Unit exclusively owns its accepted four-track outer grid.');

// The inline Data Center preview is a bounded preview, not an unbounded page
// height consumer. Docked/floating PlotViews still switch to the Core viewport
// consumer contract through later structure-layer rules.
assert(dcCss.includes('--dc-chart-height:clamp(180px,42dvh,340px)')&&dcCss.includes('--dc-chart-min-height:180px')&&dcCss.includes('.dc-chart{height:var(--dc-chart-height);min-height:var(--dc-chart-min-height);box-sizing:border-box;overflow:hidden}'),'Data Center inline chart height must remain viewport-aware through the single plugin-owned geometry token contract.');
assert(!dcCss.includes('.dc-chart{height:430px;min-height:320px}'),'The old fixed 430/320 px preview geometry must stay removed.');
assert(!/\.dkds-size-compact \.dc-chart\{[^}]*height:/.test(dcCss),'Desktop size buckets must not override the viewport-bounded Data Center preview height.');
assert(!/>\.dc-chart-pane \.dc-chart\{height:340px;min-height:280px\}/.test(dcCss),'Wide Data Center layout must not maintain a second chart-height owner.');

// Main scientific tools are one FloatingChrome silhouette. Core owns one
// symmetric inset; plugin code may align the shared outer height but must not
// independently re-declare padding. This prevents the inner action contour from
// drifting closer to one outer edge than another.
assert(resonancePresentation.includes("units.floatingChrome.create(head,{variant:'accepted-main',className:'respar-main-tools dkds-toolbar dkds-floating-surface dkds-integrated-action-group'})"),'Resonance main tools must be created by the canonical FloatingChrome Unit so the identity hook is runtime-owned.');
assert(/\[data-dkds-floating-chrome\]\.dkds-integrated-action-group\{[\s\S]*?--dkds-floating-chrome-inset:3px;[\s\S]*?box-sizing:border-box;[\s\S]*?padding:var\(--dkds-floating-chrome-inset\)/.test(desktopChrome),'FloatingChrome must derive symmetric outer spacing from one Core inset token.');
const mainToolsBlock=(resonanceCss.match(/#resonanceDedicatedPage \.respar-main-tools\{([^}]*)\}/)||[])[1]||'';
assert(mainToolsBlock.includes('height:var(--respar-main-chrome-height)')&&!/padding\s*:/.test(mainToolsBlock),'Resonance may align the shared chrome height but must not own FloatingChrome padding.');
assert(appearance.includes('[data-dkds-component-identity="floatingChrome"].dkds-integrated-action-group>')&&appearance.includes('border-radius:0')&&appearance.includes('box-shadow:none'),'FloatingChrome child actions must remain fused into the single outer silhouette.');

console.log('v3.68.8 responsive chart preview + fluid compact row + symmetric FloatingChrome closure PASS');
