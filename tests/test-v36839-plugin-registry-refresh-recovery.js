'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const app=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
const versionTuple=value=>String(value||'').split('.').map(Number);
const atLeast=(value,min)=>{const a=versionTuple(value),b=versionTuple(min);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
assert(atLeast(app.version,'3.68.39'),'v3.68.39 registry recovery capability must remain present in later patches.');
assert.strictEqual(mobile.version,app.version);assert.strictEqual(expo.version,app.version);assert(Number(expo.android.versionCode)>=73);

const runtime=read('src/core/plugins/kernel/modules/package-runtime.js');
assert(runtime.includes('async function completeDeferredPlugins({includeExternal=true,reason=\'runtime\'}={})'),'Plugin Kernel must expose one idempotent completion path for deferred current-contract plugins.');
assert(runtime.includes("setTimeout(run,320)")&&runtime.includes("setTimeout(run,0)")&&runtime.includes("idle(run,{timeout:180})"),'Post-first-paint completion must have an independent macrotask/watchdog and must not rely only on requestIdleCallback.');
assert(runtime.includes("scheduleAfterFirstPaint(()=>completeDeferredPlugins({includeExternal:true,reason:'post-first-paint'}))"),'Normal staged startup must converge through the same deterministic completion path.');
assert(runtime.includes("ensureReady:options=>completeDeferredPlugins(options||{})")&&runtime.includes("refresh:options=>completeDeferredPlugins({includeExternal:true,reason:'plugin-manager-refresh'"),'Kernel and Plugin Manager must share the same completion operation rather than duplicating lifecycle logic.');
assert(runtime.includes('generatedCatalogCount:')&&runtime.includes('generatedCatalogVersion:')&&runtime.includes('generatedCatalogDigest:')&&runtime.includes('startup:startupStateSnapshot()'),'Startup diagnostics must expose generated catalog identity and convergence state so partial/stale registries are observable in Automation reports.');

const automation=read('src/diagnostics/automation-test-runtime.js');
assert(automation.includes("const VERSION='1.33.0'"),'Automation convergence must remain within the current formal Automation Runner 1.33 contract.');
assert(automation.includes("'plugins.startup-convergence'")&&automation.includes("ensureReady?.({includeExternal:true,reason:'automation-preflight'})"),'Automation must explicitly converge the current plugin catalog before import/algorithm/TOP diagnostics.');
assert(automation.includes('generatedCatalogVersion')&&automation.includes('builtin.flexible-import')&&automation.includes('builtin.resonance-detector-robust'),'Automation convergence must reject stale generated identity and require the providers that failed in the Windows 3.68.38 report.');

const manager=read('src/core/plugins/manager-ui.js');
assert(manager.includes('async function refreshManager({silent=false}={})'),'Plugin Manager must own an asynchronous lifecycle refresh.');
assert(manager.includes("await (window.DKDSPlugins?.manager?.refresh?.()||window.DKDSPlugins?.ensureReady?.("),'Refresh must complete the staged Plugin Kernel registry before repainting.');
assert(manager.includes("plugin-manager-summary-refresh")&&manager.includes("refresh.onclick=()=>void refreshManager()"),'Summary-card refresh action must not be a paint-only renderList handler.');
assert(manager.includes('void refreshManager({silent:true})'),'Opening Plugin Manager must opportunistically complete a partial first-paint catalog.');

const generator=require('../scripts/generate-plugin-index.js');
const built=generator.buildPluginIndexSource();
assert.strictEqual(built.meta.appVersion,app.version);assert.strictEqual(built.meta.count,17);assert.strictEqual(built.plugins.length,17);
for(const id of ['builtin.flexible-import','builtin.resonance-detector-robust','builtin.resonance-workbench','builtin.ter-analysis','com.dkds.theme.aurora-pop','com.dkds.theme.liquid-glass'])
  assert(built.plugins.some(row=>row.id===id),`Current generated catalog must contain ${id}.`);
assert(built.source.includes('DKDS_BUILTIN_PLUGIN_INDEX_META')&&built.meta.catalogDigest.length===64,'Generated plugin catalog must carry current app identity plus a content digest.');
for(const row of built.plugins)assert.strictEqual(Object.prototype.hasOwnProperty.call(row.manifest,'source'),false,`${row.id} manifest must stay free of host-only source provenance.`);

const prepare=read('scripts/prepare-dev-start.js');
assert(prepare.includes("buildCompositionSource")&&prepare.includes("buildPluginIndexSource")&&prepare.includes("fileMatches"),'Dev-start must validate generated output against the current declared source graph, not merely test file existence.');
assert(prepare.includes("const runtimeCurrent=runtimeCompositions.every")&&prepare.includes("if(!runtimeCurrent){run('generate-runtime-compositions.js')")&&prepare.includes("if(!fileMatches('src/generated/plugin-index.js',pluginIndex.source))"),'Runtime and plugin catalog must never use existence-only reuse; SDK/brand assets may remain missing-only because they cannot alter the live plugin registry.');

// Reproduce the exact overlay-update hazard: a generated plugin index exists,
// but its contents belong to another source snapshot. prestart must self-heal.
const generatedPath=path.join(root,'src/generated/plugin-index.js');
const generatedKernelPath=path.join(root,'src/generated/runtime/plugin-kernel.js');
fs.mkdirSync(path.dirname(generatedPath),{recursive:true});
fs.mkdirSync(path.dirname(generatedKernelPath),{recursive:true});
fs.writeFileSync(generatedPath,'// stale overlay artifact\nwindow.DKDS_BUILTIN_PLUGINS=[];\n','utf8');
fs.writeFileSync(generatedKernelPath,'// stale overlay plugin kernel\n','utf8');
const result=cp.spawnSync(process.execPath,[path.join(root,'scripts/prepare-dev-start.js')],{cwd:root,encoding:'utf8'});
assert.strictEqual(result.status,0,result.stderr||result.stdout);
assert.strictEqual(read('src/generated/plugin-index.js'),generator.buildPluginIndexSource().source,'Dev-start must replace an existing stale/partial plugin catalog with the current 17-plugin catalog.');

const {buildCompositionSource}=require('../scripts/generate-runtime-compositions.js');
for(const rel of ['src/core/ui/composition','src/core/plugins/kernel','src/app']){
  const composition=buildCompositionSource(rel);
  assert(composition.source.startsWith(`// AUTO-GENERATED by scripts/generate-runtime-compositions.js. Do not edit.\n// DKDS-GENERATED app=${app.version} source-sha256=`),`${composition.output} must carry deterministic source identity.`);
  assert.strictEqual(read(composition.output),composition.source,`${composition.output} must match the current source graph after prestart recovery.`);
}

console.log('v3.68.39 plugin registry refresh + stale generated artifact recovery PASS.');
