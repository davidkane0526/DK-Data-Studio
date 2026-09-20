'use strict';
let activeController=null;
let progressRenderAt=0;
function begin(){const controller=new AbortController();activeController=controller;return controller;}
function abort(reason='import-workbench-closed'){if(activeController&&!activeController.signal.aborted)activeController.abort(reason);return !!activeController;}
function finish(controller){if(activeController===controller)activeController=null;}
function canStream(item,provider){return !!(item&&!item.residentSource&&typeof provider?.createStreamParser==='function'&&window.DKDSIO?.readDataLines);}
function acquisitionMetadata(artifact,item,sequenceIndex){
  const normalize=window.DKDSData?.normalizeAcquisition||((value)=>value&&typeof value==='object'?{...value}:{});
  const merged={...(item?.acquisition&&typeof item.acquisition==='object'?item.acquisition:{}),...(artifact?.source?.acquisition&&typeof artifact.source.acquisition==='object'?artifact.source.acquisition:{}),...(artifact?.acquisition&&typeof artifact.acquisition==='object'?artifact.acquisition:{}),...(artifact?.metadata?.acquisition&&typeof artifact.metadata.acquisition==='object'?artifact.metadata.acquisition:{})};
  const explicit=normalize(merged),hasExplicitSequence=Number.isInteger(explicit.sequenceIndex);
  if(!hasExplicitSequence){explicit.sequenceIndex=Math.max(0,Math.trunc(Number(sequenceIndex)||0));explicit.provenance='import-batch';}
  else if(!['source','import-batch','unknown'].includes(explicit.provenance))explicit.provenance='source';
  return explicit;
}
async function parseItem({item,provider,signal,render,readFull}){
  const requested=item.settings?.encoding||'auto';
  const file={name:item.name,path:item.path,text:String(item.text||''),encoding:item.detectedEncoding||requested,size:Number(item.size)||0,...(item.acquisition?{acquisition:item.acquisition}:{})};
  if(canStream(item,provider)){
    const parser=provider.createStreamParser(file,item.settings,item.inspection);
    if(parser&&typeof parser.pushLines==='function'&&typeof parser.finish==='function'){
      item.streaming=true;item.importProgress=0;render?.();
      const meta=await window.DKDSIO.readDataLines({path:item.path,encoding:requested,signal,onLines:async(lines,chunk)=>{
        await parser.pushLines(lines,chunk);
        const total=Math.max(1,Number(chunk?.totalSize)||Number(item.size)||1),done=Math.max(0,Number(chunk?.offset)||0)+Math.max(0,Number(chunk?.bytesRead)||0);
        item.importProgress=Math.max(0,Math.min(100,done/total*100));
        const now=Date.now();if(now-progressRenderAt>=220){progressRenderAt=now;render?.();}
      }});
      const result=await parser.finish(meta);
      item.streaming=false;item.importProgress=100;item.detectedEncoding=meta.encoding||item.detectedEncoding;item.size=Number(meta.size)||item.size;render?.();
      return result;
    }
  }
  await readFull();if(item.error)throw new Error(item.error);
  const fullFile={name:item.name,path:item.path,text:item.text,encoding:item.detectedEncoding,size:Number(item.size)||0,...(item.acquisition?{acquisition:item.acquisition}:{})};
  return Promise.resolve(provider.parseArtifacts(fullFile,item.settings));
}
module.exports=Object.freeze({begin,abort,finish,canStream,acquisitionMetadata,parseItem});
