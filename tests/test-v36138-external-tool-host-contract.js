'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {normalizePluginPackage}=require('../desktop/plugin-package');
const {normalizeExternalPluginWindow}=require('../desktop/plugin-window-manager');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const pkg=normalizePluginPackage({
  schema:1,
  manifest:{
    id:'com.dkds.test.external-tool',name:'External Tool Smoke',version:'1.0.0',apiVersion:'1.18.0',
    entry:'plugin.js',scripts:['plugin.js'],styles:['plugin.css'],enabled:true,pluginType:'tool',
    requiresCore:['events','status','project','workspace','data.sources','data.artifacts','data.model','ui.dom','ui.workspace','ui.scientific-plot','ui.series','ui.table','ui.activities','ui.top-workspace','ui.pages'],
    capabilities:['ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot','ui.table'],
    workspace:{role:'top',activity:'external-tool-smoke',title:'External Tool Smoke'},
    window:{activity:'external-tool-smoke',title:'External Tool Smoke',dependencies:['scientific-renderer'],prewarm:false,reuse:true,persistence:'project',artifactHydration:'live'},
    compatibility:{app:'>=3.61.38 <4.0.0',pluginApi:'^1.18.0'}
  },
  files:{
    // Deliberately stale compact runtime metadata. The package manifest above is
    // canonical and must replace it before dedicated-window contract validation.
    'plugin.js':"DKDSPlugins.define({id:'com.dkds.test.external-tool',name:'stale',version:'0.9.0',apiVersion:'1.18.0',pluginType:'extension',entry:'plugin.js'}, async ctx=>({deactivate(){}}));",
    'plugin.css':''
  }
},{allowBuiltinId:false});
const spec=normalizeExternalPluginWindow(pkg);
assert(spec,'External Tool must normalize to a dedicated window.');
assert.equal(spec.pluginId,'com.dkds.test.external-tool');
assert.equal(spec.activity,'external-tool-smoke');
assert(spec.dependencies.includes('scientific-renderer'),'External Tool must keep the renderer-neutral scientific-renderer contract.');
assert.equal(spec.packageManifest?.apiVersion,'1.18.0','Dedicated window must carry the canonical package manifest.');
assert.equal(spec.packageManifest?.pluginType,'tool','Dedicated window must not trust stale plugin.js metadata for plugin type.');
assert.equal(spec.packageManifest?.workspace?.role,'top','Dedicated window must carry canonical TOP workspace metadata.');

const kernel=read('src/generated/runtime/plugin-kernel.js');
const runtime=read('src/plugin-window/runtime.js');
const app=read('src/generated/runtime/app.js');
const main=read('desktop/main.js');
const auxiliary=read('desktop/main-modules/auxiliary-window-runtime.js');
const manager=read('desktop/plugin-window-manager.js');

assert(kernel.includes('function applyPackagedManifest('),'Plugin Kernel must own one packaged-manifest merge path.');
assert(kernel.includes('packageRuntime:Object.freeze({')&&kernel.includes('applyManifest:(id,manifest,source)=>applyPackagedManifest'),'Dedicated renderer must be able to apply the canonical package manifest before activation.');
assert(runtime.indexOf('packageRuntime?.applyManifest?.(')>runtime.indexOf('for(const file of (spec.packageScripts'), 'Dedicated renderer must apply package manifest after evaluating package scripts.');
assert(runtime.indexOf('packageRuntime?.applyManifest?.(')<runtime.indexOf("measure('plugins-activate'"),'Canonical package manifest must be applied before Plugin Contract validation/activation.');
assert(runtime.includes('if(!targetPluginState)throw new Error(`插件包没有注册目标插件：${spec.pluginId}`)'),'Dedicated renderer must reject a package that failed to register its target plugin id.');
assert(runtime.includes('插件没有注册声明的独立工作区'),'Dedicated renderer must verify the target activity contribution.');
assert(runtime.includes('插件没有注册 TOP Workspace 契约'),'Dedicated renderer must verify the TOP workspace contribution.');
assert(runtime.includes('插件工作区已激活但没有显示页面'),'A renderer cannot report ready without a visible plugin page.');
assert(runtime.includes('visiblePagePluginId')&&runtime.includes('targetPluginState'),'Dedicated diagnostics must expose plugin/page ownership, not only a ready boolean.');
assert(manager.includes('packageManifest:Object.freeze({...manifest})'),'Window manager must propagate the canonical .dkplugin manifest.');
assert(app.includes('独立工作区契约未注册'),'Tool open must preflight the main-process machine window contract instead of silently doing nothing.');
assert(auxiliary.includes('renderer reached ready without a visible page'),'Electron diagnostic smoke must validate a real visible page after ready.');
assert(auxiliary.includes('active activity mismatch'),'Electron diagnostic smoke must validate the requested activity is actually active.');
assert(auxiliary.includes('const finalOk=outcome.ok===true&&(!lifecycle.tested||lifecycle.ok===true)'),'A failed lifecycle/page validation must make the smoke test fail, not remain PASS because the renderer emitted ready once.');

console.log('v3.61.38 external Tool host contract PASS');
