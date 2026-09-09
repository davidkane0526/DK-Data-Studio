#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {inspectWorkspaceStyles}=require('../layout-contract');
const ThemeContract=require('../theme-contract');
const ThemeCoverageContract=require('../theme-coverage-contract');
const {inspectPluginSource,usesThemeRegister}=require('../source-contract');
const {inspectPluginCss,collectCoreAliases}=require('../visual-contract');
const PlatformPresentation=require('../platform-presentation-contract');

const sdkRoot=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(sdkRoot,'contract.json'),'utf8'));
const schema=JSON.parse(fs.readFileSync(path.join(sdkRoot,contract.manifestSchema),'utf8'));
const requirements=new Set(schema.properties.requiresCore.items.enum);
const currentManifestFields=new Set(Object.keys(schema.properties||{}));
const API=contract.pluginApiVersion;
const TRANSLUCENT_THEME_RECIPES=new Set(['thin-glass','soft-glass','liquid-glass']);
const GLASS_FILL_FLOORS=Object.freeze({chrome:.58,sidebar:.62,elevated:.62,popover:.78,floating:.58});
function opacityNumber(value){
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  const text=String(value??'').trim();if(!text)return null;
  if(text.endsWith('%')){const n=Number(text.slice(0,-1));return Number.isFinite(n)?n/100:null;}
  const n=Number(text);return Number.isFinite(n)?n:null;
}
function warnThemeGlassLegibility(row){
  for(const mode of ['light','dark']){
    const resolved=ThemeContract.resolveProfile(row.profile,mode);
    for(const [role,floor] of Object.entries(GLASS_FILL_FLOORS)){
      if(!TRANSLUCENT_THEME_RECIPES.has(String(resolved.recipes?.[role]||'')))continue;
      const value=resolved.material?.roles?.[role]?.materialTintOpacity??resolved.material?.base?.materialTintOpacity;
      const opacity=opacityNumber(value);
      if(opacity!=null&&opacity<floor)console.warn(`DKDS SDK THEME WARNING: profile ${row.id} ${mode}.${role} materialTintOpacity=${opacity} is below the Core readability floor ${floor}; runtime will clamp the effective glass fill.`);
    }
  }
}

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
  const set=new Set([manifest.entry,...(manifest.scripts||[]),...(manifest.styles||[]),...PlatformPresentation.referencedPlatformAssets(manifest),...(manifest.window?.runtime?[manifest.window.runtime]:[]),...(manifest.window?.scripts||[])]);
  if(fs.existsSync(path.join(folder,'README.md')))set.add('README.md');
  return [...set].map(relFile);
}
const usage=[
  ['runtime',/ctx\.runtime\b/],['events',/ctx\.events\b/],['status',/ctx\.status\b/],['io',/ctx\.io\b/],['science',/ctx\.science\b/],['performance',/ctx\.performance\b/],
  ['services',/ctx\.services\b/],['modules',/ctx\.modules\b/],['capabilities',/ctx\.capabilities\b/],['state',/ctx\.state\b/],['project',/ctx\.project\b/],['workspace',/ctx\.workspace\b/],['parameters',/ctx\.parameters\b/],
  ['data.flow',/ctx\.data\.(?:flow|importers|exporters|transformers|analyzers)\b/],['data.pipeline',/ctx\.data\.pipeline\b/],['data.transforms',/ctx\.data\.transforms\b/],['data.artifacts',/ctx\.data\.artifacts\b/],['data.entities',/ctx\.data\.entities\b/],['data.types',/ctx\.data\.types\b/],['data.model',/ctx\.data\.model\b/],['data.formula',/ctx\.data\.formula\b/],
  ['workflow',/ctx\.workflow\b/],['analysis.providers',/ctx\.analysis\.providers\b/],['analysis.algorithms',/ctx\.analysis\.algorithms\b/],['charts.providers',/ctx\.charts\b/]
];
const forbidden=[
  [/\bctx\.host\b/,'private host bypass'],[/window\.electronAPI|\belectronAPI\./,'Electron bridge'],[/window\.Plotly|\bPlotly\./,'raw Plotly'],
  [/\bdocument\.(?:getElementById|querySelector|querySelectorAll|createElement|createElementNS)/,'raw document DOM'],[/new\s+(?:ResizeObserver|MutationObserver)\s*\(/,'private observer lifecycle'],
  [/\b(?:requestAnimationFrame|cancelAnimationFrame|setInterval|clearInterval|setTimeout|clearTimeout|queueMicrotask)\s*\(/,'raw scheduler lifecycle'],[/\bwindow\.(?:alert|confirm|prompt)\s*\(/,'native browser dialog (use ctx.ui.dialogs)'],[/ctx\.registry\.add\s*\(/,'generic registry bypass'],[/\bDKDSHostRecipes\./,'host recipe global']
];
function stripComments(source){return source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');}

function staticInjectedStyleRows(source){
  const rows=[];const text=String(source||'');
  const templateRe=/ctx\.ui\.styles\.add\s*\(\s*[^,]+,\s*`([\s\S]*?)`\s*\)/g;let m;
  while((m=templateRe.exec(text))){
    const content=String(m[1]||'').replace(/\$\{[\s\S]*?\}/g,'');
    rows.push({name:'ctx.ui.styles.add(template)',content});
  }
  const quotedRe=/ctx\.ui\.styles\.add\s*\(\s*[^,]+,\s*(['"])((?:\\.|(?!\1)[\s\S])*?)\1\s*\)/g;
  while((m=quotedRe.exec(text))){
    let content=String(m[2]||'');try{content=JSON.parse('"'+content.replace(/"/g,'\\"')+'"');}catch{}
    rows.push({name:'ctx.ui.styles.add(string)',content});
  }
  return rows;
}
async function validate(folder){
  folder=path.resolve(folder);const m=readManifest(folder);const errors=[];
  for(const field of Object.keys(m||{}))if(!currentManifestFields.has(field))errors.push(`unsupported current-contract manifest field: ${field}`);
  for(const field of ['id','name','version','apiVersion','entry','pluginType','requiresCore'])if(m[field]===undefined||m[field]===null||m[field]==='')errors.push(`${field} is required`);
  if(!pluginId(m.id))errors.push(`invalid id: ${m.id||'(missing)'}`);if(String(m.id||'').startsWith('builtin.'))errors.push('builtin.* is reserved for application plugins');
  if(!String(m.name||'').trim())errors.push('name is required');if(!version(m.version))errors.push(`version must be semver: ${m.version||'(missing)'}`);
  const pluginTypes=new Set(schema.properties.pluginType?.enum||[]);if(!pluginTypes.has(String(m.pluginType||'')))errors.push(`invalid pluginType: ${m.pluginType||'(missing)'}`);
  if(m.apiVersion!==API)errors.push(`new SDK plugins must target apiVersion ${API}`);if(!Array.isArray(m.requiresCore))errors.push('requiresCore must be an array');
  else {const seen=new Set();for(const r of m.requiresCore){if(!requirements.has(r))errors.push(`unknown Core requirement: ${r}`);if(seen.has(r))errors.push(`duplicate Core requirement: ${r}`);seen.add(r);}}
  const platformCheck=PlatformPresentation.validate(m);
  errors.push(...platformCheck.errors);
  if(m.pluginType==='theme'&&m.platformPresentation!==undefined)errors.push('Theme plugins must not declare platformPresentation; use Theme Contract tokens.');
  for(const sharedStyle of (Array.isArray(m.styles)?m.styles:[])){
    const file=path.join(folder,String(sharedStyle||''));
    if(!fs.existsSync(file))continue;
    const css=fs.readFileSync(file,'utf8');
    if(/data-dkds-host\s*=|react-native-client/.test(css))errors.push(`${sharedStyle} contains platform-host selectors; move platform-only presentation into platformPresentation.desktop/mobile assets.`);
  }  if(Array.isArray(m.pluginDependencies))for(const dep of m.pluginDependencies){const keys=dep&&typeof dep==='object'&&!Array.isArray(dep)?Object.keys(dep):[];if(!dep||typeof dep!=='object'||Array.isArray(dep)||keys.some(key=>key!=='id')||!pluginId(dep.id))errors.push(`invalid current-contract plugin dependency: ${dep?.id||'(missing)'}`);}
  let files=[];try{files=referencedFiles(m,folder);}catch(e){errors.push(e.message);}
  for(const rel of files){const file=path.join(folder,rel);if(!fs.existsSync(file)||!fs.statSync(file).isFile())errors.push(`referenced file not found: ${rel}`);}
  const declared=new Set(m.requiresCore||[]);const rawSource=files.filter(f=>f.endsWith('.js')&&fs.existsSync(path.join(folder,f))).map(f=>fs.readFileSync(path.join(folder,f),'utf8')).join('\n');const source=stripComments(rawSource);
  for(const [r,re] of usage)if(re.test(source)&&!declared.has(r))errors.push(`uses ${r} but plugin.json does not declare it`);
  const sourceAudit=inspectPluginSource(rawSource,{apiVersion:m.apiVersion,requiresCore:m.requiresCore});
  for(const issue of sourceAudit.issues)errors.push(`${issue.message} (${issue.line}:${issue.column})`);
  if(/\bmountPrimary\s*\(\s*\{[\s\S]{0,1600}?\b(?:leftNode|leftHtml)\s*:/.test(source)||/\bprimary\s*:\s*\{[\s\S]{0,1600}?\b(?:leftNode|leftHtml)\s*:/.test(source))errors.push('Plugin API 1.19 removed PRIMARY leftNode/leftHtml. Register that semantic region as a PRIME surface with presentationRole instead.');
  for(const [re,label] of forbidden)if(re.test(source))errors.push(`${label} is not part of the Plugin API ${API} development contract`);
  const styleRows=files.filter(f=>f.endsWith('.css')&&fs.existsSync(path.join(folder,f))).map(f=>({name:f,content:fs.readFileSync(path.join(folder,f),'utf8')}));
  const layoutAudit=inspectWorkspaceStyles({apiVersion:m.apiVersion,pluginType:m.pluginType,workspace:m.workspace,ui:m.ui||{},styles:styleRows});
  errors.push(...layoutAudit.errors);for(const warning of layoutAudit.warnings)console.warn(`DKDS SDK WARNING: ${warning}`);
  if(m.pluginType!=='theme'){
    const visualStyleRows=[...styleRows,...staticInjectedStyleRows(source)];
    const visualAliases=collectCoreAliases(rawSource);
    for(const row of visualStyleRows){
      const ownership=inspectPluginCss(row.content,{path:row.name,aliases:visualAliases});
      for(const issue of ownership.issues)errors.push(`${issue.code}: ${issue.message}`);
      const visualIssues=ThemeCoverageContract.auditCss(row.content,{pluginId:m.id,source:row.name});
      for(const issue of visualIssues)console.warn(`DKDS SDK THEME COVERAGE WARNING: ${row.name} ${issue.selector} ${issue.property}: ${issue.value} (${issue.reason})`);
    }
  }
  if(m.pluginType==='theme'){
    if(!declared.has('ui.theme'))errors.push('Theme plugins must declare ui.theme.');
    if(declared.has('ui.styles'))errors.push('Theme plugins must use Theme Contract tokens instead of ui.styles.');
    if(styleRows.length)errors.push('Theme plugins must not ship arbitrary stylesheets; use Theme Contract tokens and motion tokens.');
    if(m.workspace||m.window)errors.push('Theme plugins must not own workspace or window contracts.');
    if(m.algorithmProvider===true)errors.push('Theme plugins cannot be Algorithm Providers.');
    if(!usesThemeRegister(rawSource))errors.push('Theme plugins must register at least one profile through ctx.ui.theme.register(...) or a stable ctx.ui.theme alias.');
  }
  const topWorkspace=m?.workspace?.role==='top';
  if(m.pluginType==='tool'&&!topWorkspace){
    if(!declared.has('ui.menus'))errors.push('Command-only Tool plugins must declare ui.menus so Core can place them in the top Tools menu.');
    if(!/ctx\.ui\.menus\.add\s*\(/.test(source))errors.push('Command-only Tool plugins must contribute at least one action through ctx.ui.menus.add(...).');
  }
  if(m.pluginType==='workbench'||(m.pluginType==='tool'&&topWorkspace)){
    const accepts=Array.isArray(m?.data?.accepts)?m.data.accepts.map(String).filter(Boolean):[];
    if(m.pluginType==='workbench'&&!accepts.length)errors.push('Plugin API 1.19 workbenches must declare data.accepts so Core can route the standard import action.');
    if(/ctx\.data\.importWorkbench\b/.test(source))errors.push('Workspace import UI is Core-owned in Plugin API 1.19; do not invoke ctx.data.importWorkbench from plugin UI.');
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
      errors.push('A Plugin API 1.19 workbench with a dedicated window must declare workspace.role="top"; standalone workbench activities do not own windows.');
    }
  }
  const windowDependencies=new Set(Array.isArray(m?.window?.dependencies)?m.window.dependencies.map(String):[]);
  const usesScientificRenderer=/ctx\.ui\.scientificPlot\.(?:create|react|createRenderer|scalarField)\s*\(/.test(source);
  if(usesScientificRenderer&&m?.window&&topWorkspace&&!windowDependencies.has('scientific-renderer'))errors.push('Dedicated workspace using ScientificPlot must declare "scientific-renderer" in window.dependencies. Renderer vendors are Core implementation details.');
  if(windowDependencies.has('plotly')||windowDependencies.has('d3'))errors.push('Plugin API 1.19 workspaces must declare "scientific-renderer" instead of vendor dependencies "plotly"/"d3".');

  const entry=path.join(folder,m.entry);
  if(fs.existsSync(entry)){
    try{
      let runtime=null,runtimeActivate=null;const sandbox={DKDSPlugins:{define:(manifest,activate)=>{runtime=manifest;runtimeActivate=activate;}}};sandbox.window=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(fs.readFileSync(entry,'utf8'),sandbox,{filename:m.entry,timeout:1000});
      if(!runtime)errors.push('entry did not call DKDSPlugins.define(...)');
      else {
        for(const key of Object.keys(runtime||{}))if(!currentManifestFields.has(key))errors.push(`runtime manifest contains unsupported current-contract field: ${key}`);
        for(const key of schema.required||[])if(runtime[key]===undefined||runtime[key]===null||runtime[key]==='')errors.push(`runtime manifest ${key} is required`);
        for(const key of currentManifestFields)if(!same(runtime[key],m[key]))errors.push(`runtime manifest ${key} does not match plugin.json`);
        if(m.pluginType==='theme'){
          if(typeof runtimeActivate!=='function')errors.push('Theme plugin must provide an activation function.');
          else{
            const registered=[];
            const themeApi=Object.freeze({contractVersion:ThemeContract.version,materialContexts:ThemeContract.materialContexts,componentContexts:ThemeContract.componentContexts,materialFor:(role,context)=>ThemeContract.resolveMaterialContext(ThemeContract.validateProfile({modes:{light:{},dark:{}}}).material,role,context),recipeFor:()=> 'clear',register:(id,spec)=>{const local=String(id||'').trim();if(!local)throw new Error('Theme profile id required.');const normalized=ThemeContract.validateProfile(spec,`theme.register(${local})`);registered.push({id:local,profile:normalized});return Object.freeze({id:local,dispose(){}});},activate:()=>'',current:()=>({mode:'light',profile:'builtin.default'}),list:()=>[],tokens:()=>({}),materialRoles:ThemeContract.materialRoles,appearanceRoles:()=>({roles:{},components:{}}),appearanceComponents:()=>({}),consumption:()=>({version:'1.0.0',contractVersion:ThemeContract.version,components:{},semantic:{primary:'accent',secondary:'accentAlt',info:'info',success:'success',warning:'warning',danger:'danger'},scientific:{mode:'fallback-only',precedence:['user-explicit','plugin-domain-explicit','project-saved','theme-fallback','core-default']}}),scientific:()=>({seriesPalette:[],mode:'fallback-only',precedence:['user-explicit','plugin-domain-explicit','project-saved','theme-fallback','core-default']})});
            const activationResult=runtimeActivate(Object.freeze({ui:Object.freeze({theme:themeApi}),manifest:Object.freeze(m),apiVersion:API}));
            if(activationResult&&typeof activationResult.then==='function')await Promise.race([activationResult,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Theme activation validation timed out.')),1000))]);
            if(!registered.length)errors.push('Theme plugins must register at least one valid Theme Profile during SDK validation.');
            for(const row of registered){
              const missing=ThemeContract.materialRoles().filter(role=>!Object.prototype.hasOwnProperty.call(row.profile.recipes||{},role));
              if(missing.length)errors.push(`Theme profile ${row.id} must explicitly declare a Material Recipe for every Core role; missing: ${missing.join(', ')}.`);
              warnThemeGlassLegibility(row);
            }
          }
        }
      }
    }catch(e){errors.push(`cannot evaluate entry/theme profile: ${e.message}`);}
  }
  if(m.algorithmProvider===true){if(!Array.isArray(m.algorithmCategories)||!m.algorithmCategories.length)errors.push('algorithmProvider requires algorithmCategories');if(!Array.isArray(m.algorithmProvides)||!m.algorithmProvides.length)errors.push('algorithmProvider requires algorithmProvides');}
  if(errors.length){for(const e of errors)console.error(`- ${e}`);throw new Error(`${errors.length} validation error(s)`);}
  return {manifest:m,files};
}
async function pack(folder,output){
  folder=path.resolve(folder);const {manifest,files}=await validate(folder);const payload={schema:contract.packageSchema,manifest,files:{}};
  for(const rel of files)payload.files[rel]=fs.readFileSync(path.join(folder,rel),'utf8');
  const out=path.resolve(output||`${manifest.id}-${manifest.version}.dkplugin`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(payload,null,2)+'\n','utf8');return out;
}
const [command,folder,output]=process.argv.slice(2);
(async()=>{
  try{
    if(command==='validate'&&folder){const result=await validate(folder);console.log(`DKDS SDK validation OK: ${result.manifest.id}@${result.manifest.version}`);}
    else if(command==='package'&&folder){console.log(`Created DKDS plugin package: ${await pack(folder,output)}`);}
    else die('usage: dkds-plugin.js validate <plugin-folder> | package <plugin-folder> [output.dkplugin]');
  }catch(e){die(e.message);}
})();
