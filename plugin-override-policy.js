'use strict';

const SemverCompat=require('./semver-compat');

function manifestOf(value){return value?.manifest&&typeof value.manifest==='object'?value.manifest:value||{};}
function versionMap(builtins=[]){
  const map=new Map();
  for(const row of (Array.isArray(builtins)?builtins:[])){
    const manifest=manifestOf(row),id=String(manifest?.id||'').trim();
    if(id)map.set(id,String(manifest?.version||'0.0.0'));
  }
  return map;
}
function isNewerThanBuiltin(pkg,builtinVersion){
  const overrideVersion=String(pkg?.manifest?.version||'0.0.0');
  return SemverCompat.compare(overrideVersion,String(builtinVersion||'0.0.0'))>0;
}
function classify(packages=[],builtins=[]){
  const versions=versionMap(builtins),active=[],shadowed=[];
  for(const pkg of (Array.isArray(packages)?packages:[])){
    const id=String(pkg?.manifest?.id||'').trim(),builtinVersion=versions.get(id)||'';
    if(!builtinVersion||isNewerThanBuiltin(pkg,builtinVersion)){
      active.push(pkg);
      continue;
    }
    shadowed.push({...pkg,effective:false,shadowedByBuiltinVersion:builtinVersion,shadowReason:'bundled-plugin-is-same-or-newer'});
  }
  return {active,shadowed};
}

module.exports={versionMap,isNewerThanBuiltin,classify};
