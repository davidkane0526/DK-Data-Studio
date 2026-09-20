'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
{const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=27))),'Measured mobile overflow priority requires v3.67.27+.');}

const overflowSource=read('mobile/src/model/overflow-layout.ts');
let transpiled=stripTypeScriptTypes(overflowSource,{mode:'transform'});
transpiled=transpiled
  .replace(/export\s+function\s+/g,'function ')
  .replace(/export\s+type[\s\S]*?;\n/g,'');
transpiled+='\nmodule.exports={packOrderedControls,packPriorityControls};\n';
const sandbox={module:{exports:{}},exports:{},Set,Math,Number};
vm.runInNewContext(transpiled,sandbox,{filename:'overflow-layout.ts'});
const {packOrderedControls,packPriorityControls}=sandbox.module.exports;
assert.strictEqual(typeof packOrderedControls,'function');
assert.strictEqual(typeof packPriorityControls,'function');

const widths={AI:50,SMB:50,WEB:50,THEME:50,MEMORY:50,DEVTOOL:50};
const rows=[
  {key:'THEME',priority:300,index:0},
  {key:'MEMORY',priority:200,index:1},
  {key:'DEVTOOL',priority:100,index:2},
  {key:'SMB',priority:500,index:3},
  {key:'AI',priority:600,index:4},
  {key:'WEB',priority:400,index:5},
];
const fallback=()=>50;
let packed=packPriorityControls({rows,widths,available:330,gap:10,overflowWidth:20,fallbackWidth:fallback});
assert.deepStrictEqual(Array.from(packed.hiddenKeys),['DEVTOOL'],'When only one bottom item must fold, DevTool must fold first regardless of display order.');
packed=packPriorityControls({rows,widths,available:270,gap:10,overflowWidth:20,fallbackWidth:fallback});
assert.deepStrictEqual(Array.from(packed.hiddenKeys),['MEMORY','DEVTOOL'],'Bottom preservation priority must fold DevTool, then Memory.');
packed=packPriorityControls({rows,widths,available:210,gap:10,overflowWidth:20,fallbackWidth:fallback});
assert.deepStrictEqual(Array.from(packed.hiddenKeys),['THEME','MEMORY','DEVTOOL'],'Theme must fold only after DevTool and Memory.');
packed=packPriorityControls({rows,widths,available:150,gap:10,overflowWidth:20,fallbackWidth:fallback});
assert.deepStrictEqual(Array.from(packed.hiddenKeys),['THEME','MEMORY','DEVTOOL','WEB'],'Web service must fold after Theme.');
packed=packPriorityControls({rows,widths,available:90,gap:10,overflowWidth:20,fallbackWidth:fallback});
assert.deepStrictEqual(Array.from(packed.hiddenKeys),['THEME','MEMORY','DEVTOOL','SMB','WEB'],'SMB must outlive Web/Theme/Memory/DevTool; AI must remain last.');

const pluginRows=['p1','p2','p3','p4'];
const pluginWidths={p1:60,p2:70,p3:80,p4:90};
const topPacked=packOrderedControls({keys:pluginRows,widths:pluginWidths,available:235,gap:5,overflowWidth:30,fallbackWidth:()=>64});
assert.deepStrictEqual(Array.from(topPacked.visibleKeys),['p1','p2'],'Top overflow must preserve leading plugin controls and collect only trailing plugin controls by actual pixel width.');
assert.deepStrictEqual(Array.from(topPacked.hiddenKeys),['p3','p4']);

const statusBar=read('mobile/src/components/NativeStatusBar.tsx');
for(const token of ["return 600","return 500","return 400","return 300","return 200","return 100","packPriorityControls"])
  assert(statusBar.includes(token),`Native status bar preservation model missing ${token}.`);
assert(statusBar.includes("DevTool is folded first")&&statusBar.includes("AI is the final canonical item to fold"),'Status-bar source must document preservation semantics so future cleanup does not invert them.');

const header=read('mobile/src/components/NativeHeader.tsx');
assert(header.includes('pluginAreaWidth')&&header.includes('packOrderedControls')&&header.includes('pluginMeasureLayer'),'Top plugin overflow must be based on measured available pixels and measured plugin controls.');
assert(!/pluginDirectLimit|directLimit|width\s*[<>]=?\s*\d+\s*\?\s*\d+/.test(header),'Top plugin overflow must not regress to fixed count breakpoints.');

const pulse=read('src/plugins/pulse-sampler-tool/plugin.js');
const pulseUnit=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
assert(!pulse.includes('isNativeClient')&&!pulseUnit.includes('isNativeClient')&&pulseUnit.includes("presentationRole:'data-control'")&&pulseUnit.includes("variant:'fixed-titleless'"),'Pulse must publish one platform-neutral titleless data-control PRIME instead of branching for Mobile.');
const presenters=read('src/core/ui/modules/presentation/presenters.js');
assert(presenters.includes("surface?.embedded!==true")&&presenters.includes("role===roles.DATA_CONTROL")&&presenters.includes("region:'drawer'"),'Desktop and Mobile presenters must project the same embedded parameter Surface differently without plugin platform knowledge.');

console.log('v3.67.27 Mobile overflow priority PASS: bottom status controls fold DevTool → Memory → Theme → Web → SMB → AI while top overflow measures actual pixels and only collects plugin-owned commands.');
