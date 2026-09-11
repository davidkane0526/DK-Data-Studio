'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(value,floor)=>{const a=String(value).split('.').map(Number),b=String(floor).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};

const app=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
assert(atLeast(app.version,'3.68.40'),'Catalog-gap reconciliation introduced in 3.68.40 must remain active in later releases.');
assert.strictEqual(mobile.version,app.version);
assert.strictEqual(expo.version,app.version);
assert(Number(expo.android.versionCode)>=74);

const runtime=read('src/core/plugins/kernel/modules/package-runtime.js');
assert(runtime.includes('function generatedBuiltinRows()')&&runtime.includes('function missingBuiltinCatalogRows()')&&runtime.includes('function uniqueBuiltinRows(rows=[])'),
  'Plugin Kernel must reconcile against the authoritative generated first-party catalog.');
assert(runtime.includes('const catalogMissing=missingBuiltinCatalogRows();')&&runtime.includes('deferredBuiltinRows.length>0||catalogMissing.length>0'),
  'ensureReady/Refresh must treat missing generated definitions as pending even after the mutable deferred queue was consumed.');
assert(runtime.includes("const rows=uniqueBuiltinRows([...deferredBuiltinRows.splice(0),...missingBuiltinCatalogRows()])"),
  'Deferred loading must union the queue with the current catalog gap instead of trusting queue state.');
assert(runtime.includes('Built-in entry completed without registering current definition')&&runtime.includes('Built-in plugin did not register current definition after entry load'),
  'A script load event must not be accepted as success unless the expected current definition was actually registered.');
assert(runtime.includes('window.electronAPI?.pluginReadBuiltinScript')&&runtime.includes('builtin-reconcile/${entry}'),
  'Windows source runtime must be able to re-execute the same current bundled entry when a local script load completes without registration.');
assert(runtime.includes('Built-in plugin catalog incomplete:')&&runtime.includes("reason:'catalog-incomplete'"),
  'Plugin Kernel must never publish an incomplete first-party catalog as ready.');
assert(runtime.includes('catalogMissing,registeredBuiltinCount:')&&runtime.includes('||catalogMissing.length>0'),
  'Plugin diagnostics must expose the exact catalog gap and keep deferredPending true while the registry is incomplete.');

const automation=read('src/diagnostics/automation-test-runtime.js');
assert(automation.includes('after.registeredBuiltinCount')&&automation.includes('after.catalogMissing')&&automation.includes('Plugin catalog still has missing built-ins after reconciliation'),
  'Automation must reject the exact 4/17 state reported by Windows 3.68.39 even when the old deferred queue is empty.');

const manager=read('src/core/plugins/manager-ui.js');
assert(manager.includes("window.DKDSPlugins?.manager?.refresh?.()")&&manager.includes('插件目录刷新失败'),
  'Plugin Manager refresh must surface reconciliation failure rather than repaint a partial list as success.');

const generator=require('../scripts/generate-plugin-index.js');
const built=generator.buildPluginIndexSource();
assert.strictEqual(built.meta.appVersion,app.version);
assert.strictEqual(built.meta.count,17);
for(const id of ['builtin.flexible-import','builtin.resonance-workbench','builtin.ter-analysis','builtin.data-center','com.dkds.theme.aurora-pop','com.dkds.theme.liquid-glass'])
  assert(built.plugins.some(row=>row.id===id),`Current catalog must still contain ${id}.`);
for(const row of built.plugins){
  assert.strictEqual(Object.prototype.hasOwnProperty.call(row.manifest,'source'),false,`${row.id} manifest must not regain host provenance.`);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(row.manifest,'compatibility'),false,`${row.id} manifest must not regain retired compatibility metadata.`);
}

console.log('v3.68.40+ authoritative catalog gap reconciliation PASS.');
