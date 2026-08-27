'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const readComposition=require('./helpers/read-composition');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.96');

const material=read('src/core/theme/material-renderer.js');
assert(material.includes(".statusbar-command-cluster button"),'status-bar command buttons must participate in integrated-child ownership');
assert(material.includes("function chromeOwnedIntegrated(el)"),'semantic chrome ownership helper missing');
assert(material.includes("function inferRole(el){if(chromeOwnedIntegrated(el))return ''"),'chrome-owned command hit regions must not receive their own Material Role');
assert(material.includes("el.classList.remove('dkds-material-role-control')"),'renderer must remove legacy nested control-role paint under chrome');
assert(material.includes('root.querySelectorAll(INTEGRATED_CONTAINER_SELECTOR)'),'initial role scan must include integrated containers instead of waiting for a mutation');

for(const [label,source] of [
  ['src/index.html',read('src/index.html')],
  ['src/app/composition',readComposition(root,'src/app')],
  ['src/plugins/resonance-workbench/view-components.js',read('src/plugins/resonance-workbench/view-components.js')],
  ['src/core/ui/composition',readComposition(root,'src/core/ui/composition')]
]){
  assert(!/(?:panel-header-actions|trend-header-actions|dkds-plot-view-actions)[^"'\n]*dkds-material-role-control/.test(source),`${label} must not hard-code a nested control MaterialSurface in chrome`);
}

const css=read('src/styles/theme/material-renderer.css');
const chromeCss=read('src/styles/theme/integrated-command-chrome.css');
assert(chromeCss.includes('Chrome owns its actions.'),'semantic chrome CSS invariant missing');
assert(chromeCss.includes('.statusbar-command-cluster')&&chromeCss.includes('[data-dkds-material-role="chrome"]'),'statusbar fusion must be role-owned rather than widget-specific material paint');
assert(css.includes('background-color:color-mix(in srgb,var(--dkui-surface) 30%,transparent);'),'glass fields must use a flat translucent fill rather than an opaque recessed control surface');
assert(chromeCss.includes('#dkdsThemePanel .dkds-theme-mode-switch>button[data-dkds-theme-mode="light"]'),'theme switch must have deterministic root-mode styling');
assert(css.includes('.plugin-export-context{')&&css.includes('background:transparent'),'export context metadata must not create an opaque light strip inside dark popovers');

const runtime=read('src/core/theme/runtime.js');
assert(runtime.includes('channel?.postMessage?.({theme:next,preferredProfile,activeProfile})'),'appearance broadcast must preserve preferred profile instead of temporary fallback profile');
assert(runtime.includes("profile=String(event?.data?.preferredProfile||event?.data?.profile||'')"),'broadcast listener must prefer the persistent profile field');
assert(runtime.includes("radius:10,radiusLg:13"),'built-in Thin Glass must use the SDK-reference compact glass geometry');
assert(runtime.includes("shadowFloat:'0 6px 18px rgba(100,116,139,.12),0 1px 4px rgba(100,116,139,.09)'")&&runtime.includes("shadowFloat:'0 6px 18px rgba(0,0,0,.14),0 1px 4px rgba(0,0,0,.08)'"),'Thin Glass hierarchy must retain visible but restrained optical separation');

console.log('v3.61.82 chrome/glass Core ownership checks passed.');
