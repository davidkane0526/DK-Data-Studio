'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json'),sdk=json('sdk/contract.json');
const appVersion=pkg.version.split('.').map(Number);
assert(appVersion[0]>3||(appVersion[0]===3&&(appVersion[1]>66||(appVersion[1]===66&&appVersion[2]>=1))),'context-aware export contract requires app 3.66.1+');
assert.strictEqual(sdk.sdkVersion,'1.23.0');
assert.strictEqual(sdk.minimumAppVersion,'3.67.5');
assert.strictEqual(sdk.pluginApiVersion,'1.19.0');
assert.strictEqual(sdk.themeContractVersion,'3.9.0');

const ui=read('src/core/plugins/kernel/modules/contributions/ui.js');
const shell=read('src/core/plugins/kernel/modules/activity/shell.js');
const menu=read('src/core/plugins/kernel/modules/shortcuts/menu.js');
const structure=read('src/styles/structure/schema-and-plugin-ui.css');
const dts=read('sdk/plugin-api.d.ts');
assert(ui.includes('normalizeMenuAvailability')&&ui.includes('evaluateMenuAvailability'),'Core menu contributions must own availability evaluation.');
assert(ui.includes("typeof spec.availability==='function'")&&ui.includes("Menu availability must be synchronous"),'Availability must be an explicit synchronous contract, not an async/fallback path.');
assert(ui.includes("['data:artifacts-changed','project:restored','activity:changed']")&&ui.includes("eventOn(name,()=>refreshMenuAvailability()"),'Core must refresh menu availability on shared project/data/activity context changes.');
assert(menu.includes("dkds:menu-will-open"),'Command menus must re-evaluate availability immediately before opening.');
assert(ui.includes("mount.closest('.command-menu')"),'Availability listeners must bind to the actual command-menu host, not a child contribution mount.');
assert(structure.includes('.plugin-menu-item.plugin-activity-hidden')&&structure.includes('.plugin-menu-item[hidden]{display:none;}'),'Command-menu layout must never override activity or availability hiding with display:flex.');
assert(shell.includes('当前工作区没有可导出内容'),'Registered export capability without current data must render one empty-state message instead of stale actions.');
assert(shell.includes('const registered=scopedItems.length>0')&&shell.includes('const availableItems='),'Shell must distinguish registered capability from current availability.');
assert(dts.includes('DKDSMenuAvailability')&&dts.includes('availability?:boolean|DKDSMenuAvailability'),'SDK types must publish the availability contract.');

const files=[
  'src/plugins/data-center/feature-runtime.js',
  'src/plugins/resonance-workbench/view-components.js',
  'src/plugins/ter-analysis/feature-runtime.js',
  'src/plugins/pulse-analysis/feature-runtime.js'
];
for(const file of files){
  const source=read(file);
  assert(source.includes("menu:'export'")&&source.includes('availability'),'First-party export contributor must bind real availability: '+file);
}
const resonance=read(files[1]);
assert(resonance.includes('hasMainExport')&&resonance.includes('hasPeakExport'),'Resonance must distinguish sweep-data exports from peak exports.');
const dc=read(files[0]);
assert(dc.includes('hasActiveTable')&&dc.includes('hasActiveArtifact'),'Data Center export visibility must follow active data/artifact state.');
const ter=read(files[2]);
assert(ter.includes('hasTerExport')&&ter.includes("result?.records"),'TER exports must require a computed TER result.');
const pulse=read(files[3]);
assert(pulse.includes('activeResultAvailable')&&pulse.includes('visibleResultsAvailable'),'Pulse exports must distinguish current-file and visible-result availability.');

console.log('v3.66.1+ context-aware export menu availability contract passed.');
