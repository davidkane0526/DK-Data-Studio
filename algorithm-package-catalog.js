'use strict';
const SemverCompat=require('./semver-compat');
const VERSION='1.0.0';

const clean=v=>String(v||'').trim();
function normalizeRef(ref={}){
  if(typeof ref==='string'){
    const text=clean(ref),slash=text.indexOf('/'),at=text.lastIndexOf('@');
    if(slash>0){const category=text.slice(0,slash),tail=text.slice(slash+1);const tailAt=tail.lastIndexOf('@');return {category,id:tailAt>0?tail.slice(0,tailAt):tail,version:tailAt>0?tail.slice(tailAt+1):''};}
    return {category:'',id:at>0?text.slice(0,at):text,version:at>0?text.slice(at+1):''};
  }
  return {category:clean(ref.category),id:clean(ref.id||ref.algorithmId),version:clean(ref.version||ref.algorithmVersion)};
}
function normalizeProvide(row={}){return {category:clean(row.category),id:clean(row.id||row.algorithmId),version:clean(row.version||row.algorithmVersion),title:clean(row.title||row.name)};}
function manifestAlgorithms(manifest={}){return (Array.isArray(manifest.algorithmProvides)?manifest.algorithmProvides:[]).map(normalizeProvide).filter(row=>row.category&&row.id&&row.version);}
function compatibility(manifest={},env={}){
  const appVersion=clean(env.appVersion),pluginApiVersion=clean(env.pluginApiVersion),installedVersions=env.installedVersions instanceof Map?env.installedVersions:new Map(Object.entries(env.installedVersions||{}));
  const appRange=clean(manifest.compatibility?.app)||'*',pluginApiRange=clean(manifest.compatibility?.pluginApi)||'*';const issues=[];
  if(appVersion&&!SemverCompat.satisfies(appVersion,appRange))issues.push({kind:'app',required:appRange,actual:appVersion});
  if(pluginApiVersion&&!SemverCompat.satisfies(pluginApiVersion,pluginApiRange))issues.push({kind:'plugin-api',required:pluginApiRange,actual:pluginApiVersion});
  const dependencies=[];
  for(const dep of (Array.isArray(manifest.pluginDependencies)?manifest.pluginDependencies:[])){
    const id=clean(dep.id),range=clean(dep.range)||'*',actual=clean(installedVersions.get(id)),optional=dep.optional===true,satisfied=!!actual?SemverCompat.satisfies(actual,range):optional;
    dependencies.push({id,range,actual,optional,satisfied});if(!satisfied)issues.push({kind:'plugin-dependency',id,required:range,actual:actual||''});
  }
  return {compatible:issues.length===0,appRange,pluginApiRange,dependencies,issues};
}
function catalog(packages=[],ref={},env={}){
  const wanted=normalizeRef(ref),rows=[];
  for(const pkg of packages){const manifest=pkg?.manifest||{};for(const algorithm of manifestAlgorithms(manifest)){
    if(wanted.category&&algorithm.category!==wanted.category)continue;if(wanted.id&&algorithm.id!==wanted.id)continue;if(wanted.version&&algorithm.version!==wanted.version)continue;
    const compat=compatibility(manifest,env);
    const source=clean(pkg.source)||'unknown',recoverAction=source==='history'?'rollback':source==='override'?'restart':(source==='builtin'||source==='external'?'reload':'none');rows.push({source,pluginId:clean(manifest.id),pluginName:clean(manifest.name||manifest.id),packageVersion:clean(manifest.version),token:clean(pkg.token),algorithm,compatibility:compat,compatible:compat.compatible,current:pkg.current===true,installed:pkg.installed===true,recoverAction,recoverable:compat.compatible&&recoverAction!=='none'&&recoverAction!=='restart'});
  }}
  const sourceOrder={external:0,override:1,builtin:2,history:3};
  rows.sort((a,b)=>(Number(b.compatible)-Number(a.compatible))||(Number(b.current)-Number(a.current))||((sourceOrder[a.source]??9)-(sourceOrder[b.source]??9))||SemverCompat.compare(b.packageVersion,a.packageVersion));
  return {version:VERSION,requested:wanted,count:rows.length,candidates:rows};
}
module.exports={VERSION,normalizeRef,manifestAlgorithms,compatibility,catalog};
