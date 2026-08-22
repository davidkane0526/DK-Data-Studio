'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(value,message){if(!value)throw new Error(message);}

assert(json('package.json').version==='3.61.20','Application version must be 3.61.20.');
const ui=read('src/core/ui-infrastructure.js');
const css=read('src/style.css');
const sdk=JSON.parse(read('sdk/contract.json'));

assert(ui.includes("const VERSION = '6.9.1'"),'UI infrastructure version must advance for draggable D3 navigation chrome.');
assert(ui.includes('navigationToolsStorageKey()')&&ui.includes('setNavigationToolsPosition(x,y')&&ui.includes('clampNavigationTools()'),'ScientificCurveSurface must own bounded navigation-tool placement.');
assert(ui.includes("drag.addEventListener('pointerdown'")&&ui.includes("drag.addEventListener('pointermove'")&&ui.includes("drag.addEventListener('pointerup'"),'D3 navigation tools must support pointer drag without plugin code.');
assert(ui.includes('this.restoreNavigationToolsPosition()')&&ui.includes("localStorage.removeItem(key)"),'D3 navigation-tool position must persist and support reset.');
assert(ui.includes("drag.addEventListener('dblclick'")&&ui.includes('this.resetNavigationToolsPosition()'),'Double-clicking the drag handle must restore the Core default placement.');
assert(css.includes('.dkds-scientific-nav-tools{position:absolute;right:8px;top:8px;bottom:auto'),'Core D3 navigation must default away from the X-axis in the upper-right plot area.');
assert(css.includes('opacity:.85'),'Core D3 navigation must use the requested 85% resting opacity.');
assert(css.includes('box-shadow:0 2px 7px rgba(28,42,70,.055)'),'Core D3 navigation shadow must remain intentionally light.');
assert(css.includes('width:23px;height:23px')&&css.includes('width:11px;height:23px'),'Core D3 navigation chrome must be compact.');
assert(sdk.pluginApiVersion==='1.15.0'&&sdk.minimumAppVersion==='3.61.18','Internal D3 navigation polish must not change the Plugin SDK contract or minimum app version.');
console.log('v3.61.20 Core draggable D3 navigation toolbar checks passed.');
