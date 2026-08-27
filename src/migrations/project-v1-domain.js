(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root){root.DKDSProjectV1DomainMigration=api;api.register(root.DKDSProjectFormat);}
})(typeof window!=='undefined'?window:globalThis,function(){
const DOMAIN_ROOT_FIELDS=Object.freeze([
  'scanVisibility','peaks','peakCategories','algorithms','peakDisplay','activeDetector','activeMetricAlgorithm','detectorSettings',
  'physicsShowLabels','spacingSettings','gateAnalysisSettings','transformPreviewByDataset',
  'terMaxSettings','terHeatmapDisplay','terTransformSettings','terAlgorithmRef','terMaxResult',
  'pulseAnalysis','panelLayout','trendColumns'
]);
  function migrate(project,context={}){
    const {FORMAT,SCHEMA_VERSION,clone,validateProject}=context;
    validateProject(project);
    const out=clone(project)||{};
    const plugins={...(out.plugins||{})};

    const resonanceLegacyKeys=[
      'scanVisibility','peaks','peakCategories','algorithms','peakDisplay','activeDetector','activeMetricAlgorithm','detectorSettings',
      'physicsShowLabels','spacingSettings','gateAnalysisSettings','transformPreviewByDataset'
    ];
    const resonanceLegacyPresent=resonanceLegacyKeys.some(key=>out[key]!==undefined);
    if(resonanceLegacyPresent){
      const plugin={...(plugins['builtin.resonance-workbench']||{})};
      const workspace={...(plugin.workspace||{})};
      const empty=value=>value===undefined||value===null||(Array.isArray(value)&&value.length===0)||(typeof value==='string'&&!value.trim())||(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===0);
      if(workspace.schema===undefined)workspace.schema=1;
      if(empty(workspace.datasetMeta)&&Array.isArray(out.datasets)&&out.datasets.length)workspace.datasetMeta=out.datasets.map(d=>({path:d.path,name:d.name,vg:d.vg}));
      for(const key of resonanceLegacyKeys){
        // Some intermediate builds wrote an empty namespaced workspace while the
        // authoritative legacy root still contained peaks/visibility/settings.
        // An empty placeholder must never erase meaningful legacy state.
        if(out[key]!==undefined&&(workspace[key]===undefined||(empty(workspace[key])&&!empty(out[key]))))workspace[key]=clone(out[key]);
      }
      if(Array.isArray(out.scanVisibility)&&out.scanVisibility.length){
        // Legacy projects used scanVisibility as an explicit accepted-data set:
        // imported auxiliary channels that were kept in the project payload but
        // never adopted by Resonance were absent from this list. Preserve that
        // meaning so those channels do not reappear as visible analysis data.
        workspace.legacyVisibilityExplicit=true;
        workspace.legacyVisibilityDatasetPaths=Array.isArray(out.datasets)?out.datasets.map(d=>String(d?.path||'')).filter(Boolean):[];
      }
      if(workspace.groupColumns===undefined&&out.trendColumns!==undefined){
        const n=String(out.trendColumns);
        workspace.groupColumns=['1','2','3','4','5','6'].includes(n)?n:'auto';
      }
      plugin.workspace=workspace;
      plugins['builtin.resonance-workbench']=plugin;
    }

    // Some legacy/intermediate files already stored Resonance state under the
    // plugin namespace but still used scanVisibility as the complete adopted
    // dataset set. Preserve that legacy meaning too; modern schema-v2 projects
    // keep the explicit compatibility marker once it has been migrated.
    const legacyContainer=String(out.format||'')!==FORMAT||Number(out.schemaVersion||0)<SCHEMA_VERSION;
    const resonanceVisibilityPlugin=plugins['builtin.resonance-workbench'];
    if(legacyContainer&&resonanceVisibilityPlugin?.workspace&&Array.isArray(resonanceVisibilityPlugin.workspace.scanVisibility)&&resonanceVisibilityPlugin.workspace.scanVisibility.length){
      resonanceVisibilityPlugin.workspace.legacyVisibilityExplicit=true;
      if(!Array.isArray(resonanceVisibilityPlugin.workspace.legacyVisibilityDatasetPaths)||!resonanceVisibilityPlugin.workspace.legacyVisibilityDatasetPaths.length){
        resonanceVisibilityPlugin.workspace.legacyVisibilityDatasetPaths=Array.isArray(out.datasets)?out.datasets.map(d=>String(d?.path||'')).filter(Boolean):[];
      }
      // Old self-contained projects could store auxiliary channels (for
      // example Ig) that were never adopted into analysis. Modern projects use
      // generic data assignments, so translate that old omission once here:
      // a dataset missing from the explicit legacy adoption list becomes
      // Data-Center-only instead of inheriting the modern '*' fallback.
      const adoptedPaths=new Set(resonanceVisibilityPlugin.workspace.scanVisibility.map(row=>String(Array.isArray(row)?row[0]:'')));
      if(Array.isArray(out.datasets))out.datasets=out.datasets.map(dataset=>{
        if(Object.prototype.hasOwnProperty.call(dataset||{},'assignments'))return dataset;
        const path=String(dataset?.path||dataset?.name||'');
        return path&&!adoptedPaths.has(path)?{...dataset,assignments:[]}:dataset;
      });
    }

    const terLegacyPresent=['terMaxSettings','terHeatmapDisplay','terTransformSettings','terAlgorithmRef','terMaxResult'].some(key=>out[key]!==undefined);
    if(terLegacyPresent){
      const plugin={...(plugins['builtin.ter-analysis']||{})};
      const workspace={...(plugin.workspace||{})};
      if(workspace.schema===undefined)workspace.schema=3;
      if(workspace.settings===undefined&&out.terMaxSettings!==undefined)workspace.settings=clone(out.terMaxSettings);
      if(workspace.display===undefined&&out.terHeatmapDisplay!==undefined)workspace.display=clone(out.terHeatmapDisplay);
      if(workspace.transform===undefined&&out.terTransformSettings!==undefined)workspace.transform=clone(out.terTransformSettings);
      if(workspace.algorithmRef===undefined){
        const ref=out.terAlgorithmRef??out.terMaxSettings?.algorithmRef;
        if(ref!==undefined)workspace.algorithmRef=clone(ref);
      }
      if(workspace.result===undefined&&out.terMaxResult!==undefined)workspace.result=clone(out.terMaxResult);
      plugin.workspace=workspace;
      plugins['builtin.ter-analysis']=plugin;
    }

    // v3.57 Resonance Gate analysis consumed TER root settings directly. Fold
    // that dependency into the Resonance slice once so current runtime code
    // never needs another plugin's private project state.
    const resonancePlugin=plugins['builtin.resonance-workbench'];
    const terWorkspace=plugins['builtin.ter-analysis']?.workspace;
    if(resonancePlugin?.workspace&&terWorkspace){
      const gate={...(resonancePlugin.workspace.gateAnalysisSettings||{})};
      if(gate.terSettings===undefined&&terWorkspace.settings!==undefined)gate.terSettings=clone(terWorkspace.settings);
      if(gate.terAlgorithmRef===undefined&&terWorkspace.algorithmRef!==undefined)gate.terAlgorithmRef=clone(terWorkspace.algorithmRef);
      resonancePlugin.workspace={...resonancePlugin.workspace,gateAnalysisSettings:gate};
      plugins['builtin.resonance-workbench']=resonancePlugin;
    }

    if(out.pulseAnalysis&&Array.isArray(out.pulseAnalysis.files)){
      const plugin={...(plugins['builtin.pulse-analysis']||{})};
      if(plugin.workspace===undefined)plugin.workspace=clone(out.pulseAnalysis);
      plugins['builtin.pulse-analysis']=plugin;
    }

    const host={...(out.host||{})};
    if(host.panelLayout===undefined&&out.panelLayout!==undefined)host.panelLayout=clone(out.panelLayout);
    if(host.trendColumns===undefined&&out.trendColumns!==undefined)host.trendColumns=clone(out.trendColumns);
    out.host=host;

    out.format=FORMAT;
    out.schemaVersion=SCHEMA_VERSION;
    out.plugins=plugins;
    for(const key of DOMAIN_ROOT_FIELDS)delete out[key];
    return validateProject(out);
  }

  const api={id:'legacy-domain-v1',fields:DOMAIN_ROOT_FIELDS,migrate,register(format){if(format?.registerMigration)format.registerMigration('legacy-domain-v1',migrate);return format;}};
  return api;
});
