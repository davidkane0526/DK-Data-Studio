'use strict';
const fs=require('fs');
const path=require('path');
const os=require('os');
const assert=require('assert');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const {inspectPluginSource}=require(path.join(root,'sdk','source-contract'));
const {normalizePluginPackage}=require(path.join(root,'desktop','plugin-package'));
const {createPluginPackageRuntime}=require(path.join(root,'desktop','main-modules','plugin-package-runtime'));
const pkgJson=require(path.join(root,'package.json'));

const goodSource=`const wb=ctx.ui.workspaceSurface.create(root,{header:false}); ctx.ui.tables.mount('t',host,{columns:[],rows:[]});`;
const goodAudit=inspectPluginSource(goodSource,{apiVersion:'1.18.0',requiresCore:['ui.workspace','ui.table']});
assert.strictEqual(goodAudit.ok,true,'Canonical Plugin API 1.18 workspaceSurface/tables facades must pass the shared source contract.');
assert.deepStrictEqual(goodAudit.issues,[]);

const badSource=`const wb=ctx.ui.pluginWorkspace.create(root,{header:false});`;
const badAudit=inspectPluginSource(badSource,{apiVersion:'1.18.0',requiresCore:['ui.workspace']});
assert.strictEqual(badAudit.ok,false,'Non-public ctx.ui.pluginWorkspace must be rejected before activation.');
assert.strictEqual(badAudit.issues[0]?.code,'UNSUPPORTED_UI_FACADE');
assert.strictEqual(badAudit.issues[0]?.suggestion,'workspaceSurface');
assert.match(badAudit.issues[0]?.message||'',/ctx\.ui\.workspaceSurface/);
assert.match(badAudit.issues[0]?.message||'',/ui\.workspace/);
assert.match(badAudit.issues[0]?.message||'',/ui\.plugin-workspace/);
assert.strictEqual(inspectPluginSource(`const note='ctx.ui.pluginWorkspace.create(root)';`,{apiVersion:'1.18.0'}).ok,true,'Source contract must not mistake a string literal for executable API usage.');
assert.strictEqual(inspectPluginSource(`ctx.ui['pluginWorkspace'].create(root,{})`,{apiVersion:'1.18.0',requiresCore:['ui.workspace']}).issues[0]?.code,'UNSUPPORTED_UI_FACADE','Static bracket access must not bypass the public-facade contract.');
assert.strictEqual(inspectPluginSource(`const {pluginWorkspace}=ctx.ui;`,{apiVersion:'1.18.0',requiresCore:['ui.workspace']}).issues[0]?.code,'UNSUPPORTED_UI_FACADE','Static ctx.ui destructuring must not bypass the public-facade contract.');
assert.strictEqual(inspectPluginSource('ctx.ui.workspaceSurface.create(root,{})',{apiVersion:'1.18.0',requiresCore:[]}).issues[0]?.code,'MISSING_CORE_REQUIREMENT','Known public facades must still enforce their requiresCore declaration.');

const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-v3626-'));
try{
  const userData=path.join(tempRoot,'user-data');
  const fakeApp={getPath:key=>key==='userData'?userData:tempRoot,getAppPath:()=>root,getVersion:()=>pkgJson.version};
  const runtime=createPluginPackageRuntime({app:fakeApp,BrowserWindow:{getAllWindows:()=>[]}});
  const bundled=runtime.readBuiltinPluginPackage('com.dkds.tools.pulse-sampler');
  assert(bundled,'Pulse Sampler bundled package is required for exact override regression coverage.');
  assert.match(bundled.files['plugin.js'],/ctx\.ui\.workspaceSurface\.create/,'Bundled Pulse Sampler must teach the canonical workspaceSurface facade.');

  const versionParts=bundled.manifest.version.split('.').map(Number);
  const overrideVersion=`${versionParts[0]}.${versionParts[1]}.${versionParts[2]+1}`;
  const badPackage=JSON.parse(JSON.stringify(bundled));
  badPackage.manifest.version=overrideVersion;
  badPackage.files['plugin.js']=badPackage.files['plugin.js'].replace('ctx.ui.workspaceSurface.create','ctx.ui.pluginWorkspace.create');
  assert.match(badPackage.files['plugin.js'],/ctx\.ui\.pluginWorkspace\.create/,'Regression fixture must reproduce the non-public workspace facade activation bug.');
  assert.throws(
    ()=>normalizePluginPackage(badPackage,{allowBuiltinId:true}),
    err=>/Plugin source contract failed/.test(String(err?.message||''))&&/ctx\.ui\.pluginWorkspace/.test(String(err?.message||''))&&/ctx\.ui\.workspaceSurface/.test(String(err?.message||'')),
    'Application install/override normalization must reject the invalid facade before the plugin can be persisted or activated.'
  );

  // Simulate an already-installed invalid managed override from v3.62.5. On
  // startup it must be quarantined by normalization and the bundled baseline
  // must remain the effective package instead of crashing its TOP renderer.
  const overrideDir=runtime.ensurePluginOverrideDirectory();
  const overrideFile=path.join(overrideDir,'com.dkds.tools.pulse-sampler.dkplugin');
  fs.writeFileSync(overrideFile,JSON.stringify(badPackage,null,2)+'\n','utf8');
  const overrideRead=runtime.readInstalledPluginOverrides();
  assert.strictEqual(overrideRead.packages.length,0,'Invalid installed override must not enter effective override resolution.');
  assert.strictEqual(overrideRead.errors.length,1,'Invalid installed override must surface one actionable package error.');
  assert.match(overrideRead.errors[0].error,/ctx\.ui\.pluginWorkspace/);
  assert.match(overrideRead.errors[0].error,/ctx\.ui\.workspaceSurface/);
  assert.strictEqual(runtime.currentPluginPackage('com.dkds.tools.pulse-sampler').manifest.version,bundled.manifest.version,'Invalid override must fall back to the bundled baseline.');
  const correctedPackage=JSON.parse(JSON.stringify(bundled));
  correctedPackage.manifest.version=overrideVersion;
  const correctedPlan=runtime.pluginInstallPlan(correctedPackage);
  assert.strictEqual(correctedPlan.installationKind,'override','A corrected package may reuse the same nominal version as an invalid quarantined override because only valid effective versions participate in precedence.');
  assert.strictEqual(correctedPlan.previousVersion,bundled.manifest.version);

  // The standalone SDK validator and the in-app package normalizer must share
  // exactly the same public-facade rule.
  const goodFolder=path.join(tempRoot,'good-plugin');
  const badFolder=path.join(tempRoot,'bad-plugin');
  fs.cpSync(path.join(root,'src','plugins','pulse-sampler-tool'),goodFolder,{recursive:true});
  fs.cpSync(goodFolder,badFolder,{recursive:true});
  const badEntry=path.join(badFolder,'plugin.js');
  fs.writeFileSync(badEntry,fs.readFileSync(badEntry,'utf8').replace('ctx.ui.workspaceSurface.create','ctx.ui.pluginWorkspace.create'),'utf8');
  const cli=path.join(root,'sdk','tools','dkds-plugin.js');
  const goodCli=spawnSync(process.execPath,[cli,'validate',goodFolder],{cwd:root,encoding:'utf8'});
  assert.strictEqual(goodCli.status,0,`Canonical bundled/exported Plugin API package must validate.\n${goodCli.stdout}\n${goodCli.stderr}`);
  const badCli=spawnSync(process.execPath,[cli,'validate',badFolder],{cwd:root,encoding:'utf8'});
  assert.notStrictEqual(badCli.status,0,'Standalone SDK validator must reject ctx.ui.pluginWorkspace before packaging.');
  assert.match(`${badCli.stdout}\n${badCli.stderr}`,/ctx\.ui\.pluginWorkspace/);
  assert.match(`${badCli.stdout}\n${badCli.stderr}`,/ctx\.ui\.workspaceSurface/);
}finally{
  fs.rmSync(tempRoot,{recursive:true,force:true});
}

const packageJsonText=fs.readFileSync(path.join(root,'package.json'),'utf8');
assert(packageJsonText.includes('sdk/source-contract.js'),'Packaged desktop builds must include the shared SDK source contract used by plugin-package normalization.');
const desktopMain=fs.readFileSync(path.join(root,'desktop','main.js'),'utf8');
assert(desktopMain.includes("'PLUGIN_SOURCE_CONTRACT'")&&desktopMain.includes('showCompatibility'),'Source-contract install failures must not be disguised as Plugin API/app-version compatibility errors.');
const smoke=fs.readFileSync(path.join(root,'src','diagnostics','automation-smoke-cases.js'),'utf8');
assert(smoke.includes('diag.overrides?.errors')&&smoke.includes("source:row?.source||'override'"),'Automation package diagnostics must include invalid managed overrides without misclassifying them as activation failures.');
const runtimeApi=fs.readFileSync(path.join(root,'src','core','plugins','kernel','modules','plugin-api.js'),'utf8');
assert(runtimeApi.includes('workspaceSurface:')&&!runtimeApi.includes('pluginWorkspace: Object.freeze'),'Plugin API runtime must keep one canonical public workspace facade; do not add a pluginWorkspace compatibility alias.');
console.log('v3.62.6 SDK public API source contract + invalid override fallback PASS');
