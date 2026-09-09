'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(value,message){if(!value)throw new Error(message);}


const ui=read('src/generated/runtime/ui-infrastructure.js');
const css=readCoreCss(root);
const sdk=JSON.parse(read('sdk/contract.json'));

assert(ui.includes("const VERSION = '7.1.0'"),'UI infrastructure version must advance for draggable D3 navigation chrome.');
assert(ui.includes('navigationToolsStorageKey()')&&ui.includes('setNavigationToolsPosition(x,y')&&ui.includes('clampNavigationTools()'),'ScientificCurveSurface must own bounded navigation-tool placement.');
assert(ui.includes("drag.addEventListener('pointerdown'")&&ui.includes("drag.addEventListener('pointermove'")&&ui.includes("drag.addEventListener('pointerup'"),'D3 navigation tools must support pointer drag without plugin code.');
assert(ui.includes('this.restoreNavigationToolsPosition()')&&ui.includes("localStorage.removeItem(key)"),'D3 navigation-tool position must persist and support reset.');
assert(ui.includes("drag.addEventListener('dblclick'")&&ui.includes('this.resetNavigationToolsPosition()'),'Double-clicking the drag handle must restore the Core default placement.');
assert(/\.dkds-scientific-nav-tools\{[\s\S]*?position:absolute;right:8px;top:8px;bottom:auto/.test(css),'Core D3 navigation must default away from the X-axis in the upper-right plot area.');
assert(css.includes('opacity:0')&&css.includes('pointer-events:none'),'Core D3 navigation must auto-hide at rest without changing geometry.');
const chartRuntime=read('src/core/scientific/chart-runtime.js');
const curveNavigation=read('src/core/ui/modules/scientific-curve/navigation.js');
for(const [name,source] of [['ChartRuntime',chartRuntime],['ScientificCurve',curveNavigation]]){
  assert(source.includes('dkds-scientific-nav-tools')&&source.includes('dkds-integrated-action-group dkds-material-role-floating'),`${name} must consume the shared floating scientific-navigation surface.`);
  assert(source.includes("drag.dataset.dkdsComponentIdentity='toolbarAction'")&&source.includes("drag.dataset.dkdsComponentVariant='quiet'"),`${name} drag affordance must consume the same canonical quiet ToolbarAction as the navigation buttons.`);
}
assert(css.includes('--dkds-scientific-nav-item-width:28px')&&css.includes('--dkds-scientific-nav-item-height:28px')&&css.includes('--dkds-header-action-height:var(--dkds-scientific-nav-item-height)')&&css.includes('width:var(--dkds-scientific-nav-item-width)'),'Both scientific navigation runtimes must share the same slot-owned compact 28x28 hit-region geometry.');
const material=read('src/styles/theme/material-renderer.css');
const components=read('src/styles/theme/component-appearance.css');
assert(material.includes('.dkds-scientific-nav-tools.dkds-material-role-floating'),'Core Material Renderer must be the sole floating-surface owner for scientific navigation.');
assert(components.includes('border-radius:var(--dkui-component-toolbar-action-radius,var(--ui-control-radius,8px))'),'Scientific navigation hit regions must consume the canonical Theme-resolved ToolbarAction radius instead of a location-specific radius.');

assert(sdk.pluginApiVersion==='1.19.0'&&sdk.minimumAppVersion==='3.68.36','Historical D3 navigation behavior must remain valid under the current SDK 1.28 / Plugin API 1.19 host minimum.');
console.log('v3.61.20 Core draggable D3 navigation toolbar checks passed.');
