'use strict';
const fs=require('fs');
const path=require('path');

function normalizeTaskFile(raw,label='task source'){
  const file=String(raw||'').replace(/\\/g,'/').replace(/^\.\//,'');
  if(!file||file.startsWith('/')||file.includes('..'))throw new Error(`Unsafe ${label} path: ${raw}`);
  return file;
}

function buildBuiltinTaskSourceBundle(appRoot,pluginDir,manifest={}){
  const taskRows=Array.isArray(manifest?.tasks)?manifest.tasks:[];
  const taskFiles=[...new Set(taskRows.flatMap(row=>[row?.entry,...(Array.isArray(row?.imports)?row.imports:[])])
    .filter(Boolean).map(raw=>normalizeTaskFile(raw,'built-in plugin task source')))];
  const taskSources=Object.fromEntries(taskFiles.map(file=>{
    const target=path.join(pluginDir,file);
    if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`Built-in plugin task source missing: ${path.basename(pluginDir)}/${file}`);
    return [file,fs.readFileSync(target,'utf8')];
  }));
  const taskCoreSources={};
  for(const task of taskRows){
    const taskId=String(task?.id||'').trim();if(!taskId)continue;
    const refs=[];
    for(const file of [task?.entry,...(Array.isArray(task?.imports)?task.imports:[])].filter(Boolean).map(raw=>normalizeTaskFile(raw,'built-in plugin task source'))){
      const source=String(taskSources[file]||'');
      for(const match of source.matchAll(/@dkds-core-task-source\s+([^\n*]+)/g)){
        for(const raw of String(match[1]||'').split(/[\s,]+/).filter(Boolean)){
          const rel=String(raw).replace(/\\/g,'/').replace(/^\.\//,'');
          if(!/^science\/[A-Za-z0-9._-]+\.js$/.test(rel))throw new Error(`Unsafe Core task source path: ${path.basename(pluginDir)}/${file} -> ${raw}`);
          if(!refs.includes(rel))refs.push(rel);
        }
      }
    }
    if(refs.length)taskCoreSources[taskId]=refs.map(file=>{
      const target=path.join(appRoot,'src',file);
      if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`Core task source missing: src/${file}`);
      return {file,source:fs.readFileSync(target,'utf8')};
    });
  }
  return Object.freeze({taskSources:Object.freeze({...taskSources}),taskCoreSources:Object.freeze(structuredClone(taskCoreSources))});
}

module.exports=Object.freeze({normalizeTaskFile,buildBuiltinTaskSourceBundle});
