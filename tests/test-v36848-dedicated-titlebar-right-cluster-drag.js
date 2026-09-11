
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(pkg.version,'3.68.48'));

const html=read('src/plugin-window/index.html');
const style=read('src/plugin-window/style.css');
const chrome=read('src/plugin-window/chrome.js');
const aux=read('desktop/main-modules/auxiliary-window-runtime.js');

assert(html.indexOf('pluginWindowTitle') < html.indexOf('pluginWindowHeadingDivider') && html.indexOf('pluginWindowHeadingDivider') < html.indexOf('pluginWindowDragSpacer') && html.indexOf('pluginWindowDragSpacer') < html.indexOf('pluginWindowActions') && html.indexOf('pluginWindowActions') < html.indexOf('pluginWindowCommandbar'),'Dedicated titlebar DOM must be title/version | draggable spacer | registered actions | window controls.');
assert(style.includes('grid-template-columns:minmax(0,max-content) auto minmax(0,1fr) auto auto'),'Dedicated titlebar must use a dedicated flexible drag spacer before the compact right action cluster.');
assert(style.includes('.plugin-window-actions{min-width:0;max-width:100%;display:flex;align-items:center;justify-content:flex-end')&&style.includes('justify-self:end'),'Registered actions must stay right-aligned next to the window controls.');
assert(style.includes('.plugin-window-drag-spacer{min-width:0;align-self:stretch;-webkit-app-region:drag}'),'The flexible unused titlebar span must remain draggable.');
assert(!/\.plugin-window-actions\{[^}]*-webkit-app-region:no-drag/.test(style)&&!/\.plugin-window-action-zone\{[^}]*-webkit-app-region:no-drag/.test(style),'Only actual interactive controls may opt out of window dragging; empty action-zone space must remain draggable.');
assert(style.includes('.plugin-window-titlebar .window-commandbar')&&style.includes('-webkit-app-region:drag;pointer-events:auto'),'Empty command-bar padding/gaps must remain draggable.');
assert(style.includes('.plugin-window-titlebar :where(button,a,input,select,textarea,[role="button"]){-webkit-app-region:no-drag;pointer-events:auto}'),'Actual titlebar controls must remain clickable no-drag islands.');
assert(chrome.includes("headingDivider=$('#pluginWindowHeadingDivider')")&&chrome.includes("headingDivider.classList.toggle('hidden',!(pluginHas||coreHas))"),'The title/version divider must track whether the right action cluster exists.');
assert(chrome.includes('actionToCommandGap:actionsRect&&commandbar?Math.max(0,commandbar.x-actionsRect.right):null'),'Dedicated diagnostics must expose action-to-window-control proximity.');
assert(aux.includes('dedicated action cluster drifted away from window controls'),'Electron smoke must fail if registered actions drift away from the window buttons.');
console.log('v3.68.48 dedicated titlebar right-cluster + full-empty-drag contract PASS.');
