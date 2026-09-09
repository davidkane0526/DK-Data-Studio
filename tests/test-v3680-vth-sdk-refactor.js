const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const manifest=JSON.parse(read('src/plugins/transfer-vth-lab/plugin.json'));
const plugin=read('src/plugins/transfer-vth-lab/plugin.js');
assert.deepEqual(manifest.scripts.slice(0,2),['analysis-runtime.js','plugin.js'],'Vth pure analysis runtime must load before the UI controller.');
assert(manifest.requiresCore.includes('modules'),'Vth must explicitly declare the Plugin Module Runtime it consumes.');
assert(plugin.includes("ctx.modules.require('analysis-runtime')"),'Vth UI must consume its analysis module through ctx.modules.');
for(const [label,re] of [
  ['raw querySelector',/\.querySelector(?:All)?\s*\(/],['raw addEventListener',/\.addEventListener\s*\(/],['property event handler',/\.(?:onclick|onchange|oninput)\s*=/],['raw innerHTML',/\.innerHTML\s*=/]
])assert(!re.test(plugin),`Vth normal runtime must not retain ${label}.`);
let exported=null;
const context={window:{DKDSPluginModules:{define:(owner,id,value)=>{assert.equal(owner,'com.dkds.transfer-vth-lab');assert.equal(id,'analysis-runtime');exported=value;}}}};
vm.runInNewContext(read('src/plugins/transfer-vth-lab/analysis-runtime.js'),context,{filename:'analysis-runtime.js'});
assert(exported?.analyzeCurve,'Vth analysis runtime must export analyzeCurve.');
const curve={points:[{x:0,y:1},{x:1,y:3},{x:2,y:5}]};
const result=exported.analyzeCurve(curve,{method:'linear-window',branch:'all',targetCurrent:3,lowCurrent:1,highCurrent:5,absoluteCurrent:false},null);
assert.equal(result.ok,true,'Deterministic linear Vth fixture must analyze successfully.');
assert(Math.abs(result.vth-1)<1e-12,`Expected Vth=1, got ${result.vth}.`);
assert(Math.abs(result.r2-1)<1e-12,'Perfect linear fixture must have R²=1.');

const windowManager=read('desktop/plugin-window-manager.js');
const windowRuntime=read('src/plugin-window/runtime.js');
assert(windowManager.includes('packageScripts:normalizePluginScripts(pluginDir,Array.isArray(manifest.scripts)&&manifest.scripts.length?manifest.scripts:[entry])'),'Built-in dedicated windows must receive the canonical manifest package script list.');
assert(windowRuntime.includes("for(const file of (spec.packageScripts||[spec.entry]))"),'Built-in dedicated window runtime must load package scripts before activation.');
assert(windowRuntime.includes("file===spec.entry?'entry':'package'"),'Dedicated window package loading must preserve entry identity while loading support modules first.');
assert(windowRuntime.includes('loadedTargetScripts=new Set()'),'Dedicated window runtime must deduplicate entry/package scripts instead of executing entry twice.');
console.log('v3.68.0 Vth SDK/domain split + dedicated-window package runtime regression passed.');
