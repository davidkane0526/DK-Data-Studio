(() => {
  if (window.DKDSIO) return;

  const VERSION = '1.1.0';
  const ownerScopes = new Map();
  let host = {};
  const bridge = () => window.electronAPI || {};
  const escCsv = value => {
    const text=String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text;
  };
  const safeName=(value,fallback='export')=>String(value||fallback).replace(/[\\/:*?"<>|]+/g,'_').trim()||fallback;

  function configure(next={}) { host = next || {}; }
  function requireMethod(name){
    const fn=bridge()?.[name];
    if(typeof fn!=='function')throw new Error(`I/O bridge method unavailable: ${name}`);
    return fn.bind(bridge());
  }
  async function saveText(options={}){
    return requireMethod('saveText')({
      defaultName:safeName(options.defaultName||'export.txt','export.txt'),
      content:String(options.content??''),
      filters:Array.isArray(options.filters)?options.filters:undefined,
      source:String(options.source||'core.io.saveText')
    });
  }
  async function saveBase64(options={}){
    return requireMethod('saveBase64')({
      defaultName:safeName(options.defaultName||'export.bin','export.bin'),
      base64:String(options.base64||''),
      mimeType:String(options.mimeType||'application/octet-stream'),
      filters:Array.isArray(options.filters)?options.filters:undefined,
      source:String(options.source||'core.io.saveBase64')
    });
  }
  async function openDataFiles(options={}){
    const fn=bridge()?.openDataFiles;
    if(typeof fn!=='function')throw new Error('Data-file picker is unavailable in this host.');
    return fn(options);
  }
  const DATA_READ_CHUNK_BYTES=256*1024;
  const DATA_READ_DESKTOP_IN_FLIGHT=2;
  const DATA_READ_MOBILE_IN_FLIGHT=1;
  function dataReadPolicy(){
    const doc=typeof document!=='undefined'?document:null,mobile=doc?.documentElement?.classList?.contains('react-native-client')||doc?.body?.classList?.contains('react-native-client')||false;
    return Object.freeze({chunkBytes:DATA_READ_CHUNK_BYTES,maxInFlight:mobile?DATA_READ_MOBILE_IN_FLIGHT:DATA_READ_DESKTOP_IN_FLIGHT});
  }
  function abortError(reason='Data read aborted.'){
    try{return new DOMException(String(reason||'Data read aborted.'),'AbortError');}
    catch{const err=new Error(String(reason||'Data read aborted.'));err.name='AbortError';return err;}
  }
  function assertNotAborted(signal){if(signal?.aborted)throw abortError(signal.reason);}
  function base64Bytes(base64){
    const bin=atob(String(base64||'')),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return bytes;
  }
  function normalizeTextEncoding(value='auto'){
    const raw=String(value||'auto').trim().toLowerCase().replace(/_/g,'-');
    if(raw==='auto')return 'auto';
    if(raw==='utf8'||raw==='utf-8')return 'utf-8';
    if(raw==='utf16'||raw==='utf-16'||raw==='utf16le'||raw==='utf-16le')return 'utf-16le';
    if(raw==='utf16be'||raw==='utf-16be')return 'utf-16be';
    if(raw==='gbk'||raw==='gb2312'||raw==='gb-18030'||raw==='gb18030')return 'gb18030';
    return raw;
  }
  function detectTextEncoding(bytes,requested='auto'){
    const fixed=normalizeTextEncoding(requested);
    if(fixed!=='auto')return fixed;
    if(bytes?.length>=3&&bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)return 'utf-8';
    if(bytes?.length>=2&&bytes[0]===0xff&&bytes[1]===0xfe)return 'utf-16le';
    if(bytes?.length>=2&&bytes[0]===0xfe&&bytes[1]===0xff)return 'utf-16be';
    try{new TextDecoder('utf-8',{fatal:true}).decode(bytes||new Uint8Array(),{stream:true});return 'utf-8';}
    catch{return 'gb18030';}
  }
  async function readDataChunks(options={}){
    const api=bridge(),open=api?.openDataRead,read=api?.readDataChunk,close=api?.closeDataRead;
    if(typeof open!=='function'||typeof read!=='function'||typeof close!=='function')throw new Error('Bounded data-read bridge is unavailable in this host.');
    const path=String(options.path||'').trim();if(!path)throw new Error('Data read path is required.');
    const signal=options.signal||null,onChunk=typeof options.onChunk==='function'?options.onChunk:null;
    assertNotAborted(signal);
    const session=await open.call(api,{path});
    const token=String(session?.token||'');if(!token)throw new Error('Host did not return a data-read token.');
    let totalSize=Math.max(0,Number(session?.size)||0);const knownSize=totalSize>0,policy=dataReadPolicy(),hostMax=Math.max(1,Number(session?.maxChunkBytes)||policy.chunkBytes);
    const chunkBytes=Math.max(1,Math.min(policy.chunkBytes,hostMax));
    const boundedMax=options.maxBytes==null?Infinity:Math.max(0,Number(options.maxBytes)||0),targetBytes=knownSize?Math.min(totalSize,boundedMax):boundedMax;
    const maxInFlight=Math.max(1,Math.min(policy.maxInFlight,Number.isFinite(targetBytes)?Math.ceil(Math.max(1,targetBytes)/chunkBytes):policy.maxInFlight));
    let nextOffset=0,bytesRead=0,chunks=0,closed=false,hitEof=false;
    const pending=new Map();
    const schedule=()=>{
      while(nextOffset<targetBytes&&pending.size<maxInFlight){
        const offset=nextOffset,length=Math.min(chunkBytes,targetBytes-offset);
        nextOffset+=length;
        pending.set(offset,Promise.resolve(read.call(api,{token,offset,length})).then(result=>({offset,result,error:null}),error=>({offset,result:null,error})));
      }
    };
    try{
      schedule();
      while(pending.size){
        assertNotAborted(signal);
        const offset=Math.min(...pending.keys()),row=await pending.get(offset);pending.delete(offset);
        assertNotAborted(signal);if(row?.error)throw row.error;
        const result=row?.result||{};if(!knownSize&&Number(result?.size)>0)totalSize=Math.max(totalSize,Number(result.size)||0);const bytes=base64Bytes(result.base64||'');
        const actual=Math.min(bytes.length,Math.max(0,targetBytes-offset));
        if(actual>0){
          const view=actual===bytes.length?bytes:bytes.subarray(0,actual);
          if(onChunk)await onChunk(view,Object.freeze({offset,bytesRead:actual,totalSize,targetBytes,eof:Boolean(result.eof)||offset+actual>=targetBytes}));
          bytesRead+=actual;chunks+=1;
        }
        if(!actual||result.eof){hitEof=true;pending.clear();break;}
        schedule();
      }
      const truncated=knownSize?bytesRead<totalSize:(!hitEof&&Number.isFinite(targetBytes));return Object.freeze({path,name:String(session?.name||''),size:totalSize,bytesRead,chunks,truncated,policy});
    }finally{
      if(!closed){closed=true;try{await close.call(api,{token});}catch{}}
    }
  }
  async function readDataTextChunks(options={}){
    let decoder=null,encoding='',first=true;
    const onTextChunk=typeof options.onTextChunk==='function'?options.onTextChunk:null;
    const meta=await readDataChunks({...options,onChunk:async(bytes,chunk)=>{
      if(first){encoding=detectTextEncoding(bytes,options.encoding||'auto');decoder=new TextDecoder(encoding);first=false;}
      let text=decoder.decode(bytes,{stream:true});
      if(chunk.offset===0)text=text.replace(/^\uFEFF/,'');
      if(text&&onTextChunk)await onTextChunk(text,chunk);
    }});
    if(first){encoding=detectTextEncoding(new Uint8Array(),options.encoding||'auto');decoder=new TextDecoder(encoding);}
    const tail=decoder.decode();if(tail&&onTextChunk)await onTextChunk(tail,Object.freeze({offset:meta.bytesRead,bytesRead:0,totalSize:meta.size,targetBytes:meta.bytesRead,eof:true,tail:true}));
    return Object.freeze({...meta,encoding});
  }
  async function readDataText(options={}){
    const parts=[];
    const meta=await readDataTextChunks({...options,onTextChunk:async(text,chunk)=>{parts.push(text);if(typeof options.onTextChunk==='function')await options.onTextChunk(text,chunk);}});
    return Object.freeze({...meta,text:parts.join('')});
  }
  async function readDataLines(options={}){
    const onLines=typeof options.onLines==='function'?options.onLines:null;if(!onLines)throw new Error('readDataLines requires onLines(lines, meta).');
    let carry='',lineNumber=0;
    const meta=await readDataTextChunks({...options,onTextChunk:async(text,chunk)=>{
      const merged=carry+text,rows=[];let start=0,i=0;
      while(i<merged.length){
        const code=merged.charCodeAt(i);
        if(code===10){rows.push(merged.slice(start,i));start=i+1;i+=1;continue;}
        if(code===13){if(i+1>=merged.length)break;rows.push(merged.slice(start,i));if(merged.charCodeAt(i+1)===10)i+=1;start=i+1;i+=1;continue;}
        i+=1;
      }
      carry=merged.slice(start);
      if(rows.length){const startLine=lineNumber+1;lineNumber+=rows.length;await onLines(rows,Object.freeze({...chunk,startLine,endLine:lineNumber}));}
    }});
    if(carry.endsWith('\r'))carry=carry.slice(0,-1);if(carry){lineNumber+=1;await onLines([carry],Object.freeze({offset:meta.bytesRead,bytesRead:0,totalSize:meta.size,targetBytes:meta.bytesRead,eof:true,startLine:lineNumber,endLine:lineNumber,tail:true}));}
    return Object.freeze({...meta,lineCount:lineNumber});
  }
  async function readDataTextPreview(options={}){
    const maxBytes=Math.max(1,Math.min(1024*1024,Number(options.maxBytes)||384*1024));
    return readDataText({...options,maxBytes});
  }
  async function writeClipboardText(text){
    if(typeof host?.copyTextToClipboard==='function')return host.copyTextToClipboard(String(text??''));
    if(navigator?.clipboard?.writeText)return navigator.clipboard.writeText(String(text??''));
    throw new Error('Clipboard service is unavailable.');
  }
  function svgText(node,{xmlDeclaration=true}={}){
    if(!node)throw new Error('SVG element is required.');
    const clone=node.cloneNode(true);
    clone.setAttribute?.('xmlns','http://www.w3.org/2000/svg');
    const text=new XMLSerializer().serializeToString(clone);
    return xmlDeclaration?`<?xml version="1.0" encoding="UTF-8"?>\n${text}`:text;
  }
  async function saveSvg(node,defaultName='plot.svg'){
    return saveText({defaultName,content:svgText(node),filters:[{name:'SVG',extensions:['svg']}]});
  }
  async function saveSvgPng(node,defaultName='plot.png',{scale=2,background='#fff'}={}){
    if(!node)throw new Error('SVG element is required.');
    const rect=node.getBoundingClientRect();
    const w=Math.max(1,Math.round(rect.width||Number(node.getAttribute?.('width'))||1));
    const h=Math.max(1,Math.round(rect.height||Number(node.getAttribute?.('height'))||1));
    const xml=svgText(node,{xmlDeclaration:false});
    const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    try{
      const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('SVG rasterization failed.'));image.src=url;});
      const canvas=document.createElement('canvas');canvas.width=w*scale;canvas.height=h*scale;
      const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle=background;ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
      const dataUrl=canvas.toDataURL('image/png');
      return saveBase64({defaultName,base64:dataUrl.split(',')[1]||'',mimeType:'image/png',filters:[{name:'PNG',extensions:['png']}]});
    } finally { URL.revokeObjectURL(url); }
  }
  function tableCsv(table,{columns=null,rows=null}={}){
    const cols=(columns||table?.columns||[]).map(c=>typeof c==='string'?{key:c,name:c}:c);
    const n=rows==null?Number(table?.rowCount||Math.max(0,...cols.map(c=>c.values?.length||0))):Number(rows);
    const out=[cols.map(c=>escCsv(c.name||c.key||'column')).join(',')];
    for(let i=0;i<n;i++)out.push(cols.map(c=>escCsv(c.values?.[i]??'')).join(','));
    return out.join('\n');
  }
  async function saveCsv(content,defaultName='export.csv'){
    return saveText({defaultName,content:String(content??''),filters:[{name:'CSV',extensions:['csv']}]});
  }

  function createScope(owner){
    const id=String(owner||'plugin');
    const scopedSaveText=options=>saveText({...options,source:options?.source||`plugin:${id}:saveText`});
    const scopedSaveBase64=options=>saveBase64({...options,source:options?.source||`plugin:${id}:saveBase64`});
    const scopedSaveCsv=(content,defaultName='export.csv')=>scopedSaveText({defaultName,content:String(content??''),filters:[{name:'CSV',extensions:['csv']}],source:`plugin:${id}:saveCsv`});
    const scopedSaveSvg=(node,defaultName='plot.svg')=>scopedSaveText({defaultName,content:svgText(node),filters:[{name:'SVG',extensions:['svg']}],source:`plugin:${id}:saveSvg`});
    const scopedSaveSvgPng=async(node,defaultName='plot.png',options={})=>{
      if(!node)throw new Error('SVG element is required.');
      const rect=node.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width||Number(node.getAttribute?.('width'))||1)),h=Math.max(1,Math.round(rect.height||Number(node.getAttribute?.('height'))||1)),scale=Math.max(.25,Number(options.scale)||2),background=String(options.background||'#fff');
      const xml=svgText(node,{xmlDeclaration:false}),blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
      try{
        const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('SVG rasterization failed.'));image.src=url;});
        const canvas=document.createElement('canvas');canvas.width=w*scale;canvas.height=h*scale;const context=canvas.getContext('2d');context.scale(scale,scale);context.fillStyle=background;context.fillRect(0,0,w,h);context.drawImage(img,0,0,w,h);
        const dataUrl=canvas.toDataURL('image/png');return scopedSaveBase64({defaultName,base64:dataUrl.split(',')[1]||'',mimeType:'image/png',filters:[{name:'PNG',extensions:['png']}],source:`plugin:${id}:saveSvgPng`});
      }finally{URL.revokeObjectURL(url);}
    };
    const scope=Object.freeze({
      version:VERSION,owner:id,
      openDataFiles,readDataText,readDataTextPreview,readDataTextChunks,readDataLines,readDataChunks,dataReadPolicy,saveText:scopedSaveText,saveBase64:scopedSaveBase64,saveCsv:scopedSaveCsv,
      clipboard:Object.freeze({writeText:writeClipboardText}),
      svg:Object.freeze({serialize:svgText,save:scopedSaveSvg,savePng:scopedSaveSvgPng}),
      csv:Object.freeze({cell:escCsv,table:tableCsv}),
      names:Object.freeze({safe:safeName})
    });
    ownerScopes.set(id,scope);return scope;
  }
  function disposeOwner(owner){ownerScopes.delete(String(owner||''));}

  window.DKDSIO=Object.freeze({VERSION,configure,createScope,disposeOwner,saveText,saveBase64,openDataFiles,readDataText,readDataTextPreview,readDataTextChunks,readDataLines,readDataChunks,dataReadPolicy,clipboard:Object.freeze({writeText:writeClipboardText}),svg:Object.freeze({serialize:svgText,save:saveSvg,savePng:saveSvgPng}),csv:Object.freeze({cell:escCsv,table:tableCsv,save:saveCsv}),names:Object.freeze({safe:safeName})});
})();
