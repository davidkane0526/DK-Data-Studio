'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/app/composition.json'),'utf8'));
const rows=Array.isArray(manifest.importableModules)?manifest.importableModules:[];
const moduleFiles=new Set(rows.map(row=>path.resolve(root,row.path)));
const sourceCache=new Map();
const exportCache=new Map();

function source(file){
  const key=path.resolve(file);
  if(!sourceCache.has(key))sourceCache.set(key,fs.readFileSync(key,'utf8'));
  return sourceCache.get(key);
}

function resolveLocal(fromFile,spec){
  if(!String(spec).startsWith('.'))return null;
  const base=path.resolve(path.dirname(fromFile),spec);
  for(const candidate of [base,`${base}.js`,path.join(base,'index.js')]){
    if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return fs.realpathSync(candidate);
  }
  return null;
}

function exportedNames(file,stack=new Set()){
  const real=fs.realpathSync(file);
  if(exportCache.has(real))return exportCache.get(real);
  assert(!stack.has(real),`Circular module.exports re-export while inspecting ${path.relative(root,real)}`);
  const nextStack=new Set(stack);nextStack.add(real);
  const text=source(real);
  const reexport=[...text.matchAll(/module\.exports\s*=\s*require\(\s*(['"])([^'"\n]+)\1\s*\)\s*;?/g)].pop();
  if(reexport){
    const target=resolveLocal(real,reexport[2]);
    assert(target,`${path.relative(root,real)} re-exports unresolved module ${reexport[2]}`);
    const names=exportedNames(target,nextStack);
    exportCache.set(real,names);
    return names;
  }
  const matches=[...text.matchAll(/module\.exports\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\)\s*;?/g)];
  assert(matches.length,`${path.relative(root,real)} must expose an explicit Object.freeze({...}) CommonJS contract or a direct re-export.`);
  const body=matches[matches.length-1][1];
  const names=new Set();
  for(const raw of body.split(',')){
    const token=raw.trim();
    if(!token)continue;
    const match=token.match(/^([A-Za-z_$][\w$]*)(?:\s*:|$)/);
    assert(match,`Unsupported export syntax in ${path.relative(root,real)}: ${token}`);
    names.add(match[1]);
  }
  exportCache.set(real,names);
  return names;
}

const requirements=[];
function addRequirement(fromFile,spec,name,kind){
  const target=resolveLocal(fromFile,spec);
  assert(target,`${path.relative(root,fromFile)} has unresolved local require ${spec}`);
  if(!moduleFiles.has(target))return;
  requirements.push({from:fs.realpathSync(fromFile),target,spec,name,kind});
}

for(const file of moduleFiles){
  const text=source(file);
  for(const match of text.matchAll(/require\(\s*(['"])(\.[^'"\n]+)\1\s*\)\s*(?:\?\.)?\.([A-Za-z_$][\w$]*)/g)){
    addRequirement(file,match[2],match[3],'direct');
  }
  for(const match of text.matchAll(/(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*require\(\s*(['"])(\.[^'"\n]+)\2\s*\)/g)){
    for(const raw of match[1].split(',')){
      const name=raw.trim().split(':')[0].trim();
      if(name)addRequirement(file,match[3],name,'destructure');
    }
  }
  for(const match of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*(['"])(\.[^'"\n]+)\2\s*\)\s*;?/g)){
    const alias=match[1],spec=match[3];
    const aliasPattern=new RegExp(`\\b${alias}\\s*(?:\\?\\.)?\\.([A-Za-z_$][\\w$]*)`,'g');
    for(const use of text.matchAll(aliasPattern))addRequirement(file,spec,use[1],'namespace');
  }
}

const missing=[];
for(const row of requirements){
  if(!exportedNames(row.target).has(row.name))missing.push(row);
}
assert.deepEqual(
  missing,
  [],
  `Application CommonJS export contract mismatch:\n${missing.map(row=>`- ${path.relative(root,row.from)} -> ${row.spec}.${row.name} (${row.kind}); target=${path.relative(root,row.target)}`).join('\n')}`
);

const importWorkbench=fs.realpathSync(path.join(root,'src/app/modules/import-workbench.js'));
const importConsumers=new Set(requirements.filter(row=>row.target===importWorkbench).map(row=>row.name));
assert(importConsumers.size>=20,'Import Workbench cross-module contract unexpectedly collapsed.');
for(const name of importConsumers){
  assert(exportedNames(importWorkbench).has(name),`Import Workbench must export ${name}.`);
}

const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.equal(pkg.version,'3.61.97','Application export-contract regression must ship as v3.61.97.');
console.log(`v3.61.91 Application module export-contract PASS (${requirements.length} cross-module symbol uses checked; ${importConsumers.size} Import Workbench exports consumed).`);
