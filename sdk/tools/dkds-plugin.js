#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const sdkRoot=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(sdkRoot,'contract.json'),'utf8'));
const schema=JSON.parse(fs.readFileSync(path.join(sdkRoot,contract.manifestSchema),'utf8'));
const requirements=new Set(schema.properties.requiresCore.items.enum);
const API=contract.pluginApiVersion;

function die(message){console.error(`DKDS SDK ERROR: ${message}`);process.exit(2);}
function pluginId(value){return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(String(value||''));}
function version(value){return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(value||''));}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=stable(value[key]);return out;}return value;}
function same(a,b){return JSON.stringify(stable(a))===JSON.stringify(stable(b));}
function relFile(raw){
  const value=String(raw||'').replace(/\\/g,'/').trim();
  if(!value||value.startsWith('/')||/^[A-Za-z]:\//.test(value))throw new Error(`invalid file path: ${raw}`);
  const normalized=path.posix.normalize(value);
  if(normalized==='.'||normalized==='..'||normalized.startsWith('../')||normalized.includes('/../'))throw new Error(`unsafe file path: ${raw}`);
  return normalized;
}
function readManifest(folder){
  const file=path.join(folder,'plugin.json');if(!fs.existsSync(file))throw new Error(`plugin.json not found: ${file}`);
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function referencedFiles(manifest,folder){
  const set=new Set([manifest.entry||'plugin.js',...(manifest.scripts||[]),...(manifest.styles||[]),...(manifest.window?.runtime?[manifest.window.runtime]:[]),...(manifest.window?.scripts||[])]);
  if(fs.existsSync(path.join(folder,'README.md')))set.add('README.md');
  return [...set].map(relFile);
}
const usage=[
  ['runtime',/ctx\.runtime\b/],['events',/ctx\.events\b/],['status',/ctx\.status\b/],['io',/ctx\.io\b/],['science',/ctx\.science\b/],['performance',/ctx\.performance\b/],
  ['services',/ctx\.services\b/],['modules',/ctx\.modules\b/],['capabilities',/ctx\.capabilities\b/],['state',/ctx\.state\b/],['project',/ctx\.project\b/],['workspace',/ctx\.workspace\b/],['parameters',/ctx\.parameters\b/],
  ['data.flow',/ctx\.data\.(?:flow|importers|exporters|transformers|analyzers)\b/],['data.pipeline',/ctx\.data\.pipeline\b/],['data.transforms',/ctx\.data\.transforms\b/],['data.artifacts',/ctx\.data\.artifacts\b/],['data.entities',/ctx\.data\.entities\b/],['data.types',/ctx\.data\.types\b/],['data.model',/ctx\.data\.model\b/],['data.formula',/ctx\.data\.formula\b/],
  ['workflow',/ctx\.workflow\b/],['analysis.providers',/ctx\.analysis\.providers\b/],['analysis.algorithms',/ctx\.analysis\.algorithms\b/],['analysis.detectors',/ctx\.analysis\.detectors\b/],['charts.providers',/ctx\.charts\b/],
  ['ui.dom',/ctx\.ui\.dom\b/],['ui.components',/ctx\.ui\.components\b/],['ui.workspace',/ctx\.ui\.(?:analysisWorkbench|pluginWorkspace|workspaceSurface|analysisSurface|layout|grid)\b/],['ui.scientific-plot',/ctx\.ui\.scientificPlot\b/],['ui.plot-views',/ctx\.ui\.plotViews\b/],['ui.table',/ctx\.ui\.tables\b/],['ui.settings',/ctx\.ui\.settings\b/],['ui.actions',/ctx\.ui\.actions\b/],['ui.selection',/ctx\.ui\.selection\b/],['ui.interaction',/ctx\.ui\.(?:interaction|interactions)\b/],['ui.interaction-behavior',/ctx\.ui\.interactionBehaviors\b/],['ui.context-menus',/ctx\.ui\.contextMenus\b/],['ui.activities',/ctx\.ui\.activities\b/],['ui.top-workspace',/ctx\.ui\.topWorkspace\b/],['ui.toolbar',/ctx\.ui\.toolbar\b/],['ui.status-bar',/ctx\.ui\.statusBar\b/],['ui.shortcuts',/ctx\.ui\.shortcuts\b/],['ui.pages',/ctx\.ui\.pages\b/],['ui.styles',/ctx\.ui\.styles\b/],['ui.portable',/ctx\.ui\.portable\b/],['ui.edit',/ctx\.ui\.edit\b/]
];
const forbidden=[
  [/\bctx\.host\b/,'ctx.host compatibility bridge'],[/window\.electronAPI|\belectronAPI\./,'Electron bridge'],[/window\.Plotly|\bPlotly\./,'raw Plotly'],
  [/\bdocument\.(?:getElementById|querySelector|querySelectorAll|createElement|createElementNS)/,'raw document DOM'],[/new\s+(?:ResizeObserver|MutationObserver)\s*\(/,'private observer lifecycle'],
  [/\b(?:requestAnimationFrame|cancelAnimationFrame|setInterval|clearInterval|setTimeout|clearTimeout|queueMicrotask)\s*\(/,'raw scheduler lifecycle'],[/ctx\.registry\.add\s*\(/,'generic registry bypass'],[/\bDKDSHostRecipes\./,'host recipe global']
];
function stripComments(source){return source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');}
function validate(folder){
  folder=path.resolve(folder);const m=readManifest(folder);const errors=[];
  if(!pluginId(m.id))errors.push(`invalid id: ${m.id||'(missing)'}`);if(String(m.id||'').startsWith('builtin.'))errors.push('builtin.* is reserved for application plugins');
  if(!String(m.name||'').trim())errors.push('name is required');if(!version(m.version))errors.push(`version must be semver: ${m.version||'(missing)'}`);
  const pluginTypes=new Set(schema.properties.pluginType?.enum||[]);if(!pluginTypes.has(String(m.pluginType||'')))errors.push(`invalid pluginType: ${m.pluginType||'(missing)'}`);
  if(m.apiVersion!==API)errors.push(`new SDK plugins must target apiVersion ${API}`);if(!Array.isArray(m.requiresCore))errors.push('requiresCore must be an array');
  else {const seen=new Set();for(const r of m.requiresCore){if(!requirements.has(r))errors.push(`unknown Core requirement: ${r}`);if(seen.has(r))errors.push(`duplicate Core requirement: ${r}`);seen.add(r);}}
  let files=[];try{files=referencedFiles(m,folder);}catch(e){errors.push(e.message);}
  for(const rel of files){const file=path.join(folder,rel);if(!fs.existsSync(file)||!fs.statSync(file).isFile())errors.push(`referenced file not found: ${rel}`);}
  const declared=new Set(m.requiresCore||[]);const source=stripComments(files.filter(f=>f.endsWith('.js')&&fs.existsSync(path.join(folder,f))).map(f=>fs.readFileSync(path.join(folder,f),'utf8')).join('\n'));
  for(const [r,re] of usage)if(re.test(source)&&!declared.has(r))errors.push(`uses ${r} but plugin.json does not declare it`);
  for(const [re,label] of forbidden)if(re.test(source))errors.push(`${label} is not part of the Plugin API 1.15 development contract`);
  const topWorkspace=m?.workspace?.role==='top';
  if(m.pluginType==='tool'&&!topWorkspace){
    if(!declared.has('ui.menus'))errors.push('Command-only Tool plugins must declare ui.menus so Core can place them in the top Tools menu.');
    if(!/ctx\.ui\.menus\.add\s*\(/.test(source))errors.push('Command-only Tool plugins must contribute at least one action through ctx.ui.menus.add(...).');
  }
  if(m.pluginType==='workbench'||(m.pluginType==='tool'&&topWorkspace)){
    const accepts=Array.isArray(m?.data?.accepts)?m.data.accepts.map(String).filter(Boolean):[];
    if(m.pluginType==='workbench'&&!accepts.length)errors.push('Plugin API 1.15 workbenches must declare data.accepts so Core can route the standard import action.');
    if(/ctx\.data\.importWorkbench\b/.test(source))errors.push('Workspace import UI is Core-owned in Plugin API 1.15; do not invoke ctx.data.importWorkbench from plugin UI.');
    if(/<input[^>]+type=["']?file/i.test(source))errors.push('Workspace plugins must not create file inputs; use the Core-owned import action.');

    const workspaceActivity=String(m?.workspace?.activity||'').trim();
    const windowActivity=String(m?.window?.activity||'').trim();
    if(topWorkspace){
      const label=m.pluginType==='tool'?'Tool workspace':'TOP workbench';
      if(!workspaceActivity)errors.push(`${label} must declare workspace.activity.`);
      else if(!pluginId(workspaceActivity))errors.push(`invalid workspace.activity: ${workspaceActivity}`);
      if(!m.window||typeof m.window!=='object')errors.push(`${label} must declare a dedicated window contract.`);
      else if(!windowActivity)errors.push(`${label} must declare window.activity.`);
      else if(!pluginId(windowActivity))errors.push(`invalid window.activity: ${windowActivity}`);
      else if(workspaceActivity!==windowActivity)errors.push(`workspace.activity (${workspaceActivity}) must match window.activity (${windowActivity}).`);
      if(!declared.has('workspace'))errors.push(`${label} must declare workspace.`);
      if(!declared.has('ui.activities'))errors.push(`${label} must declare ui.activities.`);
      if(!declared.has('ui.top-workspace'))errors.push(`${label} must declare ui.top-workspace.`);
      if(!/ctx\.ui\.activities\.add\s*\(/.test(source))errors.push(`${label} must register its activity through ctx.ui.activities.add(...).`);
      if(!/ctx\.ui\.topWorkspace\.register\s*\(/.test(source))errors.push(`${label} must register its workspace through ctx.ui.topWorkspace.register(...).`);
      if(!/openMode\s*:\s*["']window["']/.test(source))errors.push(`${label} activity must use openMode: "window".`);
    }else if(m.window&&typeof m.window==='object'){
      errors.push('A Plugin API 1.15 workbench with a dedicated window must declare workspace.role="top"; standalone workbench activities do not own windows.');
    }
  }
  const windowDependencies=new Set(Array.isArray(m?.window?.dependencies)?m.window.dependencies.map(String):[]);
  if(/ctx\.ui\.scientificPlot\.create\s*\(/.test(source)&&m?.window&&topWorkspace&&!windowDependencies.has('d3'))errors.push('Dedicated workspace using ctx.ui.scientificPlot.create(...) must declare "d3" in window.dependencies.');
  if(/ctx\.ui\.scientificPlot\.(?:react|createPlotly)\s*\(/.test(source)&&m?.window&&topWorkspace&&!windowDependencies.has('plotly'))errors.push('Dedicated workspace using Plotly ScientificPlot APIs must declare "plotly" in window.dependencies.');

  const entry=path.join(folder,m.entry||'plugin.js');
  if(fs.existsSync(entry)){
    try{
      let runtime=null;const sandbox={DKDSPlugins:{define:manifest=>{runtime=manifest;}}};sandbox.window=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(fs.readFileSync(entry,'utf8'),sandbox,{filename:m.entry||'plugin.js',timeout:1000});
      if(!runtime)errors.push('entry did not call DKDSPlugins.define(...)');
      else {
        for(const key of ['id','name','version','apiVersion','pluginType'])if(String(runtime[key]??'')!==String(m[key]??''))errors.push(`runtime manifest ${key} does not match plugin.json`);
        for(const key of ['requiresCore','capabilities','workspace','window','data','algorithmCategories','algorithmProvides','compatibility','pluginDependencies'])if(!same(runtime[key]??(Array.isArray(m[key])?[]:null),m[key]??(Array.isArray(runtime[key])?[]:null)))errors.push(`runtime manifest ${key} does not match plugin.json`);
        if(Boolean(runtime.algorithmProvider)!==Boolean(m.algorithmProvider))errors.push('runtime manifest algorithmProvider does not match plugin.json');
      }
    }catch(e){errors.push(`cannot evaluate entry manifest: ${e.message}`);}
  }
  if(m.algorithmProvider===true){if(!Array.isArray(m.algorithmCategories)||!m.algorithmCategories.length)errors.push('algorithmProvider requires algorithmCategories');if(!Array.isArray(m.algorithmProvides)||!m.algorithmProvides.length)errors.push('algorithmProvider requires algorithmProvides');}
  if(errors.length){for(const e of errors)console.error(`- ${e}`);throw new Error(`${errors.length} validation error(s)`);}
  return {manifest:m,files};
}
function pack(folder,output){
  folder=path.resolve(folder);const {manifest,files}=validate(folder);const payload={schema:contract.packageSchema,manifest,files:{}};
  for(const rel of files)payload.files[rel]=fs.readFileSync(path.join(folder,rel),'utf8');
  const out=path.resolve(output||`${manifest.id}-${manifest.version}.dkplugin`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(payload,null,2)+'\n','utf8');return out;
}
const [command,folder,output]=process.argv.slice(2);
try{
  if(command==='validate'&&folder){const result=validate(folder);console.log(`DKDS SDK validation OK: ${result.manifest.id}@${result.manifest.version}`);}
  else if(command==='package'&&folder){console.log(`Created DKDS plugin package: ${pack(folder,output)}`);}
  else die('usage: dkds-plugin.js validate <plugin-folder> | package <plugin-folder> [output.dkplugin]');
}catch(e){die(e.message);}
