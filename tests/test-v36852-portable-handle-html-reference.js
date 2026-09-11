'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};

assert(atLeast(json('package.json').version,'3.68.52'));
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
const paint=read('src/styles/presentation/plugin-chrome.css');
const shell=read('src/styles/presentation/shell.css');
const runtime=read('src/core/ui/modules/layout/portable-view.js');
const mobile=read('src/styles/platform/native-workspace-presentation.css');

// 3.68.52 established the accepted 36 / 28 / 25 corner geometry. Later
// refinement may soften material but must not replace that geometry with a
// single filled triangle or paint the rectangular hit target.
assert(structure.includes('right:0;bottom:0;z-index:12;width:36px;height:36px'),'Resize handle hit area must remain 36×36 and corner-anchored.');
assert(structure.includes('clip-path:polygon(100% 0,100% 100%,0 100%)'),'The visible material must remain clipped to the accepted corner geometry.');
assert(structure.includes('width:18px;height:18px')&&structure.includes('width:15px;height:15px'),'Accepted 18/15 edge-inner geometry must remain exact.');
assert(!shell.includes('--dkui-portable-corner-'),'Shell-level resize-handle color tokens must stay retired.');
assert(paint.includes('color-mix(in srgb,var(--dkui-component-floating-chrome-indicator'),'Outer clipped geometry must consume active Theme floatingChrome indicator.');
assert(paint.includes('color-mix(in srgb,var(--dkui-component-floating-chrome-border-active'),'Inner clipped geometry must consume active Theme floatingChrome border-active color.');
assert(!paint.includes('backdrop-filter')&&!shell.includes('--dkui-portable-corner-blur'),'Accepted flat material must not acquire backdrop blur.');
assert(!/portable-corner-(?:inner|glass):[^;]*surface/i.test(shell),'Inner triangle must not derive from the panel surface color.');
const handlePaint=(paint.match(/\.dkds-portable-resize-handle\{[\s\S]*?\.plugin-card-icon/)||[''])[0];
assert(!handlePaint.includes('border-top:1px')&&!handlePaint.includes('border-left:1px')&&!handlePaint.includes('rotate(-45deg)'),'Do not add a fold crease, border flap or diagonal slash.');
assert(runtime.includes("resizeHandle.setAttribute('aria-orientation','horizontal');resizeHandle.tabIndex=0"),'Core handle must remain keyboard-focusable.');
assert(!mobile.includes('>.dkds-portable-resize-handle::before')&&!mobile.includes('>.dkds-portable-resize-handle::after'),'Mobile must consume the same Core handle geometry/paint.');
console.log('v3.68.52+ accepted PortableView geometry contract PASS.');
