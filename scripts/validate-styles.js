'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const authored=[];
function collect(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())collect(p);else if(e.isFile()&&e.name.endsWith('.css'))authored.push(p);}}
collect(path.join(root,'src','styles'));
for(const rel of ['src/mobile.css','src/plugin-window/style.css']){const p=path.join(root,rel);if(fs.existsSync(p))authored.push(p);}
const plugins=path.join(root,'src','plugins');
if(fs.existsSync(plugins))for(const e of fs.readdirSync(plugins,{withFileTypes:true})){if(!e.isDirectory())continue;const p=path.join(plugins,e.name,'plugin.css');if(fs.existsSync(p))authored.push(p);}
function structuralBalance(text,file){
  let depth=0,quote='',comment=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'){depth--;if(depth<0)throw new Error(`${file}: unexpected }`);}
  }
  if(comment)throw new Error(`${file}: unterminated comment`);
  if(quote)throw new Error(`${file}: unterminated string`);
  if(depth!==0)throw new Error(`${file}: unbalanced braces (${depth})`);
}
const violations=[];
// CSS override debt must not hide inside runtime template strings.
const runtimeText=[];
for(const base of ['src/core','src/app','src/plugins']){
  const dir=path.join(root,base);if(!fs.existsSync(dir))continue;
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&/\.(?:js|inc)$/.test(e.name))runtimeText.push(p);}};walk(dir);
}
for(const file of runtimeText){const text=fs.readFileSync(file,'utf8');if(/!important\b/i.test(text))violations.push(`${path.relative(root,file)}: !important is forbidden in runtime-injected CSS.`);if(/setProperty\([^)]*['\"]important['\"]/i.test(text))violations.push(`${path.relative(root,file)}: inline style priority 'important' is forbidden; layered CSS and normal inline state must suffice.`);}
for(const file of authored){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const css=fs.readFileSync(file,'utf8');
  try{structuralBalance(css,rel);}catch(err){violations.push(err.message);}
  if(/!important\b/i.test(css))violations.push(`${rel}: !important is forbidden; use cascade ownership layers.`);
}
for(const legacy of ['src/styles/base','src/styles/modern'])if(fs.existsSync(path.join(root,legacy)))violations.push(`${legacy}: legacy specificity directory must not return.`);
const coreCss=authored.filter(p=>p.includes(`${path.sep}src${path.sep}styles${path.sep}`));
const pluginIdentity=/(?:\.ter-|\.pulse-|\.dc-|\.respar-|\.reswin-|\.resonance-|#ter\w*|#pulse\w*|#resonance\w*)/i;
for(const file of coreCss){const css=fs.readFileSync(file,'utf8');if(pluginIdentity.test(css))violations.push(`${path.relative(root,file)}: Core CSS contains plugin identity selector.`);}
const entry=fs.readFileSync(path.join(root,'src','core.css'),'utf8');
const foundationPath=path.join(root,'src','styles','foundation','foundation.css');
const utilityPath=path.join(root,'src','styles','utility','visibility.css');
const foundationCss=fs.existsSync(foundationPath)?fs.readFileSync(foundationPath,'utf8'):'';
const utilityCss=fs.existsSync(utilityPath)?fs.readFileSync(utilityPath,'utf8'):'';
if(/(^|[},])\s*\.hidden\s*\{\s*display\s*:\s*none/m.test(foundationCss))violations.push('src/styles/foundation/foundation.css: global hidden state must not live below structural display rules.');
if(!/:where\(\.hidden,\[hidden\]\)\s*\{\s*display\s*:\s*none\s*;?\s*\}/.test(utilityCss))violations.push('src/styles/utility/visibility.css: final utility layer must own .hidden/[hidden] display:none.');
for(const file of authored){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  if(rel==='src/styles/utility/visibility.css')continue;
  const css=fs.readFileSync(file,'utf8');
  if(/(?:^|[},])[^{}]*\.hidden\s*\{\s*display\s*:\s*none\s*;?\s*\}/m.test(css))violations.push(`${rel}: component-specific .hidden display ownership is forbidden; use the final utility layer.`);
}
if(!entry.includes('dkds.utility')||!entry.includes('styles/utility/visibility.css'))violations.push('src/core.css: final dkds.utility visibility layer is required.');
if(entry.includes('dkds.state')||entry.includes('styles/state/visibility.css'))violations.push('src/core.css: legacy dkds.state visibility layer must not return; use the paint-free dkds.utility layer.');
for(const layer of ['foundation','plugin','structure','presentation','theme','platform','window','utility'])if(!entry.includes(`dkds.${layer}`))violations.push(`src/core.css: missing dkds.${layer} cascade layer.`);
const superTopPath=path.join(root,'src','styles','structure','super-top-contract.css');
if(fs.existsSync(superTopPath)){
  const superTop=fs.readFileSync(superTopPath,'utf8');
  if(/\.dkds-analysis-(?:frame|left|main|right|bottom)\s*\{[^}]*grid-(?:column|row|template)/s.test(superTop))violations.push('src/styles/structure/super-top-contract.css: SUPER/TOP chrome must not own AnalysisWorkbench grid geometry.');
}
const structureDir=path.join(root,'src','styles','structure');
const shellNavigationRel='src/styles/structure/shell-navigation.css';
const shellOwnedSelectors=['workspace-commandbar','primary-activity-cluster','primary-activity-bar','activity-switcher','activity-bar','context-commandbar','plugin-context-toolbar'];
for(const file of coreCss.filter(p=>p.startsWith(structureDir+path.sep))){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  if(rel===shellNavigationRel)continue;
  const css=fs.readFileSync(file,'utf8');
  for(const selector of shellOwnedSelectors){
    const exact=new RegExp(`(?:^|})\\s*\\.${selector}\\s*\\{`,'m');
    if(exact.test(css))violations.push(`${rel}: .${selector} geometry belongs to shell-navigation.css.`);
  }
}
const shellNavigationCss=fs.readFileSync(path.join(root,shellNavigationRel),'utf8');
if(/\.plugin-manager-|\.plugin-card-|\.plugin-capability-chip/.test(shellNavigationCss))violations.push(`${shellNavigationRel}: plugin-manager typography/layout must stay with schema-and-plugin-ui.css.`);

// Presentation ownership: state/chrome must stay with its semantic owner rather
// than accumulating as late workspace-theme patches.  Keep the measured
// duplicate-selector debt monotonic while the remaining legacy visual aliases
// are consolidated deliberately.
const presentationDir=path.join(root,'src','styles','presentation');
const presentationFiles=['control-status.css','plugin-chrome.css','scientific.css','shell.css','workspace-theme-boundary.css'];
const presentationText=Object.fromEntries(presentationFiles.map(name=>[name,fs.readFileSync(path.join(presentationDir,name),'utf8')]));
for(const [name,css] of Object.entries(presentationText)){
  if(name==='control-status.css')continue;
  for(const selector of ['dkds-analysis-nav-btn','plugin-status-item'])if(css.includes(`.${selector}`))violations.push(`src/styles/presentation/${name}: .${selector} state belongs to control-status.css.`);
  if(css.includes('#statusBar.statusbar'))violations.push(`src/styles/presentation/${name}: #statusBar.statusbar chrome belongs to control-status.css.`);
}
for(const name of ['scientific.css','workspace-theme-boundary.css']){
  const css=presentationText[name];
  for(const selector of ['.toolbar-btn:hover','.activity-tab:hover','.plugin-toolbar-btn:hover'])if(css.includes(selector))violations.push(`src/styles/presentation/${name}: ${selector} shell motion/hover paint belongs to shell.css.`);
}
if(presentationText['scientific.css'].includes('body.dkds-modern-ui button:hover:not(:disabled)'))violations.push('src/styles/presentation/scientific.css: generic button hover motion belongs to shell.css.');
function presentationSelectors(css){
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const selectors=[];
  for(const match of clean.matchAll(/([^{}]+)\{/g)){
    const pre=match[1].trim();
    if(!pre||pre.startsWith('@'))continue;
    for(const raw of pre.split(',')){
      const selector=raw.replace(/\s+/g,' ').trim();
      if(selector&&!selector.includes(';'))selectors.push(selector);
    }
  }
  return selectors;
}
const presentationOwners=new Map();
for(const [name,css] of Object.entries(presentationText))for(const selector of presentationSelectors(css)){
  if(!presentationOwners.has(selector))presentationOwners.set(selector,new Set());
  presentationOwners.get(selector).add(name);
}
const presentationDuplicates=[...presentationOwners.values()].filter(owners=>owners.size>1);
const presentationEdges=presentationDuplicates.reduce((sum,owners)=>sum+owners.size-1,0);
const scientificSurfaceTargets=new Set([
  'body.dkds-modern-ui .trend-card',
  'body.dkds-modern-ui .analysis-chart-card',
  'body.dkds-modern-ui .trend-card-header',
  'body.dkds-modern-ui .analysis-chart-title',
  'body.dkds-modern-ui .trend-card-legend',
  'body.dkds-modern-ui .trend-legend-chip',
  'body.dkds-modern-ui .dkds-group-plot-card',
  'body.dkds-modern-ui .dkds-group-plot-head'
]);
for(const [name,css] of Object.entries(presentationText)){
  const selectors=presentationSelectors(css);
  for(const target of scientificSurfaceTargets){
    if(name!=='scientific.css'&&selectors.includes(target))violations.push(`src/styles/presentation/${name}: ${target} paint belongs to scientific.css.`);
    const dark=`html[data-dkds-theme="dark"] ${target}`;
    if(name!=='scientific.css'&&selectors.includes(dark))violations.push(`src/styles/presentation/${name}: dark ${target} paint must remain semantic in scientific.css.`);
  }
}
for(const [name,css] of Object.entries(presentationText)){
  if(name==='shell.css')continue;
  const selectors=presentationSelectors(css);
  for(const target of ['body.dkds-modern-ui .floating-panel','body.dkds-modern-ui .floating-header',
    'html[data-dkds-theme="dark"] body.dkds-modern-ui .floating-panel','html[data-dkds-theme="dark"] body.dkds-modern-ui .floating-header']){
    if(selectors.includes(target))violations.push(`src/styles/presentation/${name}: ${target} paint belongs to shell.css.`);
  }
}
if(presentationDuplicates.length>42)violations.push(`presentation selector debt grew: ${presentationDuplicates.length} duplicate selectors > 42 ceiling.`);
if(presentationEdges>42)violations.push(`presentation ownership debt grew: ${presentationEdges} cross-file edges > 42 ceiling.`);
if(violations.length){console.error(violations.join('\n'));process.exit(1);}
console.log(`Style architecture OK: ${authored.length} authored CSS files, 0 !important, layered ownership active.`);
