'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const {execFileSync,spawnSync}=require('child_process');
const {normalizePluginPackage}=require('../plugin-package');
const {normalizeExternalPluginWindow}=require('../plugin-window-manager');
function assert(condition,message){if(!condition)throw new Error(message);}
const root=path.resolve(__dirname,'..');
const cli=path.join(root,'sdk','tools','dkds-plugin.js');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

for(const rel of ['sdk/templates/top-workspace-plugin','examples/transfer-vth-lab']){
  execFileSync(process.execPath,[cli,'validate',path.join(root,rel)],{stdio:'pipe'});
}

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-top-sdk-'));
try{
  const output=path.join(tmp,'vth.dkplugin');
  execFileSync(process.execPath,[cli,'package',path.join(root,'examples','transfer-vth-lab'),output],{stdio:'pipe'});
  const pkg=normalizePluginPackage(JSON.parse(fs.readFileSync(output,'utf8')));
  const windowSpec=normalizeExternalPluginWindow(pkg);
  assert(pkg.manifest.workspace?.role==='top','Vth package must declare workspace.role=top.');
  assert(pkg.manifest.workspace.activity==='transfer-vth-lab','Vth TOP activity must stay stable.');
  assert(windowSpec?.activity==='transfer-vth-lab'&&windowSpec?.mode==='dedicated','Vth external package must normalize to a dedicated TOP window.');
  assert(windowSpec?.reuse===true&&windowSpec?.persistence==='project','Vth TOP window lifecycle must be reusable and project-persistent.');
  assert(windowSpec?.artifactHydration==='live','Vth TOP machine window contract must preserve live Artifact hydration.');
  assert(windowSpec?.dependencies?.includes('plugin-kernel')&&windowSpec?.dependencies?.includes('platform'),'External TOP window must receive baseline Core window dependencies.');

  const css=read('examples/transfer-vth-lab/plugin.css');
  const js=read('examples/transfer-vth-lab/plugin.js');
  assert(js.includes("yScaleType:(state.get().parameters.logY")&&!js.includes('Math.log10(Math.max(Math.abs(raw)'),'Vth logarithmic display must use Core ScientificPlot scale rather than pre-transforming plotted current.');
  assert(js.includes("workspace:{role:'top',activity:'transfer-vth-lab'")&&js.includes("openMode:'window'")&&js.includes("artifactHydration:'live'")&&js.includes('ctx.ui.topWorkspace.register('),'Vth runtime must implement the complete TOP contract.');
  assert(js.includes("primaryScroll:'contained'")&&js.includes("scroll:'contained'"),'Vth must use contained PluginWorkspace primary scrolling for viewport-owned charts.');
  assert(/\.dkds-vth-workbench\{[^}]*height:100%[^}]*min-height:0/s.test(css),'Vth workbench root must be height-bounded with min-height:0.');
  assert(/\.dkds-vth-main\{[^}]*height:100%[^}]*min-height:0[^}]*grid-template-rows:auto minmax\(0,1fr\)/s.test(css),'Vth main chart layout must use bounded minmax(0,1fr).');
  assert(!/minmax\(\s*\d+(?:\.\d+)?px\s*,\s*1fr\s*\)/i.test(css),'Vth must not restore the intrinsic-height positive-minimum 1fr pattern that caused self-growing charts.');

  const invalidDir=path.join(tmp,'invalid-top');
  fs.cpSync(path.join(root,'sdk','templates','top-workspace-plugin'),invalidDir,{recursive:true});
  const invalidManifest=JSON.parse(fs.readFileSync(path.join(invalidDir,'plugin.json'),'utf8'));
  invalidManifest.window.activity='different-activity';
  fs.writeFileSync(path.join(invalidDir,'plugin.json'),JSON.stringify(invalidManifest,null,2)+'\n');
  const invalid=spawnSync(process.execPath,[cli,'validate',invalidDir],{encoding:'utf8'});
  assert(invalid.status!==0,'SDK validator must reject TOP workspace/window activity mismatch.');
  assert(`${invalid.stdout}\n${invalid.stderr}`.includes('must match window.activity'),'TOP mismatch diagnostic must explain the activity contract.');

  const noWindowDir=path.join(tmp,'invalid-no-window');
  fs.cpSync(path.join(root,'sdk','templates','top-workspace-plugin'),noWindowDir,{recursive:true});
  const noWindow=JSON.parse(fs.readFileSync(path.join(noWindowDir,'plugin.json'),'utf8'));
  delete noWindow.window;
  fs.writeFileSync(path.join(noWindowDir,'plugin.json'),JSON.stringify(noWindow,null,2)+'\n');
  const missing=spawnSync(process.execPath,[cli,'validate',noWindowDir],{encoding:'utf8'});
  assert(missing.status!==0&&`${missing.stdout}\n${missing.stderr}`.includes('dedicated window contract'),'SDK validator must reject a TOP workbench without manifest.window.');
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }

const types=read('sdk/plugin-api.d.ts');
assert(types.includes("primaryScroll?:'auto'|'contained'")&&types.includes('DKDSPluginWorkspaceRuntime')&&types.includes('DKDSTopWorkspaceRuntime'),'SDK declarations must expose bounded PluginWorkspace and typed TOP Workspace APIs.');
assert(types.includes('list(options?:{consumer?:string;pluginId?:string}):DKDSDataSourceDescriptor[]'),'SDK data.sources.list() must preserve its synchronous read contract.');
const sdkReadme=read('sdk/README.md');
assert(sdkReadme.includes('A **true TOP workbench** must keep four contracts aligned')&&sdkReadme.includes('minmax(0, 1fr)'),'SDK guide must document true TOP and bounded scientific layout contracts.');
assert(read('sdk/TOP_WORKSPACES.md').includes('Workbench is not TOP')&&read('sdk/TOP_WORKSPACES.md').includes('bounded height chain'),'SDK must ship a dedicated TOP workspace authoring guide.');
console.log('v3.61.18 external TOP workspace + bounded scientific layout + SDK authoring contract checks passed.');
