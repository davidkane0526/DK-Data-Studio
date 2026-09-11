const path = require('path');
const {inspectWorkspaceStyles}=require('../sdk/layout-contract');
const {inspectPluginSource,usesThemeRegister}=require('../sdk/source-contract');
const PlatformPresentation=require('../sdk/platform-presentation-contract');

const PLUGIN_PACKAGE_SCHEMA = 1;
const MAX_FILES = 64;
const MAX_FILE_CHARS = 4 * 1024 * 1024;
const MAX_TOTAL_CHARS = 8 * 1024 * 1024;
const CURRENT_MANIFEST_FIELDS = new Set([
  'id','name','version','apiVersion','entry','pluginType','enabled','order','description','systemCritical',
  'requiresCore','capabilities','workspace','window','data','algorithmProvider','algorithmCategories','algorithmProvides',
  'pluginDependencies','scripts','styles','platformPresentation','tasks'
]);

function validPluginId(id) {
  return /^[a-z0-9][a-z0-9._-]*$/i.test(String(id || ''));
}

function normalizeRelativeFile(name) {
  const raw = String(name || '').replace(/\\/g, '/').trim();
  if (!raw || raw.startsWith('/') || /^[a-z]:\//i.test(raw)) throw new Error(`Invalid plugin file path: ${name}`);
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`Unsafe plugin file path: ${name}`);
  }
  if (normalized.length > 220) throw new Error(`Plugin file path is too long: ${name}`);
  return normalized;
}

function referencedPluginAssets(manifest = {}) {
  const taskAssets = (Array.isArray(manifest.tasks) ? manifest.tasks : [])
    .flatMap(task => [task?.entry, ...(Array.isArray(task?.imports) ? task.imports : [])])
    .filter(Boolean);
  return [...new Set([
    manifest.entry,
    ...(Array.isArray(manifest.scripts) ? manifest.scripts : []),
    ...(Array.isArray(manifest.styles) ? manifest.styles : []),
    ...PlatformPresentation.referencedPlatformAssets(manifest),
    ...(manifest.window?.runtime ? [manifest.window.runtime] : []),
    ...(Array.isArray(manifest.window?.scripts) ? manifest.window.scripts : []),
    ...taskAssets
  ].filter(Boolean).map(normalizeRelativeFile))];
}

function normalizePluginPackage(input, { allowBuiltinId = false } = {}) {
  const pkg = typeof input === 'string' ? JSON.parse(input) : input;
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('Plugin package must be an object.');
  if (Number(pkg.schema) !== PLUGIN_PACKAGE_SCHEMA) throw new Error(`Unsupported plugin package schema: ${pkg.schema}`);

  const sourceManifest = pkg.manifest;
  if (!sourceManifest || typeof sourceManifest !== 'object'||Array.isArray(sourceManifest)) throw new Error('Plugin package manifest is missing.');
  const unknownFields=Object.keys(sourceManifest).filter(key=>!CURRENT_MANIFEST_FIELDS.has(key));
  if(unknownFields.length)throw new Error(`Plugin manifest contains unsupported current-contract fields: ${unknownFields.join(', ')}`);
  const id = String(sourceManifest.id || '').trim();
  if (!validPluginId(id)) throw new Error(`Invalid plugin id: ${id}`);
  if (!allowBuiltinId && id.startsWith('builtin.')) throw new Error('The builtin.* namespace is reserved for application plugins.');

  const name = String(sourceManifest.name || '').trim();
  const version = String(sourceManifest.version || '').trim();
  const apiVersion = String(sourceManifest.apiVersion || '').trim();
  if(!apiVersion)throw new Error('Plugin manifest.apiVersion is required.');
  if(!sourceManifest.entry)throw new Error('Plugin manifest.entry is required.');
  const entry = normalizeRelativeFile(sourceManifest.entry);
  const pluginType=String(sourceManifest.pluginType||'').trim().toLowerCase();
  if(!pluginType)throw new Error('Plugin manifest.pluginType is required.');
  const pluginTypes=new Set(['foundation','data','algorithm','workbench','task','tool','theme','extension','developer']);
  if(!pluginTypes.has(pluginType))throw new Error(`Unsupported pluginType: ${sourceManifest.pluginType}`);
  const algorithmProvider=sourceManifest.algorithmProvider===true;
  if(sourceManifest.algorithmProvider!==undefined&&typeof sourceManifest.algorithmProvider!=='boolean')throw new Error('Plugin manifest.algorithmProvider must be boolean.');
  if(sourceManifest.algorithmCategories!==undefined&&!Array.isArray(sourceManifest.algorithmCategories))throw new Error('Plugin manifest.algorithmCategories must be an array.');
  const algorithmCategories=[...new Set((Array.isArray(sourceManifest.algorithmCategories)?sourceManifest.algorithmCategories:[]).map(value=>String(value||'').trim()).filter(Boolean))];
  for(const category of algorithmCategories)if(!validPluginId(category))throw new Error(`Invalid algorithm category: ${category}`);
  if(algorithmProvider&&!algorithmCategories.length)throw new Error('Algorithm Provider packages must declare algorithmCategories.');
  if(algorithmCategories.length&&!(Array.isArray(sourceManifest.requiresCore)&&sourceManifest.requiresCore.includes('analysis.algorithms')))throw new Error('algorithmCategories requires analysis.algorithms in requiresCore.');
  if(sourceManifest.algorithmProvides!==undefined&&!Array.isArray(sourceManifest.algorithmProvides))throw new Error('Plugin manifest.algorithmProvides must be an array.');
  const algorithmProvides=[];const algorithmProvideKeys=new Set();
  for(const raw of (Array.isArray(sourceManifest.algorithmProvides)?sourceManifest.algorithmProvides:[])){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('algorithmProvides entries must be objects.');
    const category=String(raw.category||'').trim(),algorithmId=String(raw.id||raw.algorithmId||'').trim(),algorithmVersion=String(raw.version||raw.algorithmVersion||'').trim();
    if(!validPluginId(category)||!validPluginId(algorithmId)||!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(algorithmVersion))throw new Error(`Invalid algorithmProvides entry: ${category}/${algorithmId}@${algorithmVersion}`);
    if(!algorithmProvider)throw new Error('algorithmProvides requires algorithmProvider=true.');
    if(!algorithmCategories.includes(category))throw new Error(`algorithmProvides category is not declared in algorithmCategories: ${category}`);
    const key=`${category}::${algorithmId}@${algorithmVersion}`;if(algorithmProvideKeys.has(key))throw new Error(`Duplicate algorithmProvides entry: ${key}`);algorithmProvideKeys.add(key);
    algorithmProvides.push({category,id:algorithmId,version:algorithmVersion,...(raw.title?{title:String(raw.title)}:{})});
  }
  if(sourceManifest.pluginDependencies!==undefined&&!Array.isArray(sourceManifest.pluginDependencies))throw new Error('Plugin manifest.pluginDependencies must be an array.');
  const pluginDependencies=[];const dependencyIds=new Set();
  for(const raw of (Array.isArray(sourceManifest.pluginDependencies)?sourceManifest.pluginDependencies:[])){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('pluginDependencies entries must be objects.');
    const keys=Object.keys(raw);if(keys.some(key=>key!=='id'))throw new Error(`pluginDependencies only accepts {id} in the current contract: ${keys.join(', ')}`);
    const dependencyId=String(raw.id||'').trim();
    if(!validPluginId(dependencyId))throw new Error(`Invalid plugin dependency: ${dependencyId}`);
    if(dependencyIds.has(dependencyId))throw new Error(`Duplicate plugin dependency: ${dependencyId}`);dependencyIds.add(dependencyId);
    pluginDependencies.push({id:dependencyId});
  }
  if (!name) throw new Error('Plugin manifest.name is required.');
  if (!version) throw new Error('Plugin manifest.version is required.');
  if (apiVersion !== '1.19.0') throw new Error(`Unsupported Plugin API: ${apiVersion}; this host requires 1.19.0`);

  const tasks=[];const taskIds=new Set();
  if(sourceManifest.tasks!==undefined&&!Array.isArray(sourceManifest.tasks))throw new Error('Plugin manifest.tasks must be an array.');
  for(const row of (Array.isArray(sourceManifest.tasks)?sourceManifest.tasks:[])){
    if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('Plugin manifest.tasks entries must be objects.');
    const keys=Object.keys(row);if(keys.some(key=>!['id','entry','imports'].includes(key)))throw new Error('Plugin manifest.tasks only accepts {id,entry,imports}.');
    const taskId=String(row.id||'').trim(),taskEntry=normalizeRelativeFile(row.entry),taskImports=Array.isArray(row.imports)?row.imports.map(normalizeRelativeFile):[];
    if(row.imports!==undefined&&!Array.isArray(row.imports))throw new Error(`Task imports must be an array: ${taskId||'(missing)'}`);
    if(!validPluginId(taskId)||taskIds.has(taskId))throw new Error(`Invalid or duplicate task id: ${taskId}`);taskIds.add(taskId);tasks.push({id:taskId,entry:taskEntry,...(taskImports.length?{imports:[...new Set(taskImports)]}:{})});
  }
  if(tasks.length&&!(Array.isArray(sourceManifest.requiresCore)&&sourceManifest.requiresCore.includes('execution.tasks')))throw new Error('Plugin manifest.tasks requires execution.tasks in requiresCore.');

  const rawFiles = pkg.files;
  if (!rawFiles || typeof rawFiles !== 'object' || Array.isArray(rawFiles)) throw new Error('Plugin package files are missing.');
  const fileEntries = Object.entries(rawFiles);
  if (!fileEntries.length) throw new Error('Plugin package contains no files.');
  if (fileEntries.length > MAX_FILES) throw new Error(`Plugin package contains too many files (${fileEntries.length}/${MAX_FILES}).`);

  const files = {};
  let totalChars = 0;
  for (const [rawName, rawContent] of fileEntries) {
    const fileName = normalizeRelativeFile(rawName);
    if (Object.prototype.hasOwnProperty.call(files, fileName)) throw new Error(`Duplicate plugin file: ${fileName}`);
    if (typeof rawContent !== 'string') throw new Error(`Plugin package supports text files only: ${fileName}`);
    if (rawContent.length > MAX_FILE_CHARS) throw new Error(`Plugin file is too large: ${fileName}`);
    totalChars += rawContent.length;
    if (totalChars > MAX_TOTAL_CHARS) throw new Error('Plugin package is too large.');
    files[fileName] = rawContent;
  }
  if (!Object.prototype.hasOwnProperty.call(files, entry)) throw new Error(`Plugin entry not found in package: ${entry}`);

  const scripts = Array.isArray(sourceManifest.scripts) && sourceManifest.scripts.length
    ? sourceManifest.scripts.map(normalizeRelativeFile)
    : [entry];
  if (Array.isArray(sourceManifest.scripts)&&sourceManifest.scripts.length&&!scripts.includes(entry)) throw new Error(`Plugin manifest.scripts must include entry ${entry}.`);
  for(const task of tasks){if(!Object.prototype.hasOwnProperty.call(files,task.entry)||!task.entry.toLowerCase().endsWith('.js'))throw new Error(`Plugin task worker not found: ${task.entry}`);for(const file of task.imports||[])if(!Object.prototype.hasOwnProperty.call(files,file)||!file.toLowerCase().endsWith('.js'))throw new Error(`Plugin task import not found: ${file}`);}
  for (const fileName of scripts) {
    if (!Object.prototype.hasOwnProperty.call(files, fileName)) throw new Error(`Plugin script not found: ${fileName}`);
    if (!fileName.toLowerCase().endsWith('.js')) throw new Error(`Plugin script must be JavaScript: ${fileName}`);
  }
  const sourceContractErrors=[];
  for(const [fileName,source] of Object.entries(files)){
    if(!fileName.toLowerCase().endsWith('.js'))continue;
    const audit=inspectPluginSource(source,{apiVersion,requiresCore:sourceManifest.requiresCore});
    for(const issue of audit.issues)sourceContractErrors.push(`${fileName}:${issue.line}:${issue.column} ${issue.message}`);
  }
  if(sourceContractErrors.length){const error=new Error(`Plugin source contract failed: ${sourceContractErrors.join(' ')}`);error.code='PLUGIN_SOURCE_CONTRACT';error.title='插件 API 调用无效';throw error;}

  const styles = Array.isArray(sourceManifest.styles) ? sourceManifest.styles.map(normalizeRelativeFile) : [];
  for (const fileName of styles) {
    if (!Object.prototype.hasOwnProperty.call(files, fileName)) throw new Error(`Plugin stylesheet not found: ${fileName}`);
    if (!fileName.toLowerCase().endsWith('.css')) throw new Error(`Plugin stylesheet must be CSS: ${fileName}`);
  }
  const platformCheck=PlatformPresentation.validate(sourceManifest);
  if(!platformCheck.ok)throw new Error(`Plugin platform presentation contract failed: ${platformCheck.errors.join(' ')}`);
  let platformPresentation;
  if(sourceManifest.platformPresentation!==undefined){
    platformPresentation={};
    for(const platform of PlatformPresentation.platforms){
      const raw=sourceManifest.platformPresentation?.[platform]||{};
      const mode=String(raw.mode||'').trim().toLowerCase();
      const platformStyles=Array.isArray(raw.styles)?raw.styles.map(normalizeRelativeFile):[];
      const platformScripts=Array.isArray(raw.scripts)?raw.scripts.map(normalizeRelativeFile):[];
      for(const fileName of platformStyles){
        if(!Object.prototype.hasOwnProperty.call(files,fileName))throw new Error(`Plugin ${platform} presentation stylesheet not found: ${fileName}`);
        if(!fileName.toLowerCase().endsWith('.css'))throw new Error(`Plugin ${platform} presentation stylesheet must be CSS: ${fileName}`);
      }
      for(const fileName of platformScripts){
        if(!Object.prototype.hasOwnProperty.call(files,fileName))throw new Error(`Plugin ${platform} presentation script not found: ${fileName}`);
        if(!fileName.toLowerCase().endsWith('.js'))throw new Error(`Plugin ${platform} presentation script must be JavaScript: ${fileName}`);
      }
      platformPresentation[platform]={mode,...(platformStyles.length?{styles:[...new Set(platformStyles)]}:{}),...(platformScripts.length?{scripts:[...new Set(platformScripts)]}:{})};
    }
  }
  const platformStyleNames=platformPresentation?PlatformPresentation.platforms.flatMap(platform=>platformPresentation[platform]?.styles||[]):[];
  const layoutAudit=inspectWorkspaceStyles({apiVersion,pluginType,workspace:sourceManifest.workspace,ui:sourceManifest.ui||{},styles:[...new Set([...styles,...platformStyleNames])].map(name=>({name,content:files[name]}))});
  if(layoutAudit.errors.length)throw new Error(`Plugin layout contract failed: ${layoutAudit.errors.join(' ')}`);

  let windowSpec = sourceManifest.window;
  if(windowSpec!==undefined){
    if(!windowSpec||typeof windowSpec!=='object'||Array.isArray(windowSpec))throw new Error('Plugin manifest.window must be an object.');
    const activity=String(windowSpec.activity||'').trim();
    if(!validPluginId(activity))throw new Error(`Invalid plugin window activity: ${activity||'(empty)'}`);
    for(const field of ['prewarm','reuse'])if(windowSpec[field]!==undefined&&typeof windowSpec[field]!=='boolean')throw new Error(`Plugin window.${field} must be boolean.`);
    const persistence=String(windowSpec.persistence||'project').trim().toLowerCase();
    if(!['project','memory','none'].includes(persistence))throw new Error(`Unsupported plugin window persistence: ${persistence}`);
    const runtime=windowSpec.runtime?normalizeRelativeFile(windowSpec.runtime):'';
    if(runtime&&!Object.prototype.hasOwnProperty.call(files,runtime))throw new Error(`Plugin window runtime not found: ${runtime}`);
    const windowScripts=Array.isArray(windowSpec.scripts)?windowSpec.scripts.map(normalizeRelativeFile):[];
    for(const fileName of windowScripts){
      if(!Object.prototype.hasOwnProperty.call(files,fileName))throw new Error(`Plugin window script not found: ${fileName}`);
      if(!fileName.toLowerCase().endsWith('.js'))throw new Error(`Plugin window script must be JavaScript: ${fileName}`);
    }
    windowSpec={...windowSpec,activity,runtime:runtime||undefined,scripts:[...new Set(windowScripts)],persistence};
  }

  if(pluginType==='theme'){
    const requiresCore=Array.isArray(sourceManifest.requiresCore)?sourceManifest.requiresCore.map(String):[];
    if(!requiresCore.includes('ui.theme'))throw new Error('Theme plugins must declare ui.theme in requiresCore.');
    if(requiresCore.includes('ui.styles'))throw new Error('Theme plugins must use Theme Contract tokens instead of ui.styles.');
    if(styles.length)throw new Error('Theme plugins must not ship arbitrary stylesheets.');
    if(sourceManifest.platformPresentation!==undefined)throw new Error('Theme plugins must not declare platformPresentation; use Theme Contract tokens.');
    if(sourceManifest.workspace||windowSpec)throw new Error('Theme plugins must not own workspace or window contracts.');
    if(algorithmProvider)throw new Error('Theme plugins cannot be Algorithm Providers.');
    const themeSource=scripts.map(fileName=>files[fileName]||'').join('\n');
    if(!usesThemeRegister(themeSource))throw new Error('Theme plugins must register at least one profile through ctx.ui.theme.register(...) or a stable ctx.ui.theme alias.');
  }

  if(pluginType==='tool'){
    const workspace=sourceManifest.workspace&&typeof sourceManifest.workspace==='object'?sourceManifest.workspace:{};
    const role=String(workspace.role||'').trim().toLowerCase();
    const activity=String(workspace.activity||'').trim();
    if(role!=='top'||!validPluginId(activity))throw new Error('Tool plugins must declare workspace.role=top and a valid workspace.activity.');
    if(!windowSpec||String(windowSpec.activity||'')!==activity)throw new Error('Tool plugins must declare a dedicated window with the same activity as workspace.activity.');
  }

  const manifest = {
    ...sourceManifest,
    id,
    name,
    version,
    apiVersion,
    entry,
    pluginType,
    scripts: [...new Set(scripts)],
    styles: [...new Set(styles)],
    ...(tasks.length?{tasks}:{}),
    ...(platformPresentation!==undefined?{platformPresentation}:{}),
    ...(windowSpec!==undefined?{window:windowSpec}:{}),
    ...(sourceManifest.algorithmProvider!==undefined?{algorithmProvider}:{}),
    ...(algorithmCategories.length?{algorithmCategories}:{}),
    ...(algorithmProvides.length?{algorithmProvides}:{}),
    ...(pluginDependencies.length?{pluginDependencies}:{}),
    enabled: sourceManifest.enabled !== false
  };

  return {
    schema: PLUGIN_PACKAGE_SCHEMA,
    manifest,
    files,
    installedAt: pkg.installedAt || null
  };
}

function pluginPackageFileName(id) {
  if (!validPluginId(id)) throw new Error(`Invalid plugin id: ${id}`);
  return `${id}.dkplugin`;
}

module.exports = {
  PLUGIN_PACKAGE_SCHEMA,
  normalizePluginPackage,
  normalizeRelativeFile,
  pluginPackageFileName,
  validPluginId,
  referencedPluginAssets
};
