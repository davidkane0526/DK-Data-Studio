'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const plugin=read('src/plugins/pulse-sampler-tool/plugin.js');
const css=read('src/plugins/pulse-sampler-tool/plugin.css');
const mobile=read('src/plugins/pulse-sampler-tool/mobile.css');

assert(!plugin.includes('ps-analysis-command-surface dkds-toolbar'),'Pulse sampling multi-row command surface must not impersonate a Core toolbar on Desktop.');
assert(plugin.includes('ps-analysis-command-surface dkds-surface'),'Pulse sampling command area must use a neutral Core surface identity.');
assert(css.includes('.ps-analysis-command-surface{display:grid;grid-template-rows:auto auto;'),'Desktop sampling command surface must remain a two-row grid.');
assert(css.includes('grid-template-columns:minmax(220px,1.45fr) repeat(4,minmax(118px,.8fr)) minmax(148px,.72fr)'),'Desktop extraction controls must keep the v3.68.19 explicit aligned six-cell row instead of returning to the visually unstable auto-fit layout.');
assert(css.includes('.ps-result-controls{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr)) repeat(2,minmax(132px,.62fr));'),'Desktop X/Y + result actions must stay on one aligned compact second row.');
assert(mobile.includes('[data-dkds-mobile-region="route"][data-dkds-mobile-active="true"] .ps-analysis-controls'),'Mobile density changes must remain inside the mobile presentation stylesheet.');
assert(!css.includes('html[data-dkds-host="mobile"]'),'Shared Pulse CSS must not carry Mobile host geometry.');
console.log('v3.68.18 Pulse desktop layout isolation PASS: multi-row sampling controls no longer consume toolbar row geometry, Desktop rows are deterministic, Mobile density stays isolated.');
