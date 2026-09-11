(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DKDSThemeCoverageContract=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const VISUAL_PROPERTIES=Object.freeze([
    'background','background-color','color','border','border-color','border-top-color','border-right-color','border-bottom-color','border-left-color',
    'outline','outline-color','box-shadow','fill','stroke','filter','backdrop-filter','-webkit-backdrop-filter'
  ]);
  const visualPropertySet=new Set(VISUAL_PROPERTIES);
  const semanticVar=/var\(\s*--(?:dkui|ui|dkds-material)-/i;
  const neutralKeyword=/^(?:transparent|currentColor|inherit|initial|unset|none)$/i;
  const literalColor=/(?:#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:white|black|red|green|blue|gray|grey|silver|navy|teal|purple|orange|yellow)\b)/i;
  function clean(value){return String(value??'').replace(/\/\*[\s\S]*?\*\//g,'').trim();}
  function isManagedValue(property,value){
    const v=clean(value);if(!v)return true;
    if(semanticVar.test(v))return true;
    if(neutralKeyword.test(v))return true;
    if(property==='filter'||property.includes('backdrop-filter'))return /var\(\s*--(?:dkui-material|dkds-material)-/i.test(v);
    if(property==='color'&&v==='currentColor')return true;
    if(!literalColor.test(v)&&!/(?:box-shadow|border|background|outline|fill|stroke)/.test(property))return true;
    return false;
  }
  function auditDeclarations(text,meta={}){
    const issues=[];const declRe=/(^|[;{])\s*([\w-]+)\s*:\s*([^;}{]+)/g;let m;
    while((m=declRe.exec(String(text||'')))){
      const property=String(m[2]||'').toLowerCase(),value=clean(m[3]);
      if(!visualPropertySet.has(property))continue;
      if(isManagedValue(property,value))continue;
      issues.push(Object.freeze({severity:'warning',kind:'unmanaged-visual',source:String(meta.source||''),pluginId:String(meta.pluginId||''),selector:String(meta.selector||''),property,value,reason:'visual value bypasses DKDS semantic Theme tokens/material roles'}));
    }
    return issues;
  }
  function auditCss(cssText,meta={}){
    const issues=[];const source=String(cssText||'').replace(/\/\*[\s\S]*?\*\//g,'');const ruleRe=/([^{}]+)\{([^{}]*)\}/g;let m;
    while((m=ruleRe.exec(source))){
      const selector=clean(m[1]);if(!selector||selector.startsWith('@'))continue;
      issues.push(...auditDeclarations(m[2],{...meta,selector}));
    }
    return Object.freeze(issues);
  }
  function auditInlineStyle(styleText,meta={}){return Object.freeze(auditDeclarations(`{${String(styleText||'')}}`,{...meta,selector:meta.selector||'[style]'}));}
  function summarize(issues=[]){const rows=Array.from(issues||[]);return Object.freeze({total:rows.length,warnings:rows.filter(x=>x.severity==='warning').length,plugins:[...new Set(rows.map(x=>x.pluginId).filter(Boolean))]});}
  return Object.freeze({version:VERSION,visualProperties:()=>VISUAL_PROPERTIES.slice(),auditCss,auditInlineStyle,isManagedValue,summarize});
});
