'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(pkg.version,'3.68.47'));

const chrome=read('src/plugin-window/chrome.js');
assert(chrome.includes('window.DKDSUI?.actions?.list?.(activityId)'),'Dedicated titlebar must consume the current Core action registry instead of moving plugin DOM.');
assert(chrome.includes('window.DKDSUI?.workspaces?.actions?.(activityId)'),'Dedicated titlebar must consume the current Core workspace registry.');
assert(chrome.includes("filter(row=>String(row.kind||'')!=='primary')"),'Same-name PRIMARY routes must not be recreated in the dedicated titlebar.');
assert(chrome.includes("window.DKDSUI?.actions?.invoke?.(activityId,row.id)"),'Plugin titlebar proxies must invoke the canonical Core action registry.');
assert(chrome.includes('variant:row.variant')&&chrome.includes("const semanticVariant=String(variant||'').trim()||(active?'active':'quiet')"),'Dedicated titlebar proxies must preserve the canonical action variant instead of forcing every command to quiet.');
assert(chrome.includes("window.DKDSUI?.workspaces?.invoke?.(activityId,row.id||row.surfaceId)"),'Core surface buttons must invoke the canonical workspace registry.');
assert(chrome.includes("page?.querySelector?.('[data-dkds-slot=\"workbench-import\"] button,[data-dkds-core-action=\"workbench-import\"]')"),'Dedicated titlebar must present the Core workbench import action when available.');
assert(!chrome.includes('appendChild(node)')&&!chrome.includes('rememberAnchor('),'Dedicated titlebar must not reparent live PluginWorkspace action/navigation DOM.');
assert(chrome.includes("document.body.dataset.dkdsTitlebarPresentation='ready'"),'Dedicated titlebar presentation readiness must be explicit.');

const style=read('src/plugin-window/style.css');
assert(style.includes('.plugin-window-actions{min-width:0;max-width:100%;display:flex;align-items:center;justify-content:flex-end'),'Dedicated actions must remain a compact registry-driven cluster rather than owning the flexible titlebar span.');
assert(style.includes('body.plugin-window-host .dkds-analysis-nav{display:none}'),'Body-level PluginWorkspace navigation must not remain as a second toolbar in dedicated windows.');
assert(style.includes('.plugin-window-titlebar .toolbar-btn{height:34px;min-height:34px'),'Dedicated titlebar actions must consume main-shell toolbar geometry.');

const ter=read('src/plugins/ter-analysis/unit-presentation.js');
for(const label of ["label:'自动参数'","label:'计算 TER'","label:'布局'"])assert(ter.includes(label),`TER must still register ${label} as current SDK actions.`);
const resonance=read('src/plugins/resonance-workbench/view-components.js');
assert(!resonance.includes('localSurfaceActions'),'Resonance must not duplicate Core workspace surfaces inside plugin-owned titlebar actions.');

const aux=read('desktop/main-modules/auxiliary-window-runtime.js');
assert(aux.includes('dedicated titlebar lost plugin actions'),'Electron smoke must fail closed when registered plugin actions are missing from the titlebar.');
assert(aux.includes('dedicated titlebar lost Core workspace actions'),'Electron smoke must fail closed when Core surface actions are missing from the titlebar.');
assert(aux.includes('dedicated titlebar lost the Core import action'),'Electron smoke must fail closed when Core import is omitted.');

console.log('v3.68.47 dedicated titlebar registry-presentation contract PASS.');
