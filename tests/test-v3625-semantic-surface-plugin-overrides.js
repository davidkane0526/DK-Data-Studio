'use strict';
const fs=require('fs');const path=require('path');const os=require('os');const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkgJson=JSON.parse(read('package.json'));
const {createPluginPackageRuntime}=require(path.join(root,'desktop','main-modules','plugin-package-runtime'));
const policy=require(path.join(root,'desktop','plugin-override-policy'));

// Theme semantic surface ownership: role -> base token is Core-owned, while a
// Workbench sidebar's direct composition child cannot silently repaint the base.
const material=read('src/core/theme/material-renderer.js');
assert(material.includes("sidebar:{token:'appearance.roles.sidebar.surface',cssVar:'--dkui-role-sidebar-surface',fallbackToken:'surfaceSidebar',fallbackVar:'--dkui-surface-sidebar'}"),'Sidebar material role must resolve role-specific appearance first and preserve surfaceSidebar as the Core fallback token.');
assert(material.includes('baseToken')&&material.includes('occludingChild'),'Theme Material inspect/debug must expose base-token and occluding-child diagnostics.');
const debug=read('src/core/theme/debug-runtime.js');
assert(debug.includes('base token:')&&debug.includes('occluding child:'),'Theme Debug must show semantic base-token and occluding-child ownership.');
const analysis=read('src/core/ui/modules/workbench/analysis.js');
assert(analysis.includes('normalizeSidebarCompositionNode')&&analysis.includes("dkdsMaterialSurface==='core'"),'AnalysisWorkbench must normalize direct sidebar composition children unless Core has explicitly promoted them to an independent MaterialSurface.');
assert(analysis.includes("'dkds-surface-muted'")&&analysis.includes("delete node.dataset.dkdsMaterialRole"),'Sidebar normalization must remove legacy direct-child surface paint and stale material assignment.');
const resonance=read('src/plugins/resonance-workbench/view-components.js');
assert(!resonance.includes('respar-left-panel dkds-surface-muted'),'Resonance left content must not repaint Core sidebar material with surfaceSoft.');
const shell=read('src/styles/presentation/shell.css'),chrome=read('src/styles/presentation/plugin-chrome.css');
assert(!/body\.dkds-modern-ui \.dkds-analysis-left\s*\{[^}]*background\s*:/s.test(shell),'Presentation CSS must not repaint Core AnalysisWorkbench sidebar base.');
assert(!/body\.dkds-modern-ui \.dkds-plugin-canvas-left,[^{]+\{[^}]*background\s*:/s.test(chrome),'Presentation CSS must not repaint PluginCanvas sidebar base.');
assert(!/body\.dkds-modern-ui \.plugin-sidebar-section\s*\{[^}]*background\s*:/s.test(chrome),'Generic sidebar sections must remain composition children unless explicitly promoted to a MaterialSurface.');

// Every bundled plugin must survive the exact same package normalization used
// for an exported/external .dkplugin package. This closes the old dual path.
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-v3625-'));
try{
  const userData=path.join(tempRoot,'user-data');
  const fakeApp={getPath:key=>key==='userData'?userData:tempRoot,getAppPath:()=>root,getVersion:()=>pkgJson.version};
  const runtime=createPluginPackageRuntime({app:fakeApp,BrowserWindow:{getAllWindows:()=>[]}});
  const manifests=runtime.readBuiltinPluginManifests();
  assert.strictEqual(manifests.length,16,'Expected all first-party manifests in bundled package audit.');
  for(const row of manifests)assert(runtime.readBuiltinPluginPackage(row.manifest.id),`Bundled plugin must export/package cleanly under Plugin API 1.18: ${row.manifest.id}`);

  // Stable-id built-ins are updatable regardless of whether their id starts
  // with builtin.; the bundled copy is an immutable baseline, not a special API.
  const pulse=runtime.readBuiltinPluginPackage('com.dkds.tools.pulse-sampler');
  const bundledVersion=pulse.manifest.version;
  const versionParts=bundledVersion.split('.').map(Number);
  const overrideVersion=`${versionParts[0]}.${versionParts[1]}.${versionParts[2]+1}`;
  pulse.manifest.version=overrideVersion;
  pulse.manifest.compatibility={...(pulse.manifest.compatibility||{}),app:'>=3.62.0 <4.0.0',pluginApi:'^1.18.0'};
  const plan=runtime.pluginInstallPlan(pulse);
  assert.strictEqual(plan.installationKind,'override');
  assert.strictEqual(plan.requiresRestart,true);
  assert.strictEqual(plan.bundledVersion,bundledVersion);
  assert.strictEqual(plan.previousVersion,bundledVersion);
  assert(plan.target.includes(`${path.sep}plugin-overrides${path.sep}`),'Bundled updates must be written to plugin-overrides, never the application tree or external plugin store.');
  const installed=runtime.commitPluginInstall(plan,{archiveReason:'test-override'});
  assert.strictEqual(installed.manifest.version,overrideVersion);
  assert(runtime.readInstalledPluginOverrides().packages.some(row=>row.manifest.id==='com.dkds.tools.pulse-sampler'&&row.manifest.version===overrideVersion),'Non-builtin-prefix first-party override must be readable.');
  assert(runtime.installedPluginOverridePackages().some(row=>row.manifest.id==='com.dkds.tools.pulse-sampler'),'Strictly newer first-party override must become effective.');
  assert.strictEqual(runtime.currentPluginPackage('com.dkds.tools.pulse-sampler').manifest.version,overrideVersion,'Current package resolution must prefer the active override.');
  assert.throws(()=>runtime.pluginInstallPlan(pulse),err=>err?.code==='PLUGIN_VERSION_NOT_NEWER','Reinstalling the same bundled override version must be rejected as a non-update.');
  const restore=runtime.restoreInstalledPackage('com.dkds.tools.pulse-sampler',null);
  assert.strictEqual(restore.requiresRestart,true);
  assert.strictEqual(runtime.currentPluginPackage('com.dkds.tools.pulse-sampler').manifest.version,bundledVersion,'Removing the override must reveal the bundled baseline again.');

  const nonPrefix=policy.classify([{manifest:{id:'com.dkds.tools.pulse-sampler',version:overrideVersion}}],[{manifest:{id:'com.dkds.tools.pulse-sampler',version:bundledVersion}}]);
  assert.strictEqual(nonPrefix.active.length,1,'Override precedence must be based on bundled membership/version, not the builtin.* prefix.');
  assert(policy.isNewerVersion(overrideVersion,bundledVersion),'Generic version comparison must support managed bundled updates.');
}catch(err){throw err;}finally{fs.rmSync(tempRoot,{recursive:true,force:true});}

const main=read('desktop/main.js'),packageRuntime=read('desktop/main-modules/plugin-package-runtime.js'),kernel=read('src/core/plugins/kernel/modules/package-runtime.js'),manager=read('src/core/plugins/manager-ui.js'),validator=read('scripts/validate-plugins.js');
assert(!main.includes('PLUGIN_BUILTIN_CONFLICT'),'Manual installer must not reject all same-id bundled plugin packages.');
assert(main.includes('pluginInstallPlan(')&&main.includes('installationKind'),'Desktop install IPC must route packages through managed install planning.');
assert(packageRuntime.includes('builtinIds.has(pkg.manifest.id)')&&!packageRuntime.includes("!pkg.manifest.id.startsWith('builtin.')"),'Override eligibility must use actual bundled membership, not an id prefix.');
assert(kernel.includes('stagedOverrideState')&&kernel.includes('重启 DK Data Studio 后启用'),'Bundled updates must remain deterministic and restart-activated instead of hot-replacing running built-in code.');
assert(manager.includes('本地更新 · 内置基线')&&manager.includes('恢复内置版本'),'Plugin Manager must expose override provenance and bundled restore.');
assert(validator.includes('bundled export/package contract failed')&&validator.includes('normalizePluginPackage'),'plugin:validate must enforce external-package parity for all bundled plugins.');
console.log('v3.62.5 semantic surface + managed bundled plugin override contract PASS');
