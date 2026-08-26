'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const MAX_MODULE_BYTES=48*1024;

function jsString(value){return JSON.stringify(String(value));}
function validateRuntimeName(value,dirRel){
  const name=String(value||'').trim();
  if(!name)return '';
  if(!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))throw new Error(`${dirRel}/composition.json has invalid moduleRuntimeName.`);
  return name;
}
function bundleImportableModules(dirRel,manifest){
  const rows=Array.isArray(manifest.importableModules)?manifest.importableModules:[];
  if(!rows.length)return '';
  const runtimeName=validateRuntimeName(manifest.moduleRuntimeName,dirRel);
  if(!runtimeName)throw new Error(`${dirRel}/composition.json must declare moduleRuntimeName when importableModules are used.`);
  const ids=new Set();
  const factories=[];
  for(const row of rows){
    const id=String(row?.id||'').trim(),rel=String(row?.path||'').trim();
    if(!id||!rel)throw new Error(`${dirRel}/composition.json importableModules require id and path.`);
    if(ids.has(id))throw new Error(`${dirRel}/composition.json contains duplicate importable module id: ${id}`);
    ids.add(id);
    const file=path.join(root,rel),normalized=path.normalize(file);
    if(!normalized.startsWith(path.join(root,'src')+path.sep))throw new Error(`${dirRel} importable module must stay under src/: ${rel}`);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new Error(`${dirRel} importable module missing: ${rel}`);
    const bytes=fs.statSync(file).size;
    if(bytes>MAX_MODULE_BYTES)throw new Error(`${rel} is ${bytes} bytes; split importable runtime modules above ${MAX_MODULE_BYTES} bytes.`);
    const source=fs.readFileSync(file,'utf8');
    factories.push(`    ${jsString(id)}:function(module,exports,require){\n${source.split('\n').map(line=>'      '+line).join('\n')}\n    }`);
  }
  return `const ${runtimeName}=(()=>{\n  const factories={\n${factories.join(',\n')}\n  };\n  const cache=Object.create(null);\n  const normalize=id=>String(id||'').replace(/\\\\/g,'/').replace(/\\.js$/,'');\n  const resolve=(request,parent='')=>{\n    const raw=normalize(request);if(!raw.startsWith('.'))return raw;\n    const parts=normalize(parent).split('/');parts.pop();\n    for(const part of raw.split('/')){if(!part||part==='.')continue;if(part==='..')parts.pop();else parts.push(part);}\n    return parts.join('/');\n  };\n  const load=(request,parent='')=>{\n    const id=resolve(request,parent);if(cache[id])return cache[id].exports;const factory=factories[id];if(!factory)throw new Error('Unknown DKDS importable module: '+id);\n    const module={exports:{}};cache[id]=module;factory(module,module.exports,child=>load(child,id));return module.exports;\n  };\n  return Object.freeze({require:id=>load(id),ids:Object.freeze(Object.keys(factories))});\n})();\n`;
}

function buildCompositionSource(dirRel){
  const dir=path.join(root,dirRel);
  const manifestPath=path.join(dir,'composition.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const modules=Array.isArray(manifest.modules)?manifest.modules.map(String):[];
  const output=String(manifest.output||'').trim();
  const entryModule=String(manifest.entryModule||'').trim();
  if(!output||(!modules.length&&!entryModule))throw new Error(`${dirRel}/composition.json must declare output and at least one composition module or entryModule.`);
  if(new Set(modules).size!==modules.length)throw new Error(`${dirRel}/composition.json contains duplicate modules.`);
  const discovered=fs.readdirSync(dir).filter(name=>name.endsWith('.inc')).sort();
  const declared=[...modules].sort();
  if(JSON.stringify(discovered)!==JSON.stringify(declared))throw new Error(`${dirRel}/composition.json must list every .inc module exactly once.`);
  const chunks=modules.map(name=>{const file=path.join(dir,name),bytes=fs.statSync(file).size;if(bytes>MAX_MODULE_BYTES)throw new Error(`${dirRel}/${name} is ${bytes} bytes; split composition modules above ${MAX_MODULE_BYTES} bytes.`);return fs.readFileSync(file,'utf8');});
  const importableRows=Array.isArray(manifest.importableModules)?manifest.importableModules:[];
  if(entryModule&&!importableRows.some(row=>String(row?.id||'').trim()===entryModule))throw new Error(`${dirRel}/composition.json entryModule is not declared in importableModules: ${entryModule}`);
  const importableBundle=bundleImportableModules(dirRel,manifest);
  const runtimeName=entryModule?validateRuntimeName(manifest.moduleRuntimeName,dirRel):'';
  const entrySource=entryModule?`${runtimeName}.require(${jsString(entryModule)});\n`:'';
  const source=importableBundle+chunks.join('')+entrySource;
  const moduleCount=importableRows.length;
  return {source,manifest,modules,moduleCount,entryModule,output};
}

function writeComposition(dirRel){
  const built=buildCompositionSource(dirRel);
  const out=path.join(root,built.output);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,built.source,'utf8');
  console.log(`Generated ${built.output} from ${built.modules.length} composition modules + ${built.moduleCount} importable modules (${Buffer.byteLength(built.source)} bytes).`);
  return built;
}

if(require.main===module)for(const dir of ['src/core/ui/composition','src/core/plugins/kernel','src/app'])writeComposition(dir);

module.exports=Object.freeze({MAX_MODULE_BYTES,buildCompositionSource,writeComposition});
