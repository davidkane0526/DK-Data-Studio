(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.DKDSProjectFormat=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const FORMAT='dk-data-studio-project';
  const SCHEMA_VERSION=1;

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

  function validateProject(project){
    if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('文件内容不是 DK Data Studio 工程对象');
    if(project.datasets!==undefined&&!Array.isArray(project.datasets))throw new Error('工程字段 datasets 损坏：应为数组');
    if(project.scanVisibility!==undefined&&!Array.isArray(project.scanVisibility))throw new Error('工程字段 scanVisibility 损坏：应为数组');
    if(project.peaks!==undefined&&!Array.isArray(project.peaks))throw new Error('工程字段 peaks 损坏：应为数组');
    if(project.plugins!==undefined&&(project.plugins===null||typeof project.plugins!=='object'||Array.isArray(project.plugins))){
      throw new Error('工程字段 plugins 损坏：应为对象');
    }
    return project;
  }

  function migrateLegacyProject(project){
    const out=validateProject(project);
    // Historical DKDS builds stored Pulse / Read state at the project root.
    // Mirror it into the plugin namespace in memory only. The root payload is
    // deliberately kept intact so old and new builds can round-trip the file.
    if(out.pulseAnalysis&&Array.isArray(out.pulseAnalysis.files)){
      const plugins={...(out.plugins||{})};
      const pulse={...(plugins['builtin.pulse-analysis']||{})};
      if(pulse.workspace===undefined)pulse.workspace=out.pulseAnalysis;
      plugins['builtin.pulse-analysis']=pulse;
      out.plugins=plugins;
    }
    return out;
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

  function serializeProject(project,space=2){
    validateProject(project);
    let text;
    try{text=JSON.stringify(project,null,space);}
    catch(err){throw new Error(`工程无法序列化：${err?.message||err}`);}
    // Validate the exact bytes we are about to write/download. This adds a
    // guardrail without altering DKDS's self-contained project schema.
    parseProjectText(text);
    return text;
  }

  return {FORMAT,SCHEMA_VERSION,stripBom,decodeProjectBytes,validateProject,migrateLegacyProject,parseProjectText,parseProjectBytes,serializeProject};
});
