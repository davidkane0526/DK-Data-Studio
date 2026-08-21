const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SemverCompat = require('../semver-compat');

const root = path.resolve(__dirname, '..');
const pluginsDir = path.join(root, 'src', 'plugins');
const ids = new Set();
const windowActivities = new Set();
let count = 0;

const manifestSchema=JSON.parse(fs.readFileSync(path.join(root,'docs','plugin-manifest.schema.json'),'utf8'));
const coreRequirements=new Set(manifestSchema.properties.requiresCore.items.enum);


const requirementUsage=[
  ['runtime',/ctx\.runtime\b/],['events',/ctx\.events\b/],['status',/ctx\.status\b/],['io',/ctx\.io\b/],
  ['science',/ctx\.science\b|window\.DKDSScience\b/],['performance',/ctx\.performance\b/],['services',/ctx\.services\b/],['modules',/ctx\.modules\b|window\.DKDSPluginModules\b/],
  ['recipes',/ctx\.recipes\b/],['capabilities',/ctx\.capabilities\b/],['state',/ctx\.state\b/],['project',/ctx\.project\b/],
  ['workspace',/ctx\.workspace\b/],['parameters',/ctx\.parameters\b/],['data.flow',/ctx\.data\.(?:flow|exporters|transformers|analyzers)\b/],['data.importers',/ctx\.data\.importers\b/],['data.import-workbench',/ctx\.data\.importWorkbench\b/],['data.reactive',/ctx\.data\.reactive\b/],['data.pipeline',/ctx\.data\.pipeline\b/],['data.transforms',/ctx\.data\.transforms\b/],
  ['data.artifacts',/ctx\.data\.artifacts\b/],['data.sources',/ctx\.data\.sources\b/],['data.entities',/ctx\.data\.entities\b/],['data.types',/ctx\.data\.types\b/],['data.model',/ctx\.data\.model\b/],['data.formula',/ctx\.data\.formula\b/],
  ['workflow',/ctx\.workflow\b/],['analysis.providers',/ctx\.analysis\.providers\b/],['analysis.algorithms',/ctx\.analysis\.algorithms\b/],['analysis.detectors',/ctx\.analysis\.detectors\b/],
  ['charts',/ctx\.ui\.charts\b/],['charts.providers',/ctx\.charts\b/],['ui.dom',/ctx\.ui\.dom\b/],['ui.components',/ctx\.ui\.components\b/],
  ['ui.workspace',/ctx\.ui\.(?:pluginWorkspace|analysisWorkbench|workspaceSurface|analysisSurface|workbench)\b/],['ui.scientific-plot',/ctx\.ui\.scientificPlot\b/],
  ['ui.plot-views',/ctx\.ui\.plotViews\b/],['ui.table',/ctx\.ui\.tables\b/],['ui.settings',/ctx\.ui\.settings\b/],['ui.actions',/ctx\.ui\.actions\b/],['ui.selection',/ctx\.ui\.selection\b/],
  ['ui.interaction',/ctx\.ui\.(?:interaction|interactions)\b/],['ui.interaction-behavior',/ctx\.ui\.interactionBehaviors\b/],['ui.menus',/ctx\.ui\.menus\b/],['ui.context-menus',/ctx\.ui\.contextMenus\b/],
  ['ui.activities',/ctx\.ui\.activities\b/],['ui.top-workspace',/ctx\.ui\.topWorkspace\b/],['ui.toolbar',/ctx\.ui\.toolbar\b/],
  ['ui.status-bar',/ctx\.ui\.statusBar\b/],['ui.shortcuts',/ctx\.ui\.shortcuts\b/],['ui.pages',/ctx\.ui\.pages\b/],
  ['ui.styles',/ctx\.ui\.styles\b/],['ui.portable',/ctx\.ui\.portable\b/],['ui.edit',/ctx\.ui\.edit\b/]
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

  for (const field of ['id','name','version','entry']) if (!m[field]) fail(`${name}: missing ${field}`);
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(String(m.id || ''))) fail(`${name}: invalid id ${m.id}`);
  if (ids.has(m.id)) fail(`${name}: duplicate id ${m.id}`);
  ids.add(m.id);

  const entry = path.join(dir, m.entry || 'plugin.js');
  if (!fs.existsSync(entry)) fail(`${name}: entry not found ${m.entry}`);
  if (!['1.9.0','1.10.0','1.11.0','1.12.0','1.13.0','1.14.0'].includes(String(m.apiVersion||''))) fail(`${name}: built-in plugins must target apiVersion 1.9.0, 1.10.0, 1.11.0, 1.12.0, 1.13.0 or 1.14.0`);
  const pluginTypes=new Set(['foundation','data','algorithm','workbench','task','extension','developer']);
  if(!pluginTypes.has(String(m.pluginType||'')))fail(`${name}: built-in plugins must declare a valid pluginType`);
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
  if(m.compatibility!==undefined){
    if(!m.compatibility||typeof m.compatibility!=='object'||Array.isArray(m.compatibility))fail(`${name}: compatibility must be an object`);
    else for(const field of ['app','pluginApi'])if(m.compatibility[field]!==undefined&&(typeof m.compatibility[field]!=='string'||!SemverCompat.validateRange(m.compatibility[field])))fail(`${name}: compatibility.${field} must be a valid version range`);
  }
  const pluginDependencies=Array.isArray(m.pluginDependencies)?m.pluginDependencies:[];
  if(m.pluginDependencies!==undefined&&!Array.isArray(m.pluginDependencies))fail(`${name}: pluginDependencies must be an array`);
  const pluginDependencyIds=new Set();
  for(const row of pluginDependencies){const dependencyId=String(row?.id||'').trim(),range=String(row?.range||'').trim();if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(dependencyId)||!range||!SemverCompat.validateRange(range))fail(`${name}: invalid plugin dependency ${dependencyId}@${range}`);if(pluginDependencyIds.has(dependencyId))fail(`${name}: duplicate plugin dependency ${dependencyId}`);pluginDependencyIds.add(dependencyId);}
  if(m.scripts!==undefined){
    if(!Array.isArray(m.scripts)||!m.scripts.length)fail(`${name}: scripts must be a non-empty array when declared`);
    else for(const raw of m.scripts){
      const file=String(raw||'').replace(/\\/g,'/');
      if(!file||file.startsWith('/')||file.includes('..'))fail(`${name}: unsafe scripts entry ${file||'(empty)'}`);
      else if(!fs.existsSync(path.join(dir,file)))fail(`${name}: script not found ${file}`);
      else if(!file.toLowerCase().endsWith('.js'))fail(`${name}: plugin scripts must be JavaScript: ${file}`);
    }
    if(Array.isArray(m.scripts)&&!m.scripts.includes(m.entry||'plugin.js'))fail(`${name}: scripts must include entry ${m.entry||'plugin.js'}`);
  }


  // `plugin.json` is the machine contract; the runtime manifest and actual API
  // usage must agree with it so generated/AI plugins cannot silently depend on
  // undeclared Core infrastructure.
  try {
    let runtimeManifest=null;
    const sandbox={DKDSPlugins:{define:(manifest)=>{runtimeManifest=manifest;}}};
    sandbox.window=sandbox;sandbox.globalThis=sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(entry,'utf8'),sandbox,{filename:`${name}/${m.entry||'plugin.js'}`,timeout:500});
    if(!runtimeManifest)fail(`${name}: entry did not register a runtime manifest`);
    else {
      if(String(runtimeManifest.pluginType||'')!==String(m.pluginType||''))fail(`${name}: runtime pluginType must exactly match plugin.json`);
      if(JSON.stringify(runtimeManifest.requiresCore||[])!==JSON.stringify(m.requiresCore||[]))fail(`${name}: runtime requiresCore must exactly match plugin.json`);
      if(Boolean(runtimeManifest.algorithmProvider) !== Boolean(m.algorithmProvider))fail(`${name}: runtime algorithmProvider must exactly match plugin.json`);
      if(JSON.stringify(runtimeManifest.algorithmCategories||[])!==JSON.stringify(m.algorithmCategories||[]))fail(`${name}: runtime algorithmCategories must exactly match plugin.json`);
      if(JSON.stringify(runtimeManifest.algorithmProvides||[])!==JSON.stringify(m.algorithmProvides||[]))fail(`${name}: runtime algorithmProvides must exactly match plugin.json`);
      if(JSON.stringify(runtimeManifest.compatibility||null)!==JSON.stringify(m.compatibility||null))fail(`${name}: runtime compatibility must exactly match plugin.json`);
      if(JSON.stringify(runtimeManifest.pluginDependencies||[])!==JSON.stringify(m.pluginDependencies||[]))fail(`${name}: runtime pluginDependencies must exactly match plugin.json`);
    }
  } catch(err){ fail(`${name}: cannot evaluate runtime manifest: ${err.message}`); }

  const ownedFiles=new Set(Array.isArray(m.scripts)?m.scripts:[m.entry||'plugin.js']);
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

if (!process.exitCode) console.log(`Plugin manifests OK: ${count}`);
