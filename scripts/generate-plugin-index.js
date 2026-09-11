const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PlatformPresentation=require('../sdk/platform-presentation-contract');

const root = path.resolve(__dirname, '..');
const pluginsDir = path.join(root, 'src', 'plugins');
const outPath = path.join(root, 'src', 'generated', 'plugin-index.js');

function buildPluginIndexSource(){
  const plugins = [];
  for (const name of fs.readdirSync(pluginsDir).sort()) {
    if (name.startsWith('_')) continue;
    const dir = path.join(pluginsDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const manifestPath = path.join(dir, 'plugin.json');
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.enabled === false) continue;
    const normalizeFile = raw => {
      const file=String(raw||'').replace(/\\/g,'/').replace(/^\.\//,'');
      if(!file||file.startsWith('/')||file.includes('..')) throw new Error(`Unsafe built-in plugin script path: ${name}/${raw}`);
      return file;
    };
    const presentationCheck=PlatformPresentation.validate(manifest);
    if(!presentationCheck.ok)throw new Error(`${name}/plugin.json platform presentation contract failed: ${presentationCheck.errors.join(' ')}`);
    const entry = normalizeFile(manifest.entry);
    const scriptFiles = Array.isArray(manifest.scripts)&&manifest.scripts.length ? manifest.scripts.map(normalizeFile) : [entry];
    const styleFiles = Array.isArray(manifest.styles) ? manifest.styles.map(normalizeFile) : [];
    if(Array.isArray(manifest.scripts)&&manifest.scripts.length&&!scriptFiles.includes(entry))throw new Error(`Built-in plugin scripts must include entry: ${name}/${entry}`);
    for(const file of scriptFiles){
      const target=path.join(dir,file);
      if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`Built-in plugin script missing: ${name}/${file}`);
    }
    const styleSources=styleFiles.map(file=>({file,css:fs.readFileSync(path.join(dir,file),'utf8')}));
    const taskRows=Array.isArray(manifest.tasks)?manifest.tasks:[];
    const taskFiles=[...new Set(taskRows.flatMap(row=>[row?.entry,...(Array.isArray(row?.imports)?row.imports:[])]).filter(Boolean).map(normalizeFile))];
    const taskSources=Object.fromEntries(taskFiles.map(file=>{
      const target=path.join(dir,file);
      if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`Built-in plugin task source missing: ${name}/${file}`);
      return [file,fs.readFileSync(target,'utf8')];
    }));
    // Built-in Worker tasks may depend on canonical Core science modules. Keep
    // that dependency internal to the build/runtime transport rather than
    // teaching plugin manifests about application file URLs. A task source can
    // declare exact canonical modules with:
    //   @dkds-core-task-source science/common.js science/presets.js
    // The generator embeds the authoritative source bytes and Task Runtime
    // composes them into the same Worker blob before plugin task code.
    const taskCoreSources={};
    for(const task of taskRows){
      const taskId=String(task?.id||'').trim();if(!taskId)continue;
      const refs=[];
      for(const file of [task?.entry,...(Array.isArray(task?.imports)?task.imports:[])].filter(Boolean).map(normalizeFile)){
        const source=String(taskSources[file]||'');
        for(const match of source.matchAll(/@dkds-core-task-source\s+([^\n*]+)/g)){
          for(const raw of String(match[1]||'').split(/[\s,]+/).filter(Boolean)){
            const rel=String(raw).replace(/\\/g,'/').replace(/^\.\//,'');
            if(!/^science\/[A-Za-z0-9._-]+\.js$/.test(rel))throw new Error(`Unsafe Core task source path: ${name}/${file} -> ${raw}`);
            if(!refs.includes(rel))refs.push(rel);
          }
        }
      }
      if(refs.length)taskCoreSources[taskId]=refs.map(file=>{
        const target=path.join(root,'src',file);
        if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`Core task source missing: src/${file}`);
        return {file,source:fs.readFileSync(target,'utf8')};
      });
    }
    const platformScripts={},platformStyleSources={};
    for(const platform of PlatformPresentation.platforms){
      const assets=PlatformPresentation.assetsFor(manifest,platform);
      const platformScriptFiles=(assets.platformScripts||[]).map(normalizeFile);
      for(const file of platformScriptFiles){
        const target=path.join(dir,file);
        if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`Built-in plugin platform script missing: ${name}/${file}`);
      }
      platformScripts[platform]=platformScriptFiles.map(file=>`plugins/${name}/${file}`);
      platformStyleSources[platform]=(assets.platformStyles||[]).map(normalizeFile).map(file=>({file,css:fs.readFileSync(path.join(dir,file),'utf8')}));
    }
    plugins.push({id:String(manifest.id||''),source:'builtin',entry:`plugins/${name}/${entry}`,scripts:[...new Set(scriptFiles)].map(file=>`plugins/${name}/${file}`),styleSources,taskSources,taskCoreSources,platformScripts,platformStyleSources,manifest:{...manifest}});
  }

  const entries=plugins.map(row=>row.entry);
  const appVersion=String(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version||'');
  const catalogDigest=crypto.createHash('sha256').update(JSON.stringify(plugins)).digest('hex');
  const meta={schema:1,appVersion,count:plugins.length,catalogDigest};
  const source = `// AUTO-GENERATED by scripts/generate-plugin-index.js. Do not edit.\n`
    + `window.DKDS_BUILTIN_PLUGIN_INDEX_META = Object.freeze(${JSON.stringify(meta)});\n`
    + `window.DKDS_BUILTIN_PLUGINS = ${JSON.stringify(plugins, null, 2)};\n`
    + `window.DKDS_BUILTIN_PLUGIN_ENTRIES = ${JSON.stringify(entries, null, 2)};\n`;
  return Object.freeze({plugins,entries,meta,source});
}

function writePluginIndex(){
  const built=buildPluginIndexSource();
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath, built.source, 'utf8');
  console.log(`Generated ${path.relative(root, outPath)} with ${built.plugins.length} plugin entries for app ${built.meta.appVersion}.`);
  return built;
}

if(require.main===module)writePluginIndex();
module.exports=Object.freeze({buildPluginIndexSource,writePluginIndex});
