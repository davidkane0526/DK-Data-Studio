'use strict';
const {getRegistry,addCleanup,registerContribution,listContributions}=require('../registry');


  const globallyUniqueRegistryKinds = new Set([
    'workflow.processors',
    'workflow.analyzers',
    'workflow.recipes',
    'charts.renderers',
    'data.importers',
    'analysis.providers',
    'peak.detectors',
    'ui.activities',
    'ui.inspectors',
    'ui.groupCharts',
    'ui.groupViews',
    'ui.mainViews',
    'ui.topWorkspaces'
  ]);

  function registerTypedContribution(pluginId, kind, id, value) {
    if (globallyUniqueRegistryKinds.has(kind)) {
      const existing = [...getRegistry(kind).values()].find(row => row.id === id);
      if (existing) {
        throw new Error(`Contribution id must be unique in ${kind}: ${id} is already owned by ${existing.pluginId}`);
      }
    }
    return registerContribution(pluginId, kind, id, value);
  }

  function providerCapabilityKind(kind){
    return kind==='workflow.processors'?'workflow.processor':kind==='workflow.analyzers'?'workflow.analyzer':kind==='charts.renderers'?'chart.renderer':'';
  }

  function registerProviderCapability(pluginId,kind,id,value){
    const capKind=providerCapabilityKind(kind);if(!capKind||!window.DKDSCapabilities)return;
    const methods={};
    if(typeof value?.run==='function')methods.run=value.run;
    if(typeof value?.buildSpec==='function')methods.buildSpec=value.buildSpec;
    if(!Object.keys(methods).length)return;
    const capId=`${capKind}:${id}`;
    window.DKDSCapabilities.register(pluginId,capId,{
      kind:capKind,title:value.name||id,version:value.version||'1.0.0',remote:true,
      metadata:{id,name:value.name||id,description:value.description||'',inputKinds:value.inputKinds||[],outputKinds:value.outputKinds||[],parameterSchema:value.parameterSchema||{fields:[]},pluginId},
      methods
    });
    addCleanup(pluginId,()=>window.DKDSCapabilities?.unregister?.(capId));
  }

  function capabilityBackedProviders(kind){
    const capKind=providerCapabilityKind(kind);if(!capKind)return [];
    return (window.DKDSCapabilities?.list?.(capKind)||[]).map(cap=>{
      const meta=cap.metadata||{};const id=String(meta.id||cap.id.split(':').slice(1).join(':'));
      const proxy=window.DKDSCapabilities.proxy(cap.id);
      const value={id,name:meta.name||cap.title,description:meta.description||'',version:cap.version||'1.0.0',pluginId:meta.pluginId||cap.owner,inputKinds:meta.inputKinds||[],outputKinds:meta.outputKinds||[],parameterSchema:meta.parameterSchema||{fields:[]},remote:true};
      if(cap.methods?.includes?.('run'))value.run=(payload)=>proxy.run(payload);
      if(cap.methods?.includes?.('buildSpec'))value.buildSpec=(payload)=>proxy.buildSpec(payload);
      return value;
    });
  }

  function listProvidersWithCapabilities(kind){
    const local=listContributions(kind).map(row=>row.value);const seen=new Set(local.map(row=>String(row.id)));
    for(const value of capabilityBackedProviders(kind))if(!seen.has(String(value.id))){local.push(value);seen.add(String(value.id));}
    return local;
  }

module.exports=Object.freeze({globallyUniqueRegistryKinds, registerTypedContribution, listContributions, providerCapabilityKind, registerProviderCapability, capabilityBackedProviders, listProvidersWithCapabilities});
