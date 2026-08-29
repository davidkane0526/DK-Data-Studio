'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const debug=read('src/core/theme/debug-runtime.js');
const devtools=read('src/core/plugins/devtools.js');
const css=read('src/styles/presentation/plugin-devtools.css');

assert(/^3\.(?:6[5-9]|[7-9]\d)\./.test(pkg.version)||Number(pkg.version.split('.')[0])>3,'v3.65.3 dev-overlay regression requires app 3.65.3 or newer');
assert(/const VERSION='2\.[1-9]\.0'/.test(debug),'Theme Inspector runtime must remain on the 2.x developer-overlay contract or newer');
for(const token of ['const pauseOwners=new Set()','function pause(owner=', 'function resume(owner=', 'isPaused', 'data-theme-debug-act="exit"', "if(event.key!=='Escape'||isPaused())return;disable()"]){
  assert(debug.includes(token),`Theme Inspector ownership missing ${token}`);
}
assert(!debug.includes('z-index:2147483647'),'Theme Inspector must not bypass Core DevTool stacking with maximum z-index');
for(const token of ["const VERSION='1.2.0'","debug?.pause?.('devtools')","window.DKDSThemeDebug?.resume?.('devtools')","if(debug?.isEnabled?.()&&tab==='overview')tab='theme'","if(e.target===overlay){close();return;}","event.key==='Escape'"]){
  assert(devtools.includes(token),`Plugin DevTools overlay ownership missing ${token}`);
}
assert(css.includes('.dkds-plugin-devtools{position:fixed;inset:0;z-index:12000'),'Plugin DevTools must own the higher developer-overlay stack');
assert(css.includes('.dkds-theme-debug-overlay{position:fixed;z-index:11900'),'Theme Inspector HUD must remain below Plugin DevTools');
assert(css.includes('.dkds-theme-debug-exit{pointer-events:auto'),'Theme Inspector must expose a directly clickable exit control');
console.log('v3.65.3 developer overlay ownership, close paths, Escape behavior and Theme Inspector pause/resume contracts passed.');
