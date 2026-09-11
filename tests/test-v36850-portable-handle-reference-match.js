'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(json('package.json').version,'3.68.50'));

const windowCss=read('src/plugin-window/style.css');
assert(windowCss.includes('--dkds-plugin-window-shell-gap:6px'),'Dedicated windows must expose the shared 6px titlebar/content separator.');
assert(windowCss.includes('grid-template-rows:52px var(--dkds-plugin-window-shell-gap) minmax(0,1fr)'),'Dedicated windows must reserve the separator as a real layout track.');

const portableGeometry=read('src/styles/structure/sdk-semantic-surfaces.css');
const portablePaint=read('src/styles/presentation/plugin-chrome.css');
const shell=read('src/styles/presentation/shell.css');
assert(portableGeometry.includes('width:36px;height:36px'),'Portable handle must retain the 36×36 hit footprint.');
assert(portableGeometry.includes('width:18px;height:18px')&&portableGeometry.includes('width:15px;height:15px')&&portableGeometry.includes('.dkds-portable-resize-handle::after'),'Portable handle must preserve the accepted 18×18 outer silhouette with the accepted 18/15 edge-inner geometry.');
assert(portableGeometry.includes('clip-path:polygon(100% 0,100% 100%,0 100%)'),'Portable handle must retain the exact corner-anchored triangular silhouette accepted in 3.68.52.');
assert(!shell.includes('--dkui-portable-corner-'),'Portable handle colors must be owned by active Theme component appearance, not shell-level literals/mixes.');
assert(!portablePaint.includes('backdrop-filter')&&portablePaint.includes('.dkds-portable-resize-handle.is-dragging::before'),'Portable handle must stay flat while retaining active drag treatment.');

const sync=read('mobile/scripts/sync-web-assets.js');
assert(!sync.includes("'semver-compat.js'"),'Mobile sync must not reference the retired semver compatibility bridge.');
assert(json('mobile/app.json').expo.android.versionCode>=82,'Android versionCode must remain at or above the flat corner-glass portable handle baseline.');

console.log('v3.68.50+ portable handle + current mobile sync contract PASS.');
