'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const bytes=rel=>fs.statSync(path.join(root,rel)).size;
const walk=(dir,out=[])=>{for(const name of fs.readdirSync(dir)){const full=path.join(dir,name),st=fs.statSync(full);if(st.isDirectory())walk(full,out);else out.push(full);}return out;};

const sdk=json('sdk/contract.json');
const sdkReadme=read('sdk/README.md');
assert(sdkReadme.startsWith(`# DK Data Studio Plugin SDK ${sdk.sdkVersion}\n`),'SDK README title must match sdk/contract.json sdkVersion.');
assert(read('README_CN.md').includes(`SDK：**${sdk.sdkVersion}**`),'Main README SDK marker must match sdk/contract.json.');

const setVersion=read('scripts/set-version.js');
assert(!setVersion.includes('readdirSync(testsDir)')&&!setVersion.includes("path.join(root, 'tests')"),'set-version.js must not rewrite historical regression tests on every patch release.');
assert(fs.existsSync(path.join(root,'tools','windows','package-source-release.ps1')),'Source Release packaging tool must exist.');

const moduleLimit=48*1024;
assert(bytes('desktop/main.js')<=moduleLimit,`desktop/main.js must remain a thin main-process composition entry (<=48 KiB), got ${bytes('desktop/main.js')} bytes.`);
const mainModules=walk(path.join(root,'desktop','main-modules')).filter(file=>file.endsWith('.js'));
assert(mainModules.length>=5,'Desktop main-process responsibilities must remain split into importable modules.');
for(const file of mainModules){
  const size=fs.statSync(file).size;
  assert(size<=moduleLimit,`${path.relative(root,file)} exceeds the 48 KiB main-process module boundary (${size} bytes).`);
}

assert(bytes('src/plugins/ter-analysis/feature-runtime.js')<=moduleLimit,'TER feature runtime must remain below the 48 KiB authored-module boundary.');
const ter=json('src/plugins/ter-analysis/plugin.json');
for(const rows of [ter.scripts||[],ter.window?.scripts||[]]){
  const util=rows.indexOf('feature-utils.js'),feature=rows.indexOf('feature-runtime.js');
  assert(util>=0&&feature>=0&&util<feature,'TER feature-utils.js must load before feature-runtime.js in both host paths.');
}

const large=[];
for(const base of ['src','desktop'])for(const file of walk(path.join(root,base)).filter(file=>file.endsWith('.js')&&!file.includes(`${path.sep}generated${path.sep}`))){
  const size=fs.statSync(file).size;
  if(size>moduleLimit)large.push([path.relative(root,file).replace(/\\/g,'/'),size]);
}
assert(!large.length,`Authored JS module(s) exceed the 48 KiB boundary: ${large.map(([rel,size])=>`${rel}=${size}`).join(', ')}`);


function requireGraph(relDir){
  const base=path.join(root,relDir);
  const nodes=walk(base).filter(file=>file.endsWith('.js'));
  const nodeSet=new Set(nodes.map(file=>path.resolve(file)));
  const graph=new Map(nodes.map(file=>[path.resolve(file),new Set()]));
  for(const file of nodes){
    const source=fs.readFileSync(file,'utf8');
    assert(!/=>\s*require\s*\(/.test(source),`${path.relative(root,file)} must not hide module ownership behind lazy require wrappers.`);
    for(const match of source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)){
      const spec=match[1];if(!spec.startsWith('.'))continue;
      const raw=path.resolve(path.dirname(file),spec);
      const candidates=[raw,`${raw}.js`,path.join(raw,'index.js')];
      const target=candidates.find(candidate=>nodeSet.has(path.resolve(candidate)));
      if(target)graph.get(path.resolve(file)).add(path.resolve(target));
    }
  }
  return graph;
}
function stronglyConnected(graph){
  let index=0;const stack=[],onStack=new Set(),indices=new Map(),low=new Map(),out=[];
  function visit(v){
    indices.set(v,index);low.set(v,index);index++;stack.push(v);onStack.add(v);
    for(const w of graph.get(v)||[]){
      if(!indices.has(w)){visit(w);low.set(v,Math.min(low.get(v),low.get(w)));}
      else if(onStack.has(w))low.set(v,Math.min(low.get(v),indices.get(w)));
    }
    if(low.get(v)===indices.get(v)){
      const component=[];let w;
      do{w=stack.pop();onStack.delete(w);component.push(w);}while(w!==v);
      if(component.length>1||(graph.get(v)||new Set()).has(v))out.push(component);
    }
  }
  for(const v of graph.keys())if(!indices.has(v))visit(v);
  return out;
}
for(const relDir of ['src/app/modules','src/core/plugins/kernel/modules']){
  const cycles=stronglyConnected(requireGraph(relDir));
  assert(!cycles.length,`${relDir} must remain acyclic; SCC(s): ${cycles.map(rows=>rows.map(file=>path.relative(root,file).replace(/\\/g,'/')).join(' -> ')).join(' | ')}`);
}

const audit=read('docs/CODE_QUALITY_AUDIT.md');
assert(audit.includes('Resonance feature context'),'Code-quality audit must document the Resonance feature-context modularization history and remaining interaction work.');
assert(audit.includes('Dev Repo')&&audit.includes('Source Release'),'Repository audit must document the two handoff package forms.');

console.log(`v3.62 repository/module hygiene PASS: desktop entry=${bytes('desktop/main.js')} B, TER feature=${bytes('src/plugins/ter-analysis/feature-runtime.js')} B, large exceptions=0, App/Kernel SCC=0.`);
