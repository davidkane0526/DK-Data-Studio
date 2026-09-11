'use strict';
const {registries,cleanupByPlugin}=require('./context');

function assertId(id,what='id'){
  if(!/^[a-z0-9][a-z0-9._-]*$/i.test(String(id||'')))throw new Error(`Invalid plugin ${what}: ${id}`);
}
function getRegistry(kind){
  if(!registries.has(kind))registries.set(kind,new Map());
  return registries.get(kind);
}
function addCleanup(pluginId,fn){
  if(typeof fn!=='function')return fn;
  if(!cleanupByPlugin.has(pluginId))cleanupByPlugin.set(pluginId,[]);
  cleanupByPlugin.get(pluginId).push(fn);
  return fn;
}
function registerContribution(pluginId,kind,id,value){
  assertId(kind,'registry kind');assertId(id,'contribution id');
  const reg=getRegistry(kind),key=`${pluginId}:${id}`;
  if(reg.has(key))throw new Error(`Contribution already registered: ${kind}/${pluginId}:${id}`);
  reg.set(key,{pluginId,id,value});
  return addCleanup(pluginId,()=>reg.delete(key));
}
function listContributions(kind){return [...getRegistry(kind).values()];}

module.exports=Object.freeze({assertId,getRegistry,addCleanup,registerContribution,listContributions});
