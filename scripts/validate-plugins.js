const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {normalizePluginPackage,referencedPluginAssets}=require('../desktop/plugin-package');
const PlatformPresentation=require('../sdk/platform-presentation-contract');

const root = path.resolve(__dirname, '..');
const pluginsDir = path.join(root, 'src', 'plugins');
const ids = new Set();
const windowActivities = new Set();
let count = 0;

const manifestSchema=JSON.parse(fs.readFileSync(path.join(root,'docs','plugin-manifest.schema.json'),'utf8'));
const coreRequirements=new Set(manifestSchema.properties.requiresCore.items.enum);
const currentManifestFields=new Set(Object.keys(manifestSchema.properties||{}));


const requirementUsage=[
  ['runtime',/ctx\.runtime\b/],['events',/ctx\.events\b/],['status',/ctx\.status\b/],['io',/ctx\.io\b/],
  ['science',/ctx\.science\b|window\.DKDSScience\b/],['performance',/ctx\.performance\b/],['execution.tasks',/ctx\.tasks\b/],['execution.commands',/ctx\.commands\.(?:list|history|replay)\b|domainCommand\s*:/],['services',/ctx\.services\b/],['modules',/ctx\.modules\b|window\.DKDSPluginModules\b/],
  ['recipes',/ctx\.recipes\b/],['capabilities',/ctx\.capabilities\b/],['state',/ctx\.state\b/],['project',/ctx\.project\b/],['history',/ctx\.history\b/],
  ['workspace',/ctx\.workspace\b/],['parameters',/ctx\.parameters\b/],['data.flow',/ctx\.data\.(?:flow|exporters|transformers|analyzers)\b/],['data.importers',/ctx\.data\.importers\b/],['data.import-workbench',/ctx\.data\.importWorkbench\b/],['data.reactive',/ctx\.data\.reactive\b/],['data.pipeline',/ctx\.data\.pipeline\b/],['data.transforms',/ctx\.data\.transforms\b/],
  ['data.artifacts',/ctx\.data\.artifacts\b/],['data.sources',/ctx\.data\.sources\b/],['data.entities',/ctx\.data\.entities\b/],['data.types',/ctx\.data\.types\b/],['data.model',/ctx\.data\.model\b/],['data.formula',/ctx\.data\.formula\b/],
  ['workflow',/ctx\.workflow\b/],['analysis.providers',/ctx\.analysis\.providers\b/],['analysis.algorithms',/ctx\.analysis\.algorithms\b/],['analysis.detectors',/ctx\.analysis\.detectors\b/],
  ['charts',/ctx\.ui\.charts\b/],['charts.providers',/ctx\.charts\b/],['ui.dom',/ctx\.ui\.dom\b/],['ui.components',/ctx\.ui\.components\b/],
  ['ui.workspace',/ctx\.ui\.(?:pluginWorkspace|analysisWorkbench|workspaceSurface|analysisSurface|workbench)\b/],['ui.scientific-plot',/ctx\.ui\.scientificPlot\b/],['ui.series',/ctx\.ui\.series\b/],['ui.legend-groups',/ctx\.ui\.legends\b/],['ui.group-plots',/ctx\.ui\.groupPlots\b/],['ui.group-area',/ctx\.ui\.groupArea\b|\.groupArea\s*\(/],['ui.tooltips',/ctx\.ui\.tooltips\b/],['ui.design-system',/ctx\.ui\.designSystem\b/],
  ['ui.plot-views',/ctx\.ui\.plotViews\b/],['ui.table',/ctx\.ui\.tables\b/],['ui.settings',/ctx\.ui\.settings\b/],['ui.dialogs',/ctx\.ui\.dialogs\b/],['ui.actions',/ctx\.ui\.actions\b/],['ui.selection',/ctx\.ui\.selection\b/],
  ['ui.interaction',/ctx\.ui\.(?:interaction|interactions)\b/],['ui.interaction-behavior',/ctx\.ui\.interactionBehaviors\b/],['ui.menus',/ctx\.ui\.menus\b/],['ui.context-menus',/ctx\.ui\.contextMenus\b/],
  ['ui.activities',/ctx\.ui\.activities\b/],['ui.top-workspace',/ctx\.ui\.topWorkspace\b/],['ui.toolbar',/ctx\.ui\.toolbar\b/],
  ['ui.status-bar',/ctx\.ui\.statusBar\b/],['ui.shortcuts',/ctx\.ui\.shortcuts\b/],['ui.pages',/ctx\.ui\.pages\b/],
  ['ui.styles',/ctx\.ui\.styles\b/],['ui.theme',/ctx\.ui\.theme\b/],['ui.portable',/ctx\.ui\.portable\b/],['ui.edit',/ctx\.ui\.edit\b/]
];

function fail(message) {
  console.error(`PLUGIN VALIDATION ERROR: ${message}`);
  process.exitCode = 2;
}

for (const name of fs.readdirSync(pluginsDir).sort()) {
  if (name.startsWith('_')) continue;
  const dir = path.join(pluginsDir, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const manifestPath = path.join(dir, 'plugin.json');
  if (!fs.existsSync(manifestPath)) continue;
  count++;

  let m;
  try { m = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (err) { fail(`${name}/plugin.json invalid JSON: ${err.message}`); continue; }

  for (const field of ['id','name','version','apiVersion','entry','pluginType','requiresCore']) if (m[field]===undefined||m[field]===null||m[field]==='') fail(`${name}: missing ${field}`);
  for(const field of Object.keys(m))if(!currentManifestFields.has(field))fail(`${name}: unsupported current-contract manifest field ${field}`);
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(String(m.id || ''))) fail(`${name}: invalid id ${m.id}`);
  if (ids.has(m.id)) fail(`${name}: duplicate id ${m.id}`);
  ids.add(m.id);

  const entry = path.join(dir, m.entry);
  if (!fs.existsSync(entry)) fail(`${name}: entry not found ${m.entry}`);
  if (String(m.apiVersion||'') !== '1.19.0') fail(`${name}: built-in plugins must target apiVersion 1.19.0`);
  const pluginTypes=new Set(['foundation','data','algorithm','workbench','task','tool','theme','extension','developer']);
  if(!pluginTypes.has(String(m.pluginType||'')))fail(`${name}: built-in plugins must declare a valid pluginType`);
  if(m.pluginType==='theme'){if(!(m.requiresCore||[]).includes('ui.theme'))fail(`${name}: theme plugins must declare ui.theme`);if((m.requiresCore||[]).includes('ui.styles'))fail(`${name}: theme plugins must use Theme Contract tokens instead of ui.styles`);if(Array.isArray(m.styles)&&m.styles.length)fail(`${name}: theme plugins must not ship arbitrary stylesheets`);if(m.platformPresentation!==undefined)fail(`${name}: theme plugins must not declare platformPresentation`);if(m.workspace||m.window)fail(`${name}: theme plugins must not own workspace/window contracts`);if(m.algorithmProvider===true)fail(`${name}: theme plugins cannot be Algorithm Providers`);}
  const platformCheck=PlatformPresentation.validate(m);
  for(const error of platformCheck.errors)fail(`${name}: ${error}`);
  if(!Array.isArray(m.requiresCore))fail(`${name}: requiresCore must be an array`);
  else for(const requirement of m.requiresCore)if(!coreRequirements.has(String(requirement)))fail(`${name}: unknown Core requirement ${requirement}`);
  const algorithmCategories=Array.isArray(m.algorithmCategories)?m.algorithmCategories.map(value=>String(value||'').trim()).filter(Boolean):[];
  if(m.algorithmCategories!==undefined&&!Array.isArray(m.algorithmCategories))fail(`${name}: algorithmCategories must be an array when declared`);
  if(new Set(algorithmCategories).size!==algorithmCategories.length)fail(`${name}: algorithmCategories must contain unique values`);
  for(const category of algorithmCategories)if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(category))fail(`${name}: invalid algorithm category ${category}`);
  if(m.algorithmProvider!==undefined&&typeof m.algorithmProvider!=='boolean')fail(`${name}: algorithmProvider must be boolean`);
  if(m.algorithmProvider===true&&!algorithmCategories.length)fail(`${name}: algorithmProvider requires at least one algorithmCategories entry`);
  if(algorithmCategories.length&&!(m.requiresCore||[]).includes('analysis.algorithms'))fail(`${name}: algorithmCategories requires analysis.algorithms in requiresCore`);
  const algorithmProvides=Array.isArray(m.algorithmProvides)?m.algorithmProvides:[];
  if(m.algorithmProvides!==undefined&&!Array.isArray(m.algorithmProvides))fail(`${name}: algorithmProvides must be an array when declared`);
  if(m.algorithmProvider===true&&!algorithmProvides.length)fail(`${name}: built-in Algorithm Providers must declare algorithmProvides for package catalog recovery`);
  const algorithmProvideKeys=new Set();
  for(const row of algorithmProvides){
    const category=String(row?.category||'').trim(),id=String(row?.id||row?.algorithmId||'').trim(),version=String(row?.version||row?.algorithmVersion||'').trim();
    if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(category)||! /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)||!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))fail(`${name}: invalid algorithmProvides entry ${category}/${id}@${version}`);
    if(category&&!algorithmCategories.includes(category))fail(`${name}: algorithmProvides category ${category} missing from algorithmCategories`);
    const key=`${category}::${id}@${version}`;if(algorithmProvideKeys.has(key))fail(`${name}: duplicate algorithmProvides entry ${key}`);algorithmProvideKeys.add(key);
  }
  const pluginDependencies=Array.isArray(m.pluginDependencies)?m.pluginDependencies:[];
  if(m.pluginDependencies!==undefined&&!Array.isArray(m.pluginDependencies))fail(`${name}: pluginDependencies must be an array`);
  const pluginDependencyIds=new Set();
  for(const row of pluginDependencies){const dependencyId=String(row?.id||'').trim(),keys=row&&typeof row==='object'&&!Array.isArray(row)?Object.keys(row):[];if(!row||typeof row!=='object'||Array.isArray(row)||keys.some(key=>key!=='id')||!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(dependencyId))fail(`${name}: invalid current-contract plugin dependency ${dependencyId||'(missing)'}`);if(pluginDependencyIds.has(dependencyId))fail(`${name}: duplicate plugin dependency ${dependencyId}`);pluginDependencyIds.add(dependencyId);}
  if(m.tasks!==undefined){
    if(!Array.isArray(m.tasks)||!m.tasks.length)fail(`${name}: tasks must be a non-empty array when declared`);
    const taskIds=new Set();
    for(const row of (Array.isArray(m.tasks)?m.tasks:[])){
      const id=String(row?.id||'').trim(),file=String(row?.entry||'').replace(/\\/g,'/').trim();
      if(!id||taskIds.has(id))fail(`${name}: invalid or duplicate task id ${id||'(empty)'}`);taskIds.add(id);
      if(!file||file.startsWith('/')||file.includes('..')||!file.toLowerCase().endsWith('.js'))fail(`${name}: unsafe task entry ${file||'(empty)'}`);
      else if(!fs.existsSync(path.join(dir,file)))fail(`${name}: task entry not found ${file}`);
      if(row?.imports!==undefined&&!Array.isArray(row.imports))fail(`${name}: task imports must be an array ${id}`);
      for(const raw of (Array.isArray(row?.imports)?row.imports:[])){const imp=String(raw||'').replace(/\\/g,'/').trim();if(!imp||imp.startsWith('/')||imp.includes('..')||!imp.toLowerCase().endsWith('.js'))fail(`${name}: unsafe task import ${imp||'(empty)'}`);else if(!fs.existsSync(path.join(dir,imp)))fail(`${name}: task import not found ${imp}`);}
    }
    if(!(m.requiresCore||[]).includes('execution.tasks'))fail(`${name}: tasks requires execution.tasks in requiresCore`);
  }
  if(m.scripts!==undefined){
    if(!Array.isArray(m.scripts)||!m.scripts.length)fail(`${name}: scripts must be a non-empty array when declared`);
    else for(const raw of m.scripts){
      const file=String(raw||'').replace(/\\/g,'/');
      if(!file||file.startsWith('/')||file.includes('..'))fail(`${name}: unsafe scripts entry ${file||'(empty)'}`);
      else if(!fs.existsSync(path.join(dir,file)))fail(`${name}: script not found ${file}`);
      else if(!file.toLowerCase().endsWith('.js'))fail(`${name}: plugin scripts must be JavaScript: ${file}`);
    }
    if(Array.isArray(m.scripts)&&!m.scripts.includes(m.entry))fail(`${name}: scripts must include entry ${m.entry}`);
  }


  // `plugin.json` is the machine contract; the runtime manifest and actual API
  // usage must agree with it so generated/AI plugins cannot silently depend on
  // undeclared Core infrastructure.
  try {
    let runtimeManifest=null;
    const sandbox={DKDSPlugins:{define:(manifest)=>{runtimeManifest=manifest;}}};
    sandbox.window=sandbox;sandbox.globalThis=sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(entry,'utf8'),sandbox,{filename:`${name}/${m.entry}`,timeout:500});
    if(!runtimeManifest)fail(`${name}: entry did not register a runtime manifest`);
    else {
      for(const field of Object.keys(runtimeManifest||{}))if(!currentManifestFields.has(field))fail(`${name}: runtime manifest contains unsupported current-contract field ${field}`);
      for(const field of ['id','name','version','apiVersion','entry','pluginType','requiresCore'])if(runtimeManifest[field]===undefined||runtimeManifest[field]===null||runtimeManifest[field]==='')fail(`${name}: runtime manifest missing ${field}`);
      for(const field of currentManifestFields){
        const runtimeValue=runtimeManifest[field],packageValue=m[field];
        if(JSON.stringify(runtimeValue)!==JSON.stringify(packageValue))fail(`${name}: runtime manifest ${field} must exactly match plugin.json`);
      }
    }
  } catch(err){ fail(`${name}: cannot evaluate runtime manifest: ${err.message}`); }

  const ownedFiles=new Set(Array.isArray(m.scripts)?m.scripts:[m.entry]);
  for(const file of PlatformPresentation.referencedPlatformAssets(m))ownedFiles.add(file);
  if(m.window?.runtime)ownedFiles.add(m.window.runtime);
  for(const file of (m.window?.scripts||[]))ownedFiles.add(file);
  const source=[...ownedFiles].filter(file=>fs.existsSync(path.join(dir,file))).map(file=>fs.readFileSync(path.join(dir,file),'utf8')).join('\n');
  const declared=new Set(m.requiresCore||[]);
  for(const [requirement,pattern] of requirementUsage)if(pattern.test(source)&&!declared.has(requirement))fail(`${name}: uses ${requirement} but does not declare it in requiresCore`);

  if (m.window !== undefined) {
    if (!m.window || typeof m.window !== 'object' || Array.isArray(m.window)) {
      fail(`${name}: window must be an object`);
    } else {
      const activity=String(m.window.activity||'').trim();
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(activity)) fail(`${name}: invalid window.activity ${activity||'(empty)'}`);
      else if(windowActivities.has(activity)) fail(`${name}: duplicate window.activity ${activity}`);
      else windowActivities.add(activity);

      if(m.window.runtime){
        const runtime=String(m.window.runtime);
        if(runtime.includes('/')||runtime.includes('\\')||runtime==='.'||runtime==='..')fail(`${name}: window.runtime must be a file in the plugin directory`);
        else if(!fs.existsSync(path.join(dir,runtime)))fail(`${name}: window runtime not found ${runtime}`);
      }
      for(const field of ['width','height','minWidth','minHeight']){
        if(m.window[field]!==undefined&&(!(Number(m.window[field])>0)))fail(`${name}: invalid window.${field}`);
      }
      for(const field of ['prewarm','reuse']){
        if(m.window[field]!==undefined&&typeof m.window[field]!=='boolean')fail(`${name}: window.${field} must be boolean`);
      }
      if(m.window.persistence!==undefined&&!['project','memory','none'].includes(String(m.window.persistence))){
        fail(`${name}: window.persistence must be project, memory or none`);
      }
      if(m.window.scripts!==undefined){
        if(!Array.isArray(m.window.scripts))fail(`${name}: window.scripts must be an array`);
        else for(const raw of m.window.scripts){
          const file=String(raw||'');
          if(!file||file.includes('/')||file.includes('\\')||file==='.'||file==='..')fail(`${name}: window.scripts entries must be files in the plugin directory`);
          else if(!fs.existsSync(path.join(dir,file)))fail(`${name}: window script not found ${file}`);
        }
      }
    }
  }
}

if(!process.exitCode){
  for(const name of fs.readdirSync(pluginsDir).sort()){
    if(name.startsWith('_'))continue;const dir=path.join(pluginsDir,name);if(!fs.statSync(dir).isDirectory())continue;
    const manifestPath=path.join(dir,'plugin.json');if(!fs.existsSync(manifestPath))continue;
    try{
      const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
      const referenced=new Set(referencedPluginAssets(manifest)),files={};
      for(const rel of referenced){const file=path.join(dir,String(rel));if(fs.existsSync(file)&&fs.statSync(file).isFile())files[String(rel).replace(/\\/g,'/')]=fs.readFileSync(file,'utf8');}
      normalizePluginPackage({schema:1,manifest,files},{allowBuiltinId:true});
    }catch(err){fail(`${name}: bundled export/package contract failed: ${err.message}`);}
  }
}
if (!process.exitCode) console.log(`Plugin manifests/packages OK: ${count}`);
