#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const TARGETS=[
  'resonance-workbench','transfer-vth-lab','ter-analysis','pulse-analysis','pulse-sampler-tool','data-center'
];
const NORMAL_EXCLUDES=new Set(['window-runtime.js','mobile-presentation.js']);
const CHECKS=Object.freeze({
  rawQuery:/\.(?:querySelector|querySelectorAll)\s*\(/g,
  rawListener:/\.addEventListener\s*\(/g,
  propertyHandler:/\.(?:onclick|onchange|oninput|onpointerdown|onpointermove|onpointerup|onkeydown|onkeyup)\s*=/g,
  rawHtml:/\.innerHTML\s*=/g,
  nativeDialog:/\bwindow\.(?:prompt|confirm|alert)\s*\(/g,
  privateObserver:/\bnew\s+MutationObserver\s*\(/g,
  rawTimer:/\b(?:setTimeout|setInterval|requestAnimationFrame)\s*\(/g,
  privateHostGlobal:/\bwindow\.(?:DKDSScience|DKDSData|DKDSScientificAlgorithms|DKDSCharts|DKDSPerformance)\b/g,
  moduleGlobal:/\bwindow\.DKDSPluginModules\b/g
});
function count(re,text){re.lastIndex=0;let n=0;while(re.exec(text))n++;return n;}
function manifestReachable(manifest){
  const names=new Set([manifest.entry,...(manifest.scripts||[])]);
  const win=manifest.window||{};
  if(win.runtime)names.add(win.runtime);
  for(const n of win.scripts||[])names.add(n);
  for(const n of (manifest.platformPresentation?.mobile?.scripts||[]))names.add(n);
  for(const task of manifest.tasks||[]){if(task?.entry)names.add(task.entry);for(const dependency of task?.imports||[])if(dependency)names.add(dependency);}
  return names;
}
function auditPlugin(folder){
  const dir=path.join(ROOT,'src','plugins',folder);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'plugin.json'),'utf8'));
  const reachable=manifestReachable(manifest);
  const js=fs.readdirSync(dir).filter(n=>n.endsWith('.js')).sort();
  const orphan=js.filter(n=>!reachable.has(n));
  const normal=js.filter(n=>!NORMAL_EXCLUDES.has(n));
  const totals=Object.fromEntries(Object.keys(CHECKS).map(k=>[k,0]));
  const byFile=[];
  for(const name of normal){
    const text=fs.readFileSync(path.join(dir,name),'utf8');
    const row={file:name};let dirty=false;
    for(const [key,re] of Object.entries(CHECKS)){const n=count(re,text);row[key]=n;totals[key]+=n;if(n)dirty=true;}
    if(dirty)byFile.push(row);
  }
  return {folder,id:manifest.id,version:manifest.version,normalFiles:normal.length,orphan,totals,byFile};
}
const report={generatedAt:new Date().toISOString(),plugins:TARGETS.map(auditPlugin)};
report.summary={
  plugins:report.plugins.length,
  orphanFiles:report.plugins.reduce((n,p)=>n+p.orphan.length,0),
  rawDomLifecycle:report.plugins.reduce((n,p)=>n+p.totals.rawQuery+p.totals.rawListener+p.totals.propertyHandler+p.totals.rawHtml,0),
  nativeDialogs:report.plugins.reduce((n,p)=>n+p.totals.nativeDialog,0),
  privateObservers:report.plugins.reduce((n,p)=>n+p.totals.privateObserver,0),
  rawTimers:report.plugins.reduce((n,p)=>n+p.totals.rawTimer,0),
  privateHostGlobals:report.plugins.reduce((n,p)=>n+p.totals.privateHostGlobal,0)
};
if(process.argv.includes('--json')){console.log(JSON.stringify(report,null,2));process.exit(0);}
console.log('Native analysis SDK audit (normal runtimes; dedicated window/mobile host adapters excluded)');
for(const p of report.plugins){
  const t=p.totals;
  const lifecycle=t.rawQuery+t.rawListener+t.propertyHandler+t.rawHtml;
  console.log(`${p.folder.padEnd(24)} lifecycle=${String(lifecycle).padStart(3)} dialogs=${String(t.nativeDialog).padStart(2)} observer=${String(t.privateObserver).padStart(2)} timer=${String(t.rawTimer).padStart(2)} host-global=${String(t.privateHostGlobal).padStart(2)} orphan=${p.orphan.length}`);
}
console.log(`TOTAL: lifecycle=${report.summary.rawDomLifecycle}, dialogs=${report.summary.nativeDialogs}, observer=${report.summary.privateObservers}, timer=${report.summary.rawTimers}, host-global=${report.summary.privateHostGlobals}, orphan=${report.summary.orphanFiles}`);
if(process.argv.includes('--strict')){
  const bad=report.plugins.filter(p=>p.orphan.length||p.totals.rawQuery||p.totals.rawListener||p.totals.propertyHandler||p.totals.rawHtml||p.totals.nativeDialog||p.totals.privateObserver||p.totals.rawTimer||p.totals.privateHostGlobal);
  if(bad.length)process.exit(1);
}
