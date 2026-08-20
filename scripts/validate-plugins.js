const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  ['workspace',/ctx\.workspace\b/],['parameters',/ctx\.parameters\b/],['data.flow',/ctx\.data\.(?:flow|importers|exporters|transformers|analyzers)\b/],['data.pipeline',/ctx\.data\.pipeline\b/],['data.transforms',/ctx\.data\.transforms\b/],
  ['data.artifacts',/ctx\.data\.artifacts\b/],['data.entities',/ctx\.data\.entities\b/],['data.types',/ctx\.data\.types\b/],['data.model',/ctx\.data\.model\b/],['data.formula',/ctx\.data\.formula\b/],
  ['workflow',/ctx\.workflow\b/],['analysis.providers',/ctx\.analysis\.providers\b/],['analysis.algorithms',/ctx\.analysis\.algorithms\b/],['analysis.detectors',/ctx\.analysis\.detectors\b/],
  ['charts',/ctx\.ui\.charts\b/],['charts.providers',/ctx\.charts\b/],['ui.dom',/ctx\.ui\.dom\b/],['ui.components',/ctx\.ui\.components\b/],
  ['ui.workspace',/ctx\.ui\.(?:pluginWorkspace|analysisWorkbench|workspaceSurface|analysisSurface|workbench)\b/],['ui.scientific-plot',/ctx\.ui\.scientificPlot\b/],
  ['ui.plot-views',/ctx\.ui\.plotViews\b/],['ui.actions',/ctx\.ui\.actions\b/],['ui.selection',/ctx\.ui\.selection\b/],
  ['ui.interaction',/ctx\.ui\.(?:interaction|interactions)\b/],['ui.menus',/ctx\.ui\.menus\b/],['ui.context-menus',/ctx\.ui\.contextMenus\b/],
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
  if (String(m.apiVersion||'') !== '1.8.0') fail(`${name}: built-in plugins must target apiVersion 1.8.0`);
  if(!Array.isArray(m.requiresCore))fail(`${name}: requiresCore must be an array`);
  else for(const requirement of m.requiresCore)if(!coreRequirements.has(String(requirement)))fail(`${name}: unknown Core requirement ${requirement}`);
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
    else if(JSON.stringify(runtimeManifest.requiresCore||[])!==JSON.stringify(m.requiresCore||[]))fail(`${name}: runtime requiresCore must exactly match plugin.json`);
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
