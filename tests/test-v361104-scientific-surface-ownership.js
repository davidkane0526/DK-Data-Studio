'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const base='src/styles/presentation/';
const files=['control-status.css','plugin-chrome.css','scientific.css','shell.css','workspace-theme-boundary.css'];
const css=Object.fromEntries(files.map(name=>[name,read(base+name)]));
function selectors(text){
  const clean=text.replace(/\/\*[\s\S]*?\*\//g,'');
  const out=[];
  for(const match of clean.matchAll(/([^{}]+)\{/g)){
    const pre=match[1].trim();
    if(!pre||pre.startsWith('@'))continue;
    for(const raw of pre.split(',')){
      const selector=raw.replace(/\s+/g,' ').trim();
      if(selector&&!selector.includes(';'))out.push(selector);
    }
  }
  return out;
}
const selectorMap=Object.fromEntries(files.map(name=>[name,new Set(selectors(css[name]))]));
const scientificTargets=[
  'body.dkds-modern-ui .trend-card',
  'body.dkds-modern-ui .analysis-chart-card',
  'body.dkds-modern-ui .trend-card-header',
  'body.dkds-modern-ui .analysis-chart-title',
  'body.dkds-modern-ui .trend-card-legend',
  'body.dkds-modern-ui .trend-legend-chip',
  'body.dkds-modern-ui .dkds-group-plot-card',
  'body.dkds-modern-ui .dkds-group-plot-head'
];
for(const target of scientificTargets){
  assert(selectorMap['scientific.css'].has(target),`scientific.css must own ${target}.`);
  for(const name of files.filter(name=>name!=='scientific.css')){
    assert(!selectorMap[name].has(target),`${name} must not share scientific surface paint selector ${target}.`);
    const dark=`html[data-dkds-theme="dark"] ${target}`;
    assert(!selectorMap[name].has(dark),`${name} must not hard-code dark scientific surface selector ${dark}.`);
  }
}
for(const token of [
  'background:var(--surface-primary)',
  'background:var(--surface-secondary)',
  'border-color:var(--border-subtle)',
  'box-shadow:var(--surface-shadow)'
])assert(css['scientific.css'].includes(token),`Scientific surface contract is missing ${token}.`);

assert(selectorMap['shell.css'].has('body.dkds-modern-ui .floating-panel'),'shell.css must own floating-panel paint.');
assert(selectorMap['shell.css'].has('body.dkds-modern-ui .floating-header'),'shell.css must own floating-header paint.');
for(const name of files.filter(name=>name!=='shell.css')){
  assert(!selectorMap[name].has('body.dkds-modern-ui .floating-panel'),`${name} must not own floating-panel paint.`);
  assert(!selectorMap[name].has('body.dkds-modern-ui .floating-header'),`${name} must not own floating-header paint.`);
  assert(!selectorMap[name].has('html[data-dkds-theme="dark"] body.dkds-modern-ui .floating-panel'),`${name} must not hard-code dark floating-panel paint.`);
  assert(!selectorMap[name].has('html[data-dkds-theme="dark"] body.dkds-modern-ui .floating-header'),`${name} must not hard-code dark floating-header paint.`);
}
assert(css['shell.css'].includes('body.dkds-modern-ui .floating-panel{border-color:transparent;outline:0}'),'Floating-panel perimeter must remain visually quiet.');
assert(css['shell.css'].includes('background:var(--surface-secondary)'),'Floating-header paint must use semantic theme surfaces.');

const owners=new Map();
for(const name of files)for(const selector of selectorMap[name]){
  if(!owners.has(selector))owners.set(selector,new Set());
  owners.get(selector).add(name);
}
const duplicates=[...owners.values()].filter(set=>set.size>1);
const edges=duplicates.reduce((sum,set)=>sum+set.size-1,0);
assert(duplicates.length<=42,`Presentation duplicate selector debt grew to ${duplicates.length}; ceiling is 42.`);
assert(edges<=42,`Presentation cross-file ownership edges grew to ${edges}; ceiling is 42.`);

console.log(`v3.61.104 scientific surface ownership PASS: duplicate selectors=${duplicates.length}, ownership edges=${edges}.`);
