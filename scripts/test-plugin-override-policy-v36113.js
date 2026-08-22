'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const policy=require(path.join(root,'plugin-override-policy'));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert(pkg.version==='3.61.15','Application version must be 3.61.15.');

const builtins=[
  {manifest:{id:'builtin.data-center',version:'1.13.2'}},
  {manifest:{id:'builtin.ter-analysis',version:'3.10.0'}}
];
const overrides=[
  {manifest:{id:'builtin.data-center',version:'1.12.0'},token:'older'},
  {manifest:{id:'builtin.data-center',version:'1.13.2'},token:'same'},
  {manifest:{id:'builtin.data-center',version:'1.13.3'},token:'newer'},
  {manifest:{id:'builtin.ter-analysis',version:'3.9.9'},token:'old-ter'}
];
const classified=policy.classify(overrides,builtins);
assert(classified.active.length===1&&classified.active[0].token==='newer','Only a strictly newer trusted built-in override may shadow bundled code.');
assert(classified.shadowed.length===3,'Older or equal built-in overrides must be retained only as shadowed diagnostics.');
assert(classified.shadowed.every(row=>row.effective===false&&row.shadowedByBuiltinVersion),'Shadowed overrides must explain which bundled version won.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.13.3'}},'1.13.2')===true,'Newer override version must be accepted.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.13.2'}},'1.13.2')===false,'Equal override version must not shadow bundled code.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.12.9'}},'1.13.2')===false,'Older override version must not shadow bundled code.');

const main=fs.readFileSync(path.join(root,'main.js'),'utf8');
assert(main.includes('PluginOverridePolicy.classify')&&main.includes('classifyInstalledPluginOverrides().active'),'Main process must pass only effective overrides to plugin/window/catalog resolution.');
assert(main.includes("reason:'not-newer-than-bundled'")&&main.includes("reason:'not-newer-than-installed-override'"),'LAN updater must reject stale/downgrade built-in override packages.');
assert(main.includes('shadowed:classified.shadowed'),'Plugin override IPC must keep stale packages diagnosable without executing them.');
assert((pkg.build?.files||[]).includes('plugin-override-policy.js'),'Packaged app must include the override precedence policy module.');
console.log('v3.61.14 built-in override precedence checks passed.');
