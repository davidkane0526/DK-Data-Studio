'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const current=String(pkg.version||'0.0.0').split('.').map(Number);
assert(current[0]>3||(current[0]===3&&(current[1]>67||(current[1]===67&&current[2]>=20))),'R7W requires application 3.67.20 or newer.');
const curve=read('src/core/ui/modules/scientific-curve/navigation.js');
const chart=read('src/core/scientific/chart-runtime.js');
const css=read('src/styles/theme/component-appearance.css');
const semantics=read('src/styles/theme/integrated-command-chrome.css');
const diagnostics=read('src/diagnostics/automation-visual-cases.js');
for(const [label,source] of [['ScientificCurve',curve],['ChartRuntime',chart]]){
  assert(source.includes("const drag=document.createElement('button');drag.type='button';drag.className='dkds-scientific-nav-drag';"),`${label} drag handle must use a native button.`);
  assert(!source.includes("const drag=document.createElement('span');drag.className='dkds-scientific-nav-drag'"),`${label} must not keep a span-specific drag paint path.`);
  assert(source.includes("drag.dataset.dkdsComponentIdentity='toolbarAction'")&&source.includes("drag.dataset.dkdsComponentVariant='quiet'"),`${label} drag handle must consume the same ToolbarAction/quiet identity as navigation buttons.`);
}
assert(css.includes('[data-dkds-component-identity="floatingChrome"].dkds-integrated-action-group>')&&css.includes('[data-dkds-component-identity="toolbarAction"]:hover:not(:disabled)'), 'Floating scientific children must use canonical ToolbarAction hover paint.');
assert(!/\.dkds-scientific-nav-drag\s*\{[^}]*(?:background|border(?:-color)?|box-shadow|color)\s*:/s.test(semantics),'Drag semantics CSS must not repaint the handle independently.');
assert(diagnostics.includes("assert(drag.tagName==='BUTTON'"),'Windows visual diagnostics must protect native-button drag-handle identity.');
console.log('v3.67.20 R7W scientific navigation drag hover parity PASS.');
