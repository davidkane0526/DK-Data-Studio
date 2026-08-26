const fs=require('fs');
const os=require('os');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert(Number(json('package.json').version.split('.').at(-1))>=32,'SDK/Plugin Host hardening requires v3.61.32+');
const contract=json('sdk/contract.json');
assert(Number(contract.pluginApiVersion.split('.')[1])>=16,'Current SDK must preserve Plugin API 1.16 host guarantees');
assert(/^3\.61\.(?:3[2-9]|[4-9]\d|\d{3,})$/.test(contract.minimumAppVersion),'Current SDK minimum app must include the hardened Plugin Host baseline');

const components=read('src/core/ui/component-runtime.js');
assert(components.includes('isEventTarget')&&components.includes("value===window||value===document"),'scoped DOM runtime must support lifecycle-safe window/document EventTargets');
const status=read('src/plugins/status-monitor/plugin.js');
assert(status.includes('ctx.ui.dom.create')&&status.includes("ctx.ui.dom.on(window,'dkds:theme-changed'")&&status.includes('ctx.ui.dom.timeout'),'Status Monitor must use scoped DOM/scheduler APIs');
assert(!/\bdocument\./.test(status)&&!/(^|[^.])\b(?:setTimeout|clearTimeout|setInterval|clearInterval)\s*\(/m.test(status),'Status Monitor must have zero raw DOM/scheduler boundary exceptions');

const infra=read('src/generated/runtime/ui-infrastructure.js');
for(const token of ['prepareLayoutGeometry()','layoutDiagnostics()','dkds-scientific-layout-fallback','hardMinHeight','applyLayoutSafety()','layoutDiagnostics()','DKDS PluginWorkspace layout recovery','dkds-layout-overflow-fallback',"setProperty('overflow-y','auto')","spec.primaryScroll||'safe'"]){
  assert(infra.includes(token),`Plugin Host/ScientificPlot hardening missing ${token}`);
}
assert(!infra.includes('if(width<minWidth||height<minHeight){this.awaitingLayout=true;return false;}'),'ScientificCurveSurface must not silently blank solely because preferred min geometry was missed');
const css=readCoreCss(root);
assert(css.includes('[data-primary-scroll="safe"] .dkds-analysis-primary-host')&&css.includes('overflow:auto'),'safe PluginWorkspace mode must provide host-owned scrolling');
assert(css.includes('.dkds-scientific-surface-host.dkds-scientific-layout-fallback'),'ScientificCurveSurface must have a host-owned minimum-height recovery style');

const {inspectWorkspaceStyles}=require('../sdk/layout-contract');
const audit=inspectWorkspaceStyles({apiVersion:'1.16.0',pluginType:'tool',workspace:{role:'top'},styles:[{name:'bad.css',content:'.pulse-shell{overflow:hidden}.pulse-main{display:grid;grid-template-rows:minmax(250px,1fr)}'}]});
assert(audit.errors.some(x=>x.includes('overflow:hidden')),'SDK 1.16 layout lint must reject clipped semantic UI');
assert(audit.errors.some(x=>x.includes('positive-pixel')),'SDK 1.16 layout lint must reject positive-pixel minmax(...,1fr) workspace rows');
const ordinaryGrid=inspectWorkspaceStyles({apiVersion:'1.16.0',pluginType:'tool',workspace:{role:'top'},styles:[{name:'ordinary.css',content:'.settings-options{display:grid;grid-template-rows:minmax(120px,1fr)}'}]});
assert.equal(ordinaryGrid.errors.length,0,'ordinary internal plugin grids must not be rejected solely for positive-pixel minmax rows');
assert(ordinaryGrid.warnings.some(x=>x.includes('positive-pixel')),'ordinary positive-pixel minmax rows should remain a development warning');
assert.equal(inspectWorkspaceStyles({apiVersion:'1.16.0',pluginType:'tool',workspace:{role:'top'},styles:[{name:'minimum.css',content:'.tool-main{min-height:100vh}.tool-panel{min-height:420px}'}]}).errors.length,0,'min-height must not be misclassified as host viewport ownership or a fixed-height violation');
assert.equal(inspectWorkspaceStyles({apiVersion:'1.16.0',pluginType:'tool',workspace:{role:'top'},styles:[{name:'text.css',content:'.tool-card-head>span{overflow:hidden;text-overflow:ellipsis}'}]}).errors.length,0,'layout lint must not reject harmless text truncation merely because an ancestor class contains card/panel semantics');
assert.equal(inspectWorkspaceStyles({apiVersion:'1.15.0',pluginType:'tool',workspace:{role:'top'},styles:[{name:'legacy.css',content:'.pulse-card{overflow:hidden}'}]}).errors.length,0,'legacy API packages must remain load-compatible');

const {normalizePluginPackage}=require('../desktop/plugin-package');
const manifest={id:'com.example.layout-guard',name:'Layout Guard',version:'1.0.0',apiVersion:'1.16.0',pluginType:'tool',entry:'plugin.js',scripts:['plugin.js'],styles:['plugin.css'],requiresCore:['workspace','ui.activities','ui.top-workspace'],workspace:{role:'top',activity:'layout-guard'},window:{activity:'layout-guard',reuse:true}};
const pkg={schema:1,manifest,files:{'plugin.js':'DKDSPlugins.define('+JSON.stringify(manifest)+',async()=>({}));','plugin.css':'.tool-shell{overflow:hidden}'}};
assert.throws(()=>normalizePluginPackage(pkg,{allowBuiltinId:false}),/Plugin layout contract failed/,'application install path must enforce the same API 1.16 layout contract even when standalone validation was skipped');
normalizePluginPackage({...pkg,manifest:{...manifest,apiVersion:'1.15.0'},files:{...pkg.files,'plugin.js':pkg.files['plugin.js'].replace('1.16.0','1.15.0')}},{allowBuiltinId:false});

for(const template of ['sdk/templates/tool-plugin','sdk/templates/top-workspace-plugin']){
  cp.execFileSync(process.execPath,[path.join(root,'sdk/tools/dkds-plugin.js'),'validate',path.join(root,template)],{stdio:'pipe'});
}

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-sdk-116-'));
try{
  const badManifest={...manifest,id:'com.example.bad-layout'};
  fs.writeFileSync(path.join(temp,'plugin.json'),JSON.stringify(badManifest,null,2));
  fs.writeFileSync(path.join(temp,'plugin.js'),`DKDSPlugins.define(${JSON.stringify(badManifest)},async ctx=>{ctx.ui.activities.add({id:'layout-guard',openMode:'window'});ctx.ui.topWorkspace.register({id:'layout-guard',activity:'layout-guard',layout:{root:{selector:'#x'},primary:{id:'main'}}});return {};});`);
  fs.writeFileSync(path.join(temp,'plugin.css'),'.plugin-main{overflow:hidden;display:grid;grid-template-rows:minmax(300px,1fr)}');
  let failed=false;try{cp.execFileSync(process.execPath,[path.join(root,'sdk/tools/dkds-plugin.js'),'validate',temp],{stdio:'pipe'});}catch(err){failed=true;const out=String(err.stderr||'')+String(err.stdout||'');assert(/clips semantic UI|positive-pixel/.test(out),'validator must explain unsafe layout, not fail opaquely');}
  assert(failed,'standalone SDK validator must fail an unsafe API 1.16 workspace before packaging');
}finally{fs.rmSync(temp,{recursive:true,force:true});}

const api=read('sdk/plugin-api.d.ts');
assert(api.includes("'1.15.0'|'1.16.0'"),'editor manifest declaration must preserve Plugin API 1.15 package compatibility');
for(const token of ["readonly apiVersion:'1.17.0'",'DKDSDomRuntime','DKDSStatusBarRuntime',"primaryScroll?:'safe'|'auto'|'contained'",'hardMinHeight?:number','layoutDiagnostics()'])assert(api.includes(token),`editor SDK declaration missing ${token}`);
console.log('v3.61.29 SDK / Plugin Host hardening regression OK');
