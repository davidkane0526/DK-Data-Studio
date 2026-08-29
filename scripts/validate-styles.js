'use strict';
const fs=require('fs');
const path=require('path');
const {inspectPluginCss,collectCoreAliases}=require('../sdk/visual-contract');
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

// Final v3.62 style ownership gates.  A selector has one authored owner per
// structural/presentation layer; Foundation is reset-only; Structure is paint-free.
const presentationDir=path.join(root,'src','styles','presentation');
const structureDirFinal=path.join(root,'src','styles','structure');
const presentationFiles=fs.readdirSync(presentationDir).filter(name=>name.endsWith('.css')).sort();
const structureFiles=fs.readdirSync(structureDirFinal).filter(name=>name.endsWith('.css')).sort();
if(fs.existsSync(path.join(presentationDir,'workspace-theme-boundary.css')))violations.push('src/styles/presentation/workspace-theme-boundary.css: catch-all compatibility patch layer must not return.');
function splitSelectorList(text){
  const out=[];let start=0,paren=0,bracket=0,quote='';
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='\"'||c==="'"){quote=c;continue;}
    if(c==='(')paren++; else if(c===')')paren=Math.max(0,paren-1);
    else if(c==='[')bracket++; else if(c===']')bracket=Math.max(0,bracket-1);
    else if(c===','&&paren===0&&bracket===0){out.push(text.slice(start,i));start=i+1;}
  }
  out.push(text.slice(start));return out;
}
function ownedSelectors(css){
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const selectors=[];
  for(const match of clean.matchAll(/([^{}]+)\{/g)){
    const pre=match[1].trim();
    if(!pre||pre.startsWith('@'))continue;
    for(const raw of splitSelectorList(pre)){
      const selector=raw.replace(/\s+/g,' ').trim();
      if(!selector||selector.includes(';')||selector==='from'||selector==='to'||/^\d+(?:\.\d+)?%$/.test(selector))continue;
      selectors.push(selector);
    }
  }
  return selectors;
}
function assertSingleOwner(dir,files,label){
  const owners=new Map();
  for(const name of files){
    const css=fs.readFileSync(path.join(dir,name),'utf8');
    for(const selector of ownedSelectors(css)){
      if(!owners.has(selector))owners.set(selector,new Set());
      owners.get(selector).add(name);
    }
  }
  for(const [selector,names] of owners)if(names.size>1)violations.push(`${label}: selector "${selector}" has multiple owners: ${[...names].join(', ')}.`);
  return owners;
}
function semanticSelector(selector){
  let value=String(selector||'').trim(),previous='';
  const prefixes=[
    /^html\[data-dkds-theme="(?:dark|light)"\]\s+/,
    /^html\[data-dkds-theme-profile="[^"]+"\]\s+/,
    /^body\.dkds-modern-ui(?:\.plugin-window-host)?\s+/,
    /^\.dkds-plugin-window\s+/
  ];
  while(value&&value!==previous){previous=value;for(const prefix of prefixes)value=value.replace(prefix,'');}
  return value.trim();
}
function assertSingleSemanticOwner(dir,files,label){
  const owners=new Map();
  for(const name of files){
    const css=fs.readFileSync(path.join(dir,name),'utf8');
    for(const selector of new Set(ownedSelectors(css).map(semanticSelector).filter(Boolean))){
      if(!owners.has(selector))owners.set(selector,new Set());
      owners.get(selector).add(name);
    }
  }
  for(const [selector,names] of owners)if(names.size>1)violations.push(`${label}: semantic selector "${selector}" has multiple owners after Theme/host normalization: ${[...names].join(', ')}.`);
  return owners;
}
const presentationOwners=assertSingleOwner(presentationDir,presentationFiles,'presentation ownership');
const structureOwners=assertSingleOwner(structureDirFinal,structureFiles,'structure ownership');
assertSingleSemanticOwner(presentationDir,presentationFiles,'presentation semantic ownership');
assertSingleSemanticOwner(structureDirFinal,structureFiles,'structure semantic ownership');
assertNoSameSelectorPropertyOverride(structureDirFinal,structureFiles,'structure duplicate-property ownership');
assertNoSameSelectorPropertyOverride(presentationDir,presentationFiles,'presentation duplicate-property ownership');
const paintProp=/^(?:background(?:-.+)?|border(?:-.+)?|box-shadow|color|fill|stroke|opacity|outline(?:-.+)?|text-shadow|filter|backdrop-filter|-webkit-backdrop-filter|accent-color)$/i;
const literalColor=/(?:#[0-9a-f]{3,8}\b|rgba?\(|hsla?\()/i;
function declarations(css){
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const out=[];
  for(const m of clean.matchAll(/(?:^|[;{])\s*([\w-]+)\s*:\s*([^;}]*)/gm))out.push([m[1],m[2]]);
  return out;
}
function matchingBrace(text,open){
  let depth=0,quote='',comment=false;
  for(let i=open;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return i;
  }
  return -1;
}
function ruleBlocks(css,context=[]){
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const out=[];let cursor=0;
  while(cursor<clean.length){
    const open=clean.indexOf('{',cursor);if(open<0)break;
    const pre=clean.slice(cursor,open).trim();const close=matchingBrace(clean,open);if(close<0)break;
    const body=clean.slice(open+1,close);
    if(pre.startsWith('@')){
      const keyword=(pre.match(/^@([\w-]+)/)||[])[1]||'';
      if(!/keyframes$/i.test(keyword))out.push(...ruleBlocks(body,[...context,pre.replace(/\s+/g,' ')]));
    }else if(pre){
      const decls=declarations(`{${body}}`);
      if(decls.length)for(const raw of splitSelectorList(pre)){
        const selector=raw.replace(/\s+/g,' ').trim();
        if(selector&&selector!=='from'&&selector!=='to'&&!/^\d+(?:\.\d+)?%$/.test(selector))out.push({selector,context:context.join(' > '),decls});
      }
    }
    cursor=close+1;
  }
  return out;
}
function assertNoSameSelectorPropertyOverride(dir,files,label){
  for(const name of files){
    const css=fs.readFileSync(path.join(dir,name),'utf8');
    const seen=new Map();
    for(const block of ruleBlocks(css)){
      const key=`${block.context}\u0000${block.selector}`;
      if(!seen.has(key))seen.set(key,new Set());
      const props=seen.get(key);
      for(const [prop] of block.decls){
        const normalized=String(prop).trim().toLowerCase();
        if(props.has(normalized))violations.push(`${label}/${name}: selector "${block.selector}" rewrites property ${normalized} later in the same cascade context${block.context?` (${block.context})`:''}. Merge ownership instead of patching it later.`);
        props.add(normalized);
      }
    }
  }
}
for(const name of structureFiles){
  const css=fs.readFileSync(path.join(structureDirFinal,name),'utf8');
  for(const [prop,value] of declarations(css)){
    if(paintProp.test(prop))violations.push(`src/styles/structure/${name}: paint property ${prop} belongs to presentation/theme.`);
    if(literalColor.test(value))violations.push(`src/styles/structure/${name}: literal color belongs to presentation/theme (${prop}:${value.trim()}).`);
  }
}
const foundationClean=foundationCss.replace(/\/\*[\s\S]*?\*\//g,'');
for(const selector of ownedSelectors(foundationClean))if(!['*','html','body','#app','button','input','select'].includes(selector))violations.push(`src/styles/foundation/foundation.css: component selector ${selector} is forbidden; Foundation is reset-only.`);
for(const [prop,value] of declarations(foundationClean)){
  if(paintProp.test(prop))violations.push(`src/styles/foundation/foundation.css: paint property ${prop} is forbidden; Foundation is reset-only.`);
  if(literalColor.test(value))violations.push(`src/styles/foundation/foundation.css: literal color is forbidden; Foundation is reset-only.`);
}
const legacyTokenAlias=/--(?:bg|panel|border|text|muted|accent|shadow|line)(?![-\w])/g;
for(const file of authored){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const css=fs.readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  if(legacyTokenAlias.test(css))violations.push(`${rel}: legacy short theme token alias must not return; use canonical semantic tokens.`);
  legacyTokenAlias.lastIndex=0;
}
// Semantic presentation owners that must remain explicit.
const presentationText=Object.fromEntries(presentationFiles.map(name=>[name,fs.readFileSync(path.join(presentationDir,name),'utf8')]));
for(const [name,css] of Object.entries(presentationText)){
  if(name==='control-status.css')continue;
  for(const selector of ['dkds-analysis-nav-btn','plugin-status-item'])if(css.includes(`.${selector}`))violations.push(`src/styles/presentation/${name}: .${selector} state belongs to control-status.css.`);
  if(css.includes('#statusBar.statusbar'))violations.push(`src/styles/presentation/${name}: #statusBar.statusbar chrome belongs to control-status.css.`);
}
for(const name of presentationFiles.filter(name=>name!=='shell.css')){
  const selectors=new Set(ownedSelectors(presentationText[name]));
  for(const target of ['body.dkds-modern-ui .floating-panel','body.dkds-modern-ui .floating-header','html[data-dkds-theme="dark"] body.dkds-modern-ui .floating-panel','html[data-dkds-theme="dark"] body.dkds-modern-ui .floating-header'])if(selectors.has(target))violations.push(`src/styles/presentation/${name}: ${target} belongs to shell.css.`);
}
const scientificSurfaceTargets=['body.dkds-modern-ui .trend-card','body.dkds-modern-ui .analysis-chart-card','body.dkds-modern-ui .trend-card-header','body.dkds-modern-ui .analysis-chart-title','body.dkds-modern-ui .trend-card-legend','body.dkds-modern-ui .trend-legend-chip','body.dkds-modern-ui .dkds-group-plot-card','body.dkds-modern-ui .dkds-group-plot-head'];
for(const target of scientificSurfaceTargets){
  const names=presentationOwners.get(target)||new Set();
  if(!names.has('scientific.css'))violations.push(`presentation ownership: scientific.css must own ${target}.`);
}
// First-party plugins own domain layout/content. Core owns application paint and
// standard control/header geometry. The same audit is shipped in the public SDK.
if(fs.existsSync(plugins))for(const e of fs.readdirSync(plugins,{withFileTypes:true})){
  if(!e.isDirectory())continue;const folder=path.join(plugins,e.name),p=path.join(folder,'plugin.css');if(!fs.existsSync(p))continue;
  const cssRaw=fs.readFileSync(p,'utf8');
  const css=cssRaw.replace(/\/\*[\s\S]*?\*\//g,'');
  if(literalColor.test(css))violations.push(`src/plugins/${e.name}/plugin.css: literal application color is forbidden; use Core semantic/theme surfaces.`);
  const sourceFiles=[];const walk=d=>{for(const row of fs.readdirSync(d,{withFileTypes:true})){const sourcePath=path.join(d,row.name);if(row.isDirectory())walk(sourcePath);else if(row.isFile()&&/\.(?:js|html)$/.test(row.name))sourceFiles.push(sourcePath);}};walk(folder);
  const aliases=collectCoreAliases(sourceFiles.map(sourcePath=>fs.readFileSync(sourcePath,'utf8')).join('\n'));
  const audit=inspectPluginCss(cssRaw,{path:`src/plugins/${e.name}/plugin.css`,aliases});
  for(const issue of audit.issues)violations.push(`${issue.code}: ${issue.message}`);
}
if(violations.length){console.error(violations.join('\n'));process.exit(1);}
console.log(`Style architecture OK: ${authored.length} authored CSS files, 0 !important, layered ownership active.`);
