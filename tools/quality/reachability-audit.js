#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const {fileURLToPath}=require('url');
const ROOT=path.resolve(__dirname,'../..');
const SOURCE_ROOT=path.join(ROOT,'src');
const SKIP_DIRS=new Set(['generated']);

function rel(file){return path.relative(ROOT,file).replace(/\\/g,'/');}
function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()&&SKIP_DIRS.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,out);
    else if(entry.isFile()&&entry.name.endsWith('.js'))out.push(full);
  }
  return out;
}
function maskSource(source){
  const text=String(source||''),chars=[...text];let state='code',quote='',templateDepth=0;
  for(let i=0;i<chars.length;i++){
    const c=chars[i],n=chars[i+1];
    if(state==='line'){if(c==='\n')state='code';else chars[i]=' ';continue;}
    if(state==='block'){if(c==='*'&&n==='/'){chars[i]=chars[i+1]=' ';i++;state='code';}else if(c!=='\n')chars[i]=' ';continue;}
    if(state==='string'){
      if(c==='\\'){chars[i]=' ';if(i+1<chars.length&&chars[i+1]!=='\n')chars[++i]=' ';continue;}
      if(c===quote){chars[i]=' ';state='code';}else if(c!=='\n')chars[i]=' ';continue;
    }
    if(state==='template'){
      if(c==='\\'){chars[i]=' ';if(i+1<chars.length&&chars[i+1]!=='\n')chars[++i]=' ';continue;}
      if(c==='`'&&templateDepth===0){chars[i]=' ';state='code';continue;}
      if(c==='$'&&n==='{'){chars[i]=chars[i+1]=' ';i++;templateDepth++;continue;}
      if(c==='}'&&templateDepth>0){chars[i]=' ';templateDepth--;continue;}
      if(templateDepth===0&&c!=='\n')chars[i]=' ';
      continue;
    }
    if(c==='/'&&n==='/'){chars[i]=chars[i+1]=' ';i++;state='line';continue;}
    if(c==='/'&&n==='*'){chars[i]=chars[i+1]=' ';i++;state='block';continue;}
    if(c==='"'||c==="'"){chars[i]=' ';state='string';quote=c;continue;}
    if(c==='`'){chars[i]=' ';state='template';templateDepth=0;continue;}
  }
  return chars.join('');
}
function wordCount(text,name){
  const escaped=String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return (String(text||'').match(new RegExp(`\\b${escaped}\\b`,'g'))||[]).length;
}
function declarations(masked){
  const rows=[];
  const patterns=[
    {kind:'function-declaration',re:/(?:^|[;}\n]\s*)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm},
    {kind:'function-binding',re:/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/g}
  ];
  for(const {kind,re} of patterns){let match;while((match=re.exec(masked)))rows.push({name:match[1],kind,offset:match.index});}
  const seen=new Set();return rows.filter(row=>{const key=`${row.name}:${row.offset}`;if(seen.has(key))return false;seen.add(key);return true;});
}
function loadCoverage(dir){
  const coverage=new Map();
  if(!dir||!fs.existsSync(dir))return coverage;
  for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.json'))){
    let json;try{json=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));}catch{continue;}
    for(const script of json.result||[]){
      let file='';try{if(String(script.url||'').startsWith('file://'))file=fileURLToPath(script.url);}catch{}
      if(!file||!file.startsWith(ROOT+path.sep))continue;
      const key=path.resolve(file),row=coverage.get(key)||{loaded:0,functions:new Map()};row.loaded++;
      for(const fn of script.functions||[]){
        const fnName=String(fn.functionName||'').trim();if(!fnName)continue;
        const count=Math.max(...(fn.ranges||[]).map(range=>Number(range.count)||0),0);
        row.functions.set(fnName,Math.max(row.functions.get(fnName)||0,count));
      }
      coverage.set(key,row);
    }
  }
  return coverage;
}
function analyzeSource(source,{file='',coverage=null}={}){
  const text=String(source||''),masked=maskSource(text),candidates=[];
  for(const declaration of declarations(masked)){
    // Count references in the original source. This is intentionally conservative: names
    // mentioned in templates/comments/strings can hide dead code, but they must never cause
    // a live callback/provider to be deleted merely because static parsing cannot see its owner.
    const refs=wordCount(text,declaration.name);if(refs!==1)continue;
    const runtimeCount=coverage?.functions?.has(declaration.name)?coverage.functions.get(declaration.name):null;
    candidates.push(Object.freeze({file,name:declaration.name,kind:declaration.kind,staticReferences:refs,runtime:runtimeCount===null?(coverage?'LOADED_NAME_NOT_REPORTED':'NOT_OBSERVED'):(runtimeCount===0?'LOADED_ZERO':'LOADED_HIT'),runtimeCount}));
  }
  return Object.freeze(candidates);
}
function auditReachability({coverageDir=''}={}){
  const files=walk(SOURCE_ROOT).sort(),coverage=loadCoverage(coverageDir),candidates=[];
  for(const file of files){
    const cov=coverage.get(path.resolve(file));
    candidates.push(...analyzeSource(fs.readFileSync(file,'utf8'),{file:rel(file),coverage:cov}));
  }
  return Object.freeze({version:'1.0.0',files:files.length,coverageFiles:coverage.size,candidates:Object.freeze(candidates),highConfidence:Object.freeze(candidates.filter(row=>row.staticReferences===1))});
}
function validate(options={}){
  const report=auditReachability(options);
  if(report.highConfidence.length){
    const detail=report.highConfidence.map(row=>`${row.file}: ${row.name} (${row.kind}, ${row.runtime}${row.runtimeCount===null?'':`=${row.runtimeCount}`})`).join('\n');
    throw new Error(`Reachability audit FAILED (${report.highConfidence.length} high-confidence single-reference functions)\n${detail}`);
  }
  return report;
}
function parseCoverageArg(argv){const index=argv.indexOf('--coverage-dir');return index>=0?String(argv[index+1]||''):'';}
if(require.main===module){
  const options={coverageDir:parseCoverageArg(process.argv)};let report;
  try{report=process.argv.includes('--strict')?validate(options):auditReachability(options);}catch(error){console.error(error.message||error);process.exit(1);}
  if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else{
    console.log(`Reachability audit: source files=${report.files}, coverage files=${report.coverageFiles}, high-confidence=${report.highConfidence.length}`);
    for(const row of report.highConfidence)console.log(`  ${row.file} :: ${row.name} [${row.runtime}]`);
  }
}
module.exports=Object.freeze({auditReachability,validate,maskSource,declarations,wordCount,analyzeSource,loadCoverage});
