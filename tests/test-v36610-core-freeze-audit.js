'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const {validate:validateVisualGate}=require('../tools/quality/visual-invariants');
const pkg=json('package.json');
const connectivity=read('src/plugins/connectivity-center/plugin.js');
const connectivityPresentation=read('src/styles/presentation/connectivity.css');
const coreModuleBudget=48*1024;

{const [major,minor,patch]=String(pkg.version).split('.').map(Number);assert(major>3||(major===3&&(minor>66||(minor===66&&patch>=10))),'Core freeze audit requires DK Data Studio 3.66.10+.');}
const visual=validateVisualGate();
assert(visual.invariants>=9,'Core freeze gate must retain the original 9 hard visual/ownership invariants even as later releases add stricter gates.');

for(const token of ['.dksmb-window{','.dksmb-nav{','.dksmb-browser{','.dksmb-toolbar{','.dksmb-list{','.dksmb-connection{','.dksmb-foot{']){
  assert(!connectivityPresentation.includes(token),`Core presentation must not know SMB domain selector ${token}`);
}
for(const token of ['dksmb-window dkds-dialog-shell dkds-material-role-elevated','dksmb-nav dkds-material-role-sidebar','dksmb-browser dkds-material-role-surface','dksmb-toolbar dkds-material-role-chrome','dksmb-connection dkds-material-role-sidebar','dksmb-foot dkds-material-role-chrome']){
  assert(connectivity.includes(token),`SMB must describe its visual identity through generic Core semantic roles: ${token}`);
}

const auditedModules=[
  'src/core/plugins/kernel/modules/plugin-api.js',
  'src/core/scientific/chart-runtime.js',
  'src/core/scientific/plot-runtime.js',
  'src/core/ui/modules/scientific-curve/render.js',
  'src/core/host/studio-kernel-runtime.js',
  'src/core/plugins/manager-ui.js',
  'src/core/scientific/d3-chart-renderer.js'
];
for(const rel of auditedModules){
  const size=fs.statSync(path.join(root,rel)).size;
  assert(size<=coreModuleBudget,`${rel} exceeds the 48 KiB authored Core module boundary (${size} bytes).`);
}

const lowTypography=[];
for(const layer of fs.readdirSync(path.join(root,'src','styles'),{withFileTypes:true})){
  if(!layer.isDirectory())continue;
  const dir=path.join(root,'src','styles',layer.name);
  for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.css'))){
    const rel=path.relative(root,path.join(dir,name)).replace(/\\/g,'/');
    const css=fs.readFileSync(path.join(dir,name),'utf8');
    for(const match of css.matchAll(/font-size\s*:\s*([0-9.]+)px/gi))if(Number(match[1])<10)lowTypography.push(`${rel}: ${match[1]}px`);
  }
}
assert(!lowTypography.length,`Authored Core CSS bypasses the 10 px typography floor:\n${lowTypography.join('\n')}`);

console.log('v3.66.10 Core freeze audit PASS: SMB paint is semantic-role owned, Core domain visual selectors are blocked, typography floor is enforced, and all audited large Core modules remain within the 48 KiB boundary.');
