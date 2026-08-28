'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const policy=require(path.join(root,'desktop','plugin-override-policy'));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));


const builtins=[
  {manifest:{id:'builtin.data-center',version:'1.13.2'}},
  {manifest:{id:'builtin.ter-analysis',version:'3.10.0'}}
];
const overrides=[
  {manifest:{id:'builtin.data-center',version:'1.12.0'},token:'older'},
  {manifest:{id:'builtin.data-center',version:'1.13.2'},token:'same'},
  {manifest:{id:'builtin.data-center',version:'1.13.6'},token:'newer'},
  {manifest:{id:'builtin.ter-analysis',version:'3.9.9'},token:'old-ter'}
];
const classified=policy.classify(overrides,builtins);
assert(classified.active.length===1&&classified.active[0].token==='newer','Only a strictly newer trusted built-in override may shadow bundled code.');
assert(classified.shadowed.length===3,'Older or equal built-in overrides must be retained only as shadowed diagnostics.');
assert(classified.shadowed.every(row=>row.effective===false&&row.shadowedByBuiltinVersion),'Shadowed overrides must explain which bundled version won.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.13.6'}},'1.13.2')===true,'Newer override version must be accepted.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.13.2'}},'1.13.2')===false,'Equal override version must not shadow bundled code.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.12.9'}},'1.13.2')===false,'Older override version must not shadow bundled code.');


const packageRuntime=fs.readFileSync(path.join(root,'src','core','plugins','kernel','modules','package-runtime.js'),'utf8');
const builtinShadowGate=packageRuntime.indexOf("packagedBuiltin?.manifest?.source==='builtin'");
const compatibilityGate=packageRuntime.indexOf('pkg?.compatibilityStatus?.compatible===false');
assert(builtinShadowGate>=0&&compatibilityGate>builtinShadowGate,'Bundled same-id plugins must shadow stale external copies before compatibility evaluation; do not restore old Plugin API compatibility as a fallback.');
for(const [rel,id] of [
  ['src/plugins/pulse-sampler-tool/plugin.json','com.dkds.tools.pulse-sampler'],
  ['src/plugins/thin-glass-theme/plugin.json','com.dkds.theme.liquid-glass'],
  ['src/plugins/transfer-vth-lab/plugin.json','com.dkds.transfer-vth-lab']
]){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
  assert(manifest.id===id,`${rel} must keep the stable plugin id used to shadow stale installed copies.`);
  assert(manifest.apiVersion==='1.18.0',`${id} must be migrated to Plugin API 1.18 instead of relying on a host compatibility bridge.`);
}

const main=fs.readFileSync(path.join(root,'desktop/main.js'),'utf8');
const packages=fs.readFileSync(path.join(root,'desktop/main-modules/plugin-package-runtime.js'),'utf8');
assert(packages.includes('PluginOverridePolicy.classify')&&packages.includes('classifyInstalledPluginOverrides().active'),'Plugin package runtime must pass only effective overrides to plugin/window/catalog resolution.');
assert(packages.includes("reason:'not-newer-than-bundled'")&&packages.includes("reason:'not-newer-than-installed-override'"),'LAN updater must reject stale/downgrade built-in override packages.');
assert(main.includes('shadowed:classified.shadowed'),'Plugin override IPC must keep stale packages diagnosable without executing them.');
assert((pkg.build?.files||[]).includes('desktop/**/*'),'Packaged app must include the override precedence policy module.');
console.log('v3.61.14 built-in override precedence checks passed.');
