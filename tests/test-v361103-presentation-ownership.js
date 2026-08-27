'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const base='src/styles/presentation/';
const files=['control-status.css','plugin-chrome.css','scientific.css','shell.css','workspace-theme-boundary.css'];
const css=Object.fromEntries(files.map(name=>[name,read(base+name)]));

for(const name of files.filter(name=>name!=='control-status.css')){
  assert(!css[name].includes('.dkds-analysis-nav-btn'),`${name} must not own AnalysisWorkbench navigation state.`);
  assert(!css[name].includes('.plugin-status-item'),`${name} must not own status-item state.`);
  assert(!css[name].includes('#statusBar.statusbar'),`${name} must not own status-bar chrome.`);
}
for(const token of ['.dkds-analysis-nav-btn','#statusBar.statusbar','.plugin-status-item.active']){
  assert(css['control-status.css'].includes(token),`control-status.css is missing ${token}.`);
}
for(const name of ['scientific.css','workspace-theme-boundary.css']){
  for(const token of ['.toolbar-btn:hover','.activity-tab:hover','.plugin-toolbar-btn:hover']){
    assert(!css[name].includes(token),`${name} must not own shell hover/motion selector ${token}.`);
  }
}
assert(!css['scientific.css'].includes('body.dkds-modern-ui button:hover:not(:disabled)'),'Scientific presentation must not own generic button hover geometry.');
assert(css['shell.css'].includes('body.dkds-modern-ui button:hover:not(:disabled){transform:none}'),'Shell must own geometry-stable generic button hover.');
assert(css['shell.css'].includes('box-shadow:0 1px 2px rgba(33,57,112,.06)'),'Shell must own the flat light selected Activity shadow.');
assert(css['plugin-chrome.css'].includes('box-shadow:0 1px 2px rgba(0,0,0,.18)'),'Plugin chrome must retain the matching dark selected Activity shadow.');

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
const owners=new Map();
for(const name of files)for(const selector of selectors(css[name])){
  if(!owners.has(selector))owners.set(selector,new Set());
  owners.get(selector).add(name);
}
const duplicates=[...owners.values()].filter(set=>set.size>1);
const edges=duplicates.reduce((sum,set)=>sum+set.size-1,0);
assert(duplicates.length<=55,`Presentation duplicate selector debt grew to ${duplicates.length}; ceiling is 55.`);
assert(edges<=58,`Presentation cross-file ownership edges grew to ${edges}; ceiling is 58.`);

console.log(`v3.61.103 presentation ownership checks passed: duplicate selectors=${duplicates.length}, ownership edges=${edges}.`);
