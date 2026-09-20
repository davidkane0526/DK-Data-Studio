'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const readComposition=require('./helpers/read-composition');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const walk=(dir,out=[])=>{for(const name of fs.readdirSync(dir)){const full=path.join(dir,name),st=fs.statSync(full);if(st.isDirectory())walk(full,out);else out.push(full);}return out;};



// Domain workbench CSS belongs to each plugin. Core authored CSS may only target
// semantic Core roles, never TER/Pulse/Data Center/Resonance DOM identities.
const coreCssFiles=walk(path.join(root,'src','styles')).filter(file=>file.endsWith('.css'));
const domainSelector=/(?:\.(?:ter|pulse|dc|respar|reswin)[-_]|#(?:ter|pulse|resonanceDedicatedPage|reswin|respar))/i;
for(const file of coreCssFiles){
  const text=fs.readFileSync(file,'utf8');
  assert(!domainSelector.test(text),`${path.relative(root,file)} owns a domain-plugin selector; move domain geometry into manifest-owned plugin.css.`);
}

const ownedPlugins=['connectivity-center','data-center','pulse-analysis','resonance-workbench'];
for(const id of ownedPlugins){
  const manifest=json(`src/plugins/${id}/plugin.json`);
  assert(Array.isArray(manifest.styles)&&manifest.styles.includes('plugin.css'),`${id} must declare static domain CSS through manifest.styles.`);
  assert(fs.existsSync(path.join(root,'src','plugins',id,'plugin.css')),`${id}/plugin.css is missing.`);
  for(const js of walk(path.join(root,'src','plugins',id)).filter(file=>file.endsWith('.js'))){
    assert(!fs.readFileSync(js,'utf8').includes('ctx.ui.styles.add('),`${path.relative(root,js)} injects static CSS at runtime; use manifest.styles.`);
  }
}


// TER is the first source-parity production reconstruction. Core/Units own
// semantics/material/lifecycle; the plugin retains its accepted geometry-only
// stylesheet until all plugins have completed 1:1 reconstruction.
const terManifest=json('src/plugins/ter-analysis/plugin.json');
assert.deepStrictEqual(terManifest.styles,['plugin.css'],'TER source parity must declare its accepted geometry-only plugin.css.');
const terCss=read('src/plugins/ter-analysis/plugin.css');
assert(!/(?:^|[;{}]\s*)(?:background(?:-color)?|color|border(?:-[\w-]+)?|box-shadow|text-shadow|font(?:-family|-size|-weight)?|filter|backdrop-filter)\s*:/mi.test(terCss),'TER source-parity plugin.css may own geometry only, never paint/theme.');
for(const js of walk(path.join(root,'src','plugins','ter-analysis')).filter(file=>file.endsWith('.js'))){
  assert(!fs.readFileSync(js,'utf8').includes('ctx.ui.styles.add('),`${path.relative(root,js)} must not inject a second TER style owner at runtime.`);
}

// Shared and host-selected plugin styles have two explicit, ordered cascade owners.
const styleLoader=readComposition(root,'src/core/plugins/kernel');
assert(styleLoader.includes("requestedLayer==='dkds.plugin-platform'?'dkds.plugin-platform':'dkds.plugin'")&&styleLoader.includes('`@layer ${layer}'), 'Plugin stylesheet lifecycle must stay bounded to shared dkds.plugin or host-selected dkds.plugin-platform layers.');

// Mobile/plot infrastructure observes semantic markers instead of named plugins.
const mobile=read('src/core/host/mobile-host-runtime.js'),presentation=read('src/core/ui/modules/presentation/model.js');
assert(!mobile.includes('[data-dkds-inline-summary]')&&!mobile.includes('#reswinSummary')&&!mobile.includes('#terSummary')&&!presentation.includes('querySelector'),'Mobile shell state must now come from the DOM-blind Core Presentation Model rather than summary-node observation.');
const curves=readComposition(root,'src/core/ui/composition');
assert(curves.includes('[data-dkds-legend]')&&curves.includes('[data-dkds-plot-scope]'),'Scientific navigation collision handling must use semantic legend/scope markers.');
assert(!/respar-main-legend|respar-peak-legend|reswin-group-legend/.test(curves),'Scientific Core must not know Resonance legend selectors.');

// This release is a reduction checkpoint: debt ceilings may only move down.
const importantTotal=coreCssFiles.reduce((sum,file)=>sum+(fs.readFileSync(file,'utf8').match(/!important/g)||[]).length,0);
assert.equal(importantTotal,0,'Authored Core CSS must not use !important; use cascade ownership layers.');
assert(!fs.existsSync(path.join(root,'src','styles','base'))&&!fs.existsSync(path.join(root,'src','styles','modern')),'Legacy base/modern specificity directories must not return.');
const cascade=read('src/core.css');
for(const layer of ['foundation','plugin','plugin-platform','structure','presentation','theme','platform','window'])assert(cascade.includes(`dkds.${layer}`),`Core cascade is missing dkds.${layer}.`);

console.log('v3.61.86 CSS ownership PASS: plugin geometry is manifest-owned; Core is domain-neutral; !important debt=0 and cascade ownership is explicit.');
