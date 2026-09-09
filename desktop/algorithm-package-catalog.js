'use strict';
const VERSION='2.0.0';

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
function requirements(manifest={},installedIds=new Set()){
  const ids=installedIds instanceof Set?installedIds:new Set(Array.isArray(installedIds)?installedIds:Object.keys(installedIds||{}));
  const dependencies=(Array.isArray(manifest.pluginDependencies)?manifest.pluginDependencies:[]).map(row=>String(row?.id||'').trim()).filter(Boolean);
  const missing=dependencies.filter(id=>!ids.has(id));
  return {ready:missing.length===0,dependencies,missing};
}
function compareVersionText(a,b){
  const parse=value=>{const m=String(value||'').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);return m?[Number(m[1]),Number(m[2]),Number(m[3]),String(m[4]||'')]:[0,0,0,String(value||'')];};
  const x=parse(a),y=parse(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;if(x[3]===y[3])return 0;if(!x[3])return 1;if(!y[3])return -1;return x[3]>y[3]?1:-1;
}
function catalog(packages=[],ref={},installedIds=new Set()){
  const wanted=normalizeRef(ref),rows=[];
  for(const pkg of packages){const manifest=pkg?.manifest||{};for(const algorithm of manifestAlgorithms(manifest)){
    if(wanted.category&&algorithm.category!==wanted.category)continue;if(wanted.id&&algorithm.id!==wanted.id)continue;if(wanted.version&&algorithm.version!==wanted.version)continue;
    const requirementState=requirements(manifest,installedIds),source=clean(pkg.source)||'unknown';
    rows.push({source,pluginId:clean(manifest.id),pluginName:clean(manifest.name||manifest.id),packageVersion:clean(manifest.version),algorithm,ready:requirementState.ready,dependencies:requirementState.dependencies,missingDependencies:requirementState.missing,current:pkg.current===true,installed:pkg.installed===true,recoverable:requirementState.ready});
  }}
  const sourceOrder={external:0,override:1,builtin:2};
  rows.sort((a,b)=>(Number(b.ready)-Number(a.ready))||(Number(b.current)-Number(a.current))||((sourceOrder[a.source]??9)-(sourceOrder[b.source]??9))||compareVersionText(b.packageVersion,a.packageVersion));
  return {version:VERSION,requested:wanted,count:rows.length,candidates:rows};
}
module.exports={VERSION,normalizeRef,manifestAlgorithms,requirements,catalog};
