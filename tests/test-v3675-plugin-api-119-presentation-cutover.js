'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const sdk=json('sdk/contract.json');
const sdkSchema=json('sdk/plugin-manifest.schema.json');
const docsSchema=json('docs/plugin-manifest.schema.json');
const dts=read('sdk/plugin-api.d.ts');
const contractSource=read('src/core/plugins/contract-runtime.js');
const lifecycle=read('src/core/plugins/kernel/modules/lifecycle.js');
const topRuntime=read('src/core/plugins/kernel/modules/workspace/top.js');
const analysis=read('src/core/ui/modules/workbench/analysis.js');
const model=read('src/core/ui/modules/presentation/model.js');
const mobilePackage=read('src/core/host/mobile-plugin-package.js');
const webBridge=read('src/web-bridge.js');
const intent=read('src/core/ui/modules/interaction/intent.js');
const adapters=read('src/core/ui/modules/interaction/adapters.js');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
const app=read('mobile/App.tsx');
const shell=read('mobile/src/Shell.tsx');
const mobileCss=read('src/mobile.css');
const sdkTool=read('sdk/tools/dkds-plugin.js');

assert.strictEqual(pkg.version,'3.67.5','Plugin API 1.19 Presentation Cutover must ship as v3.67.5.');
assert.strictEqual(sdk.sdkVersion,'1.23.0');
assert.strictEqual(sdk.pluginApiVersion,'1.19.0');
assert.strictEqual(sdk.minimumAppVersion,'3.67.5');
assert.strictEqual(sdkSchema.properties.apiVersion.const,'1.19.0');
assert.strictEqual(docsSchema.properties.apiVersion.const,'1.19.0');

// Runtime/package compatibility is exact, not "any 1.x".
assert(lifecycle.includes("String(manifest.apiVersion||'') !== '1.19.0'"),'Core lifecycle must reject non-1.19 plugin definitions before activation.');
assert(mobilePackage.includes("apiVersion!=='1.19.0'")&&mobilePackage.includes('this host requires 1.19.0'),'Mobile package normalizer must require Plugin API 1.19.0 exactly.');
assert(webBridge.includes("const compatible=required==='1.19.0'")&&!webBridge.includes("startsWith('1.')"),'Mobile compatibility diagnostics must agree with the exact Runtime API boundary.');
const sandbox={window:{}};sandbox.window.window=sandbox.window;vm.createContext(sandbox);vm.runInContext(contractSource,sandbox,{filename:'plugin-contract-runtime.js'});
const contract=sandbox.window.DKDSPluginContract;
assert.strictEqual(contract.API_VERSION,'1.19.0');
assert(contract.validateManifest({id:'test.current',pluginType:'extension',apiVersion:'1.19.0',requiresCore:['io']}).ok,'Plugin API 1.19 manifest must validate.');
assert(!contract.validateManifest({id:'test.old',pluginType:'extension',apiVersion:'1.18.0',requiresCore:['io']}).ok,'Plugin API 1.18 manifest must fail explicitly after cutover.');

// PRIMARY is main-only in public types and runtime.
const primaryType=dts.match(/export interface DKDSPluginWorkspacePrimarySpec \{[^}]+\}/)?.[0]||'';
const mountType=dts.match(/export interface DKDSPluginWorkspaceMountContext \{[^}]+\}/)?.[0]||'';
assert(primaryType&&!/leftNode|leftHtml/.test(primaryType),'Plugin API 1.19 PRIMARY type must not expose leftNode/leftHtml.');
assert(mountType&&!/\bleft\s*:|\bslots\s*:/.test(mountType),'PRIMARY mount context must not expose Desktop layout slots.');
assert(analysis.includes('PRIMARY no longer accepts leftNode/leftHtml')&&analysis.includes('const ctx={workbench:this,scope:this.scope,main,root:this.shell}'),'Workbench runtime must enforce the main-only PRIMARY boundary.');
assert(sdkTool.includes('Plugin API 1.19 removed PRIMARY leftNode/leftHtml'),'Standalone SDK validator must reject legacy PRIMARY composition.');

// TOP presentation semantics are explicit and platform-neutral.
assert(dts.includes('presentationRole:DKDSPresentationSurfaceRole'),'TOP SDK types must require presentationRole.');
assert(topRuntime.includes('must declare a valid presentationRole for Plugin API 1.19'),'TOP runtime must reject undeclared/invalid presentation roles.');
assert(model.includes('undeclared-role:')&&model.includes('invalid:Object.freeze(incomplete)'),'Presentation audit must report malformed contracts as invalid/incomplete.');
assert(!model.includes('presentationLegacy')&&!read('src/core/ui/modules/workbench/plugin.js').includes('primary-left-composition'),'Core Presentation Model must not carry the retired legacy-composition channel.');

// The old Mobile PRIMARY-left compatibility implementation is gone end-to-end.
assert(!fs.existsSync(path.join(root,'src/styles/platform/native-legacy-workspace.css')),'Legacy mobile workspace bridge stylesheet must be deleted.');
assert(!mobileCss.includes('native-legacy-workspace.css'),'Mobile stylesheet entrypoint must not import the retired bridge.');
for(const [name,source] of [['intent',intent],['adapters',adapters],['mobileHost',mobileHost],['App',app],['Shell',shell]]){
  assert(!source.includes('workspace.panel.toggle'),`${name} must not retain workspace.panel.toggle.`);
  assert(!/hostRequest\(['\"]panel['\"]|fromHostRequest\(['\"]panel['\"]|method\s*===\s*['\"]panel['\"]/.test(source),`${name} must not retain the legacy Mobile panel request.`);
}
assert(!/dkds-mobile-panel-edge|dkdsMobileWorkspaceMode|dkds\.mobile\.left-panel-width/.test(adapters+app+shell),'Mobile interaction/shell must not retain the legacy PRIMARY-left drawer/resizer implementation.');
const sdkTypes=read('sdk/plugin-api.d.ts');
const detectorExample=read('examples/external-plugins/resonance-detector-template/plugin.js');
const detectorManifest=JSON.parse(read('examples/external-plugins/resonance-detector-template/plugin.json'));
assert(!sdkTypes.includes('detectors:{register'), 'Plugin API 1.19 types must not expose the retired ctx.analysis.detectors facade.');
assert(!detectorExample.includes('ctx.analysis.detectors') && detectorExample.includes('ctx.analysis.algorithms.register'), 'External detector template must use the versioned Scientific Algorithm registry.');
assert(detectorManifest.apiVersion==='1.19.0' && detectorManifest.pluginType==='algorithm' && detectorManifest.requiresCore.includes('analysis.algorithms') && !detectorManifest.requiresCore.includes('analysis.detectors'), 'External detector template manifest must target the Plugin API 1.19 algorithm contract.');

// First-party packages all target the cutover and cannot use PRIMARY-left composition.
for(const dir of fs.readdirSync(path.join(root,'src/plugins'))){
  if(dir.startsWith('_'))continue;
  const manifestPath=path.join(root,'src/plugins',dir,'plugin.json');
  if(!fs.existsSync(manifestPath))continue;
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert.strictEqual(manifest.apiVersion,'1.19.0',`${dir}: first-party manifest must target Plugin API 1.19.0.`);
  if(manifest.compatibility?.pluginApi)assert.strictEqual(manifest.compatibility.pluginApi,'^1.19.0',`${dir}: compatibility.pluginApi must target ^1.19.0.`);
  const jsFiles=fs.readdirSync(path.join(root,'src/plugins',dir)).filter(name=>name.endsWith('.js'));
  for(const file of jsFiles){
    const source=fs.readFileSync(path.join(root,'src/plugins',dir,file),'utf8');
    assert(!/\b(?:leftNode|leftHtml)\s*:/.test(source),`${dir}/${file}: first-party plugin must not use PRIMARY-left composition.`);
  }
}

assert(!/ctx\.ui\.(?:desktop|mobile)\b/.test(read('src/core/plugins/kernel/modules/plugin-api.js')+dts),'Plugin API must remain singular; no desktop/mobile facade is allowed.');
assert(read('docs/PLATFORM_PRESENTATION_ARCHITECTURE_3.67.5.md').includes('Plugin API `1.19.0` exactly'),'v3.67.5 cutover must be documented as an explicit breaking boundary.');

console.log('v3.67.5 Plugin API 1.19 Presentation Cutover PASS: exact API boundary, main-only PRIMARY, explicit semantic TOP surfaces, and zero Mobile PRIMARY-left fallback.');
