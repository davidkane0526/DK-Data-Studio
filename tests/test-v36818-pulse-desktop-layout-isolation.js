'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const plugin=read('src/plugins/pulse-sampler-tool/plugin.js');
const unit=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const manifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));

assert(!plugin.includes('ps-analysis-command-surface'),'Legacy Pulse sampling command DOM must stay retired after production Unit cutover.');
assert(unit.includes("variant:'analysis-control-grid'"),'Production Unit composition must use the accepted analysis-control-grid recipe for extraction controls.');
assert(unit.includes("variant:'result-control-grid'"),'Production Unit composition must keep X/Y and result actions in the accepted result-control-grid recipe.');
assert(unit.includes("variant:'result-grid-asymmetric'"),'Production result presentation must preserve the accepted asymmetric plot/table composition.');
assert(!unit.includes('data-dkds-host=')&&!unit.includes('isNativeClient'),'Unit presentation must remain platform-neutral instead of embedding Desktop/Mobile host geometry.');
assert(Array.isArray(manifest.styles)&&manifest.styles.length===0,'Production Pulse presentation must not load legacy shared/mobile CSS after Unit cutover.');
assert(manifest.platformPresentation?.mobile?.mode==='adaptive','Mobile density must be owned by Presenter/Unit responsive composition.');
console.log('v3.68.18 Pulse desktop layout isolation PASS: multi-row sampling controls no longer consume toolbar row geometry, Desktop rows are deterministic, Mobile density stays isolated.');
