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
assert(css.includes('.dkds-scientific-nav-tools{position:absolute;right:8px;top:8px;bottom:auto'),'Core D3 navigation must default away from the X-axis in the upper-right plot area.');
assert(css.includes('opacity:0')&&css.includes('pointer-events:none'),'Core D3 navigation must auto-hide at rest without changing geometry.');
const chartRuntime=read('src/core/scientific/chart-runtime.js');
const curveNavigation=read('src/core/ui/modules/scientific-curve/navigation.js');
for(const [name,source] of [['ChartRuntime',chartRuntime],['ScientificCurve',curveNavigation]]){
  assert(source.includes('dkds-scientific-nav-tools')&&source.includes('dkds-integrated-action-group dkds-material-role-floating'),`${name} must consume the shared floating scientific-navigation surface.`);
  assert(source.includes("drag.dataset.dkdsComponentIdentity='toolbarAction'")&&source.includes("drag.dataset.dkdsComponentVariant='quiet'"),`${name} drag affordance must consume the same canonical quiet ToolbarAction as the navigation buttons.`);
}
assert(css.includes('.dkds-scientific-nav-drag{display:flex;align-items:center;justify-content:center;width:25px;min-width:25px;height:24px;min-height:24px')&&css.includes('.dkds-scientific-nav-tools button{display:flex;align-items:center;justify-content:center;width:25px;height:24px;min-width:25px;min-height:24px'),'Both scientific navigation runtimes must share the same compact 25x24 hit-region geometry.');
const material=read('src/styles/theme/material-renderer.css');
const components=read('src/styles/theme/component-appearance.css');
assert(material.includes('.dkds-scientific-nav-tools.dkds-material-role-floating'),'Core Material Renderer must be the sole floating-surface owner for scientific navigation.');
assert(components.includes('.dkds-scientific-nav-tools [data-dkds-component-identity="toolbarAction"]{border-radius:6px}'),'Scientific navigation hit regions must share one canonical hover/shape appearance.');

assert(sdk.pluginApiVersion==='1.19.0'&&sdk.minimumAppVersion==='3.67.5','Historical D3 navigation behavior must remain valid under the current SDK 1.23 / Plugin API 1.19 host minimum.');
console.log('v3.61.20 Core draggable D3 navigation toolbar checks passed.');
