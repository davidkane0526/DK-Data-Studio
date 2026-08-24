'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(value,message){if(!value)throw new Error(message);}

assert(json('package.json').version==='3.61.46','Application version must be 3.61.20.');
const ui=read('src/core/ui-infrastructure.js');
const css=read('src/style.css');
const sdk=JSON.parse(read('sdk/contract.json'));

assert(ui.includes("const VERSION = '7.1.0'"),'UI infrastructure version must advance for draggable D3 navigation chrome.');
assert(ui.includes('navigationToolsStorageKey()')&&ui.includes('setNavigationToolsPosition(x,y')&&ui.includes('clampNavigationTools()'),'ScientificCurveSurface must own bounded navigation-tool placement.');
assert(ui.includes("drag.addEventListener('pointerdown'")&&ui.includes("drag.addEventListener('pointermove'")&&ui.includes("drag.addEventListener('pointerup'"),'D3 navigation tools must support pointer drag without plugin code.');
assert(ui.includes('this.restoreNavigationToolsPosition()')&&ui.includes("localStorage.removeItem(key)"),'D3 navigation-tool position must persist and support reset.');
assert(ui.includes("drag.addEventListener('dblclick'")&&ui.includes('this.resetNavigationToolsPosition()'),'Double-clicking the drag handle must restore the Core default placement.');
assert(css.includes('.dkds-scientific-nav-tools{position:absolute;right:8px;top:8px;bottom:auto'),'Core D3 navigation must default away from the X-axis in the upper-right plot area.');
assert(css.includes('opacity:0!important')&&css.includes('pointer-events:none!important'),'Core D3 navigation must auto-hide at rest without changing geometry.');
assert(css.includes('box-shadow:0 2px 7px rgba(28,42,70,.055)'),'Core D3 navigation shadow must remain intentionally light.');
assert(css.includes('padding:1px 4px 1px 2px')&&css.includes('width:23px;height:20px;min-width:23px')&&css.includes('width:11px;height:20px;flex:0 0 11px'),'Core D3 navigation chrome must keep the reduced vertical height, restored horizontal button width, and 4 px right shell padding.');
assert(css.includes('display:flex;align-items:center;justify-content:center;width:23px;height:20px')&&css.includes('background-clip:padding-box;box-shadow:none'),'Core D3 navigation buttons must center their visual highlight without inherited shadow drift.');
assert(sdk.pluginApiVersion==='1.17.0'&&sdk.minimumAppVersion==='3.61.39','Internal D3 navigation polish must not change the Plugin SDK current SDK contract and hardened host minimum.');
console.log('v3.61.20 Core draggable D3 navigation toolbar checks passed.');
