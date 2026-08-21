(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.DKDSProjectFormat=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const FORMAT='dk-data-studio-project';
  const SCHEMA_VERSION=2;
  const DOMAIN_ROOT_FIELDS=Object.freeze([
    'scanVisibility','peaks','peakCategories','algorithms','peakDisplay','activeDetector','activeMetricAlgorithm','detectorSettings',
    'physicsShowLabels','spacingSettings','gateAnalysisSettings','transformPreviewByDataset',
    'terMaxSettings','terHeatmapDisplay','terTransformSettings','terAlgorithmRef','terMaxResult',
    'pulseAnalysis','panelLayout'
  ]);

  function stripBom(text){
    const s=String(text??'');
    return s.charCodeAt(0)===0xFEFF?s.slice(1):s;
  }

  function asUint8(bytes){
    if(bytes instanceof Uint8Array)return bytes;
    if(bytes?.buffer instanceof ArrayBuffer)return new Uint8Array(bytes.buffer,bytes.byteOffset||0,bytes.byteLength);
    if(bytes instanceof ArrayBuffer)return new Uint8Array(bytes);
    return new Uint8Array(bytes||[]);
  }

  function decodeProjectBytes(input){
    const bytes=asUint8(input);
    if(!bytes.length)return {text:'',encoding:'empty'};
    let offset=0;
    let encoding='utf-8';
    if(bytes.length>=3&&bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF){
      offset=3;encoding='utf-8';
    }else if(bytes.length>=2&&bytes[0]===0xFF&&bytes[1]===0xFE){
      offset=2;encoding='utf-16le';
    }else if(bytes.length>=2&&bytes[0]===0xFE&&bytes[1]===0xFF){
      offset=2;encoding='utf-16be';
    }else if(bytes.length>=4){
      let evenNull=0,oddNull=0,samples=0;
      const limit=Math.min(bytes.length,256);
      for(let i=0;i+1<limit;i+=2){
        if(bytes[i]===0)evenNull++;
        if(bytes[i+1]===0)oddNull++;
        samples++;
      }
      if(samples&&oddNull/samples>0.55)encoding='utf-16le';
      else if(samples&&evenNull/samples>0.55)encoding='utf-16be';
    }
    try{
      const text=new TextDecoder(encoding,{fatal:true}).decode(bytes.subarray(offset));
      return {text:stripBom(text),encoding};
    }catch(err){
      if(encoding!=='utf-8')throw new Error(`工程文件编码无法解析（检测为 ${encoding}）`);
      const text=new TextDecoder('utf-8',{fatal:false}).decode(bytes.subarray(offset));
      return {text:stripBom(text),encoding:'utf-8'};
    }
  }

  function clone(value){
    if(value===undefined)return undefined;
    try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}
  }

  function validateProject(project){
    if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('文件内容不是 DK Data Studio 工程对象');
    if(project.datasets!==undefined&&!Array.isArray(project.datasets))throw new Error('工程字段 datasets 损坏：应为数组');
    if(project.plugins!==undefined&&(project.plugins===null||typeof project.plugins!=='object'||Array.isArray(project.plugins))){
      throw new Error('工程字段 plugins 损坏：应为对象');
    }
    if(project.host!==undefined&&(project.host===null||typeof project.host!=='object'||Array.isArray(project.host))){
      throw new Error('工程字段 host 损坏：应为对象');
    }
    return project;
  }

  function migrateLegacyProject(project){
    validateProject(project);
    const out=clone(project)||{};
    const plugins={...(out.plugins||{})};

    const resonanceLegacyPresent=[
      'scanVisibility','peaks','peakCategories','algorithms','peakDisplay','activeDetector','activeMetricAlgorithm','detectorSettings',
      'physicsShowLabels','spacingSettings','gateAnalysisSettings','transformPreviewByDataset'
    ].some(key=>out[key]!==undefined);
    if(resonanceLegacyPresent){
      const plugin={...(plugins['builtin.resonance-workbench']||{})};
      const workspace={...(plugin.workspace||{})};
      if(workspace.schema===undefined)workspace.schema=1;
      if(workspace.datasetMeta===undefined&&Array.isArray(out.datasets))workspace.datasetMeta=out.datasets.map(d=>({path:d.path,name:d.name,vg:d.vg}));
      for(const key of ['scanVisibility','peaks','peakCategories','algorithms','peakDisplay','activeDetector','activeMetricAlgorithm','detectorSettings','physicsShowLabels','spacingSettings','gateAnalysisSettings','transformPreviewByDataset']){
        if(workspace[key]===undefined&&out[key]!==undefined)workspace[key]=clone(out[key]);
      }
      plugin.workspace=workspace;
      plugins['builtin.resonance-workbench']=plugin;
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
    out.host=host;

    out.format=FORMAT;
    out.schemaVersion=SCHEMA_VERSION;
    out.plugins=plugins;
    for(const key of DOMAIN_ROOT_FIELDS)delete out[key];
    return validateProject(out);
  }

  function parseProjectText(text){
    const clean=stripBom(text).trim();
    if(!clean)throw new Error('工程文件为空');
    let project;
    try{project=JSON.parse(clean);}
    catch(err){
      const detail=String(err?.message||err).replace(/^JSON\.parse:\s*/i,'');
      throw new Error(`工程 JSON 不完整或格式错误：${detail}`);
    }
    return migrateLegacyProject(project);
  }

  function parseProjectBytes(bytes){
    const decoded=decodeProjectBytes(bytes);
    return {project:parseProjectText(decoded.text),encoding:decoded.encoding};
  }

  function canonicalizeProject(project){
    return migrateLegacyProject(project);
  }

  function serializeProject(project,space=2){
    const canonical=canonicalizeProject(project);
    let text;
    try{text=JSON.stringify(canonical,null,space);}
    catch(err){throw new Error(`工程无法序列化：${err?.message||err}`);}
    // Parse the exact payload we are about to write so desktop and web use the
    // same canonical project contract.
    parseProjectText(text);
    return text;
  }

  return {FORMAT,SCHEMA_VERSION,DOMAIN_ROOT_FIELDS,stripBom,decodeProjectBytes,validateProject,migrateLegacyProject,canonicalizeProject,parseProjectText,parseProjectBytes,serializeProject};
});
