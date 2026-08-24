const fs=require('fs');
const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const pkg=json('package.json');
const plugin=read('src/plugins/connectivity-center/plugin.js');
const manifest=json('src/plugins/connectivity-center/plugin.json');

assert.equal(pkg.version,'3.61.48','Connectivity navigation regression must run against v3.61.48.');
assert.equal(manifest.version,'1.1.1','Connectivity Center plugin version must be 1.1.1.');
assert(plugin.includes("onActivate:()=>ctx.workspace.openPage('connectivityCenterPage')"),'Connectivity Activity must own opening its page.');
assert(plugin.includes("onClick:()=>ctx.ui.activities.activate('connectivity-center')"),'Tools-menu entry must activate the Connectivity Activity before opening its page.');
assert(!plugin.includes("menu:'tools',label:'连接 / SMB / AI / MCP',order:34,onClick:()=>ctx.workspace.openPage"),'Tools-menu entry must not bypass Activity visibility state.');
console.log('v3.61.48 Connectivity tools-menu Activity navigation regression passed.');
