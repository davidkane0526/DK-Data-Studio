'use strict';
const fs=require('fs');
const path=require('path');
function cssFiles(root,relDir){
  const dir=path.join(root,relDir);
  return fs.readdirSync(dir).filter(name=>name.endsWith('.css')).sort();
}
function splitSelectorList(text){
  const out=[];let start=0,paren=0,bracket=0,quote='';
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='(')paren++;else if(c===')')paren=Math.max(0,paren-1);
    else if(c==='[')bracket++;else if(c===']')bracket=Math.max(0,bracket-1);
    else if(c===','&&paren===0&&bracket===0){out.push(text.slice(start,i));start=i+1;}
  }
  out.push(text.slice(start));return out;
}
function selectors(text){
  const clean=text.replace(/\/\*[\s\S]*?\*\//g,'');
  const out=[];
  for(const match of clean.matchAll(/([^{}]+)\{/g)){
    const pre=match[1].trim();
    if(!pre||pre.startsWith('@'))continue;
    for(const raw of splitSelectorList(pre)){
      const selector=raw.replace(/\s+/g,' ').trim();
      if(!selector||selector.includes(';')||selector==='from'||selector==='to'||/^\d+(?:\.\d+)?%$/.test(selector))continue;
      out.push(selector);
    }
  }
  return out;
}
function ownerMap(root,relDir){
  const files=cssFiles(root,relDir),owners=new Map(),text={};
  for(const name of files){
    const css=fs.readFileSync(path.join(root,relDir,name),'utf8');text[name]=css;
    for(const selector of selectors(css)){
      if(!owners.has(selector))owners.set(selector,new Set());
      owners.get(selector).add(name);
    }
  }
  return {files,text,owners};
}
function duplicates(owners){return [...owners.entries()].filter(([,names])=>names.size>1);}
module.exports={cssFiles,selectors,ownerMap,duplicates};
