(() => {
  if (window.DKDSIO) return;

  const VERSION = '1.0.0';
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
      filters:Array.isArray(options.filters)?options.filters:undefined
    });
  }
  async function saveBase64(options={}){
    return requireMethod('saveBase64')({
      defaultName:safeName(options.defaultName||'export.bin','export.bin'),
      base64:String(options.base64||''),
      mimeType:String(options.mimeType||'application/octet-stream'),
      filters:Array.isArray(options.filters)?options.filters:undefined
    });
  }
  async function openDataFiles(options={}){
    const fn=bridge()?.openDataFiles;
    if(typeof fn!=='function')throw new Error('Data-file picker is unavailable in this host.');
    return fn(options);
  }
  async function readDataText(options={}){
    return requireMethod('readDataText')(options);
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
    const scope=Object.freeze({
      version:VERSION,owner:id,
      openDataFiles,readDataText,saveText,saveBase64,saveCsv,
      clipboard:Object.freeze({writeText:writeClipboardText}),
      svg:Object.freeze({serialize:svgText,save:saveSvg,savePng:saveSvgPng}),
      csv:Object.freeze({cell:escCsv,table:tableCsv}),
      names:Object.freeze({safe:safeName})
    });
    ownerScopes.set(id,scope);return scope;
  }
  function disposeOwner(owner){ownerScopes.delete(String(owner||''));}

  window.DKDSIO=Object.freeze({VERSION,configure,createScope,disposeOwner,saveText,saveBase64,openDataFiles,readDataText,clipboard:Object.freeze({writeText:writeClipboardText}),svg:Object.freeze({serialize:svgText,save:saveSvg,savePng:saveSvgPng}),csv:Object.freeze({cell:escCsv,table:tableCsv,save:saveCsv}),names:Object.freeze({safe:safeName})});
})();
