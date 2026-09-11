'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const readComposition=require('./helpers/read-composition');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



const material=read('src/core/theme/material-renderer.js');const semantic=read('src/core/theme/semantic-registry.js');
assert(material.includes(".statusbar-command-cluster button"),'status-bar command buttons must participate in integrated-child ownership');
assert(semantic.includes("function chromeOwnedIntegrated(el)"),'canonical semantic chrome ownership helper missing');
assert(semantic.includes("if(chromeOwnedIntegrated(el))return ''"),'chrome-owned command hit regions must not receive their own Material Role');
assert(material.includes("el.classList.remove('dkds-material-role-control')"),'renderer must remove legacy nested control-role paint under chrome');
assert(material.includes('Semantic.materialAreas()')&&semantic.includes('INTEGRATED_CONTAINER_SELECTOR'),'initial role scan and integrated ownership must come from the canonical semantic registry');

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
const componentCss=read('src/styles/theme/component-appearance.css');
assert(semantic.includes('chromeOwnedIntegrated(el)')&&semantic.includes("if(chromeOwnedIntegrated(el))return '';")&&css.includes('Header-owned command wrappers are transparent composition only.'),'semantic chrome group/component ownership invariant missing');
assert(semantic.includes('.statusbar-command-cluster')&&semantic.includes('INTEGRATED_CONTAINER_SELECTOR'),'statusbar fusion must be semantic-registry-owned rather than widget-specific material paint');
assert(componentCss.includes('background-color:color-mix(in srgb,var(--dkui-role-control-surface,var(--dkui-surface)) 30%,transparent);'),'glass fields must use a flat translucent fill rather than an opaque recessed control surface');
assert(semantic.includes('.dkds-integrated-action-group button')&&componentCss.includes('[data-dkds-component-identity="toolbarAction"]')&&!/dkds-theme-mode-switch>button[^{}]*(?:\.active|aria-pressed)[^{]*\{[^}]*background:/s.test(chromeCss),'theme switch must use semantic toolbarAction state paint instead of Theme-panel-specific root-mode repainting');
assert(css.includes('.plugin-export-context{')&&css.includes('background:transparent'),'export context metadata must not create an opaque light strip inside dark popovers');

const runtime=read('src/core/theme/runtime.js');
const thinTheme=read('src/plugins/thin-glass-theme/plugin.js');
assert(runtime.includes('channel?.postMessage?.({theme:next,preferredProfile,activeProfile})'),'appearance broadcast must preserve preferred profile instead of temporary fallback profile');
assert(runtime.includes("profile=String(event?.data?.preferredProfile||event?.data?.profile||'')"),'broadcast listener must prefer the persistent profile field');
assert(thinTheme.includes("radius:10,radiusLg:13"),'Thin Glass Theme must use the compact glass geometry.');
assert((thinTheme.match(/shadowFloat:'0 8px /g)||[]).length>=2,'Thin Glass hierarchy must use restrained floating depth in both modes.');
assert(!/shadowFloat:'0 0 0 1px /.test(thinTheme),'Thin Glass must not layer an extra centered halo rim on floating surfaces.');

console.log('v3.61.82 chrome/glass Core ownership checks passed.');
