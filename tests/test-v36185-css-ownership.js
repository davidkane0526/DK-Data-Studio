'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const walk=(dir,out=[])=>{for(const name of fs.readdirSync(dir)){const full=path.join(dir,name),st=fs.statSync(full);if(st.isDirectory())walk(full,out);else out.push(full);}return out;};

assert.equal(json('package.json').version,'3.61.85','current-version assertion is synchronized by set-version');

// Domain workbench CSS belongs to each plugin. Core authored CSS may only target
// semantic Core roles, never TER/Pulse/Data Center/Resonance DOM identities.
const coreCssFiles=walk(path.join(root,'src','styles')).filter(file=>file.endsWith('.css'));
const domainSelector=/(?:\.(?:ter|pulse|dc|respar|reswin)[-_]|#(?:ter|pulse|resonanceDedicatedPage|reswin|respar))/i;
for(const file of coreCssFiles){
  const text=fs.readFileSync(file,'utf8');
  assert(!domainSelector.test(text),`${path.relative(root,file)} owns a domain-plugin selector; move domain geometry into manifest-owned plugin.css.`);
}

const ownedPlugins=['connectivity-center','data-center','pulse-analysis','resonance-workbench','ter-analysis'];
for(const id of ownedPlugins){
  const manifest=json(`src/plugins/${id}/plugin.json`);
  assert(Array.isArray(manifest.styles)&&manifest.styles.includes('plugin.css'),`${id} must declare static domain CSS through manifest.styles.`);
  assert(fs.existsSync(path.join(root,'src','plugins',id,'plugin.css')),`${id}/plugin.css is missing.`);
  for(const js of walk(path.join(root,'src','plugins',id)).filter(file=>file.endsWith('.js'))){
    assert(!fs.readFileSync(js,'utf8').includes('ctx.ui.styles.add('),`${path.relative(root,js)} injects static CSS at runtime; use manifest.styles.`);
  }
}

// Built-in and packaged plugin styles use the same cascade slot. Plugin layout
// comes after base structure and before modern/theme chrome so activation order
// cannot silently turn plugin CSS into a late theme override.
const styleLoader=read('src/core/plugin-kernel/30-project-pages-panels.inc');
assert(styleLoader.includes('ui-modern\\.css')&&styleLoader.includes('insertBefore(el, modern)'),'Plugin stylesheet lifecycle must insert manifest CSS before ui-modern.css.');

// Mobile/plot infrastructure observes semantic markers instead of named plugins.
const mobile=read('src/core/mobile-host-runtime.js');
assert(mobile.includes('[data-dkds-mobile-summary]')&&!mobile.includes('#reswinSummary')&&!mobile.includes('#terSummary'),'Mobile summary observation must be semantic and plugin-neutral.');
const curves=read('src/core/ui-infrastructure/40-scientific-curves.inc');
assert(curves.includes('[data-dkds-legend]')&&curves.includes('[data-dkds-plot-scope]'),'Scientific navigation collision handling must use semantic legend/scope markers.');
assert(!/respar-main-legend|respar-peak-legend|reswin-group-legend/.test(curves),'Scientific Core must not know Resonance legend selectors.');

// This release is a reduction checkpoint: debt ceilings may only move down.
const importantTotal=coreCssFiles.reduce((sum,file)=>sum+(fs.readFileSync(file,'utf8').match(/!important/g)||[]).length,0);
const modernImportant=coreCssFiles.filter(file=>file.includes(`${path.sep}modern${path.sep}`)).reduce((sum,file)=>sum+(fs.readFileSync(file,'utf8').match(/!important/g)||[]).length,0);
assert(importantTotal<=1492,`authored Core CSS !important debt regressed (${importantTotal}>1492).`);
assert(modernImportant<=651,`modern Core CSS !important debt regressed (${modernImportant}>651).`);

console.log(`v3.61.85 CSS ownership PASS: plugin geometry is manifest-owned; Core is domain-neutral; !important debt=${importantTotal}/${modernImportant}.`);
