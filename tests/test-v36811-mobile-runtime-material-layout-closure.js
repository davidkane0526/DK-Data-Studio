#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(json('package.json').version,'3.68.11'),'v3.68.11+ source required.');

// 1) The Theme panel must not require a Desktop/Mobile identity in Plugin API.
// The React Native status bar is outside the WebView, so Native Core publishes a
// zero renderer-statusbar height while Desktop retains the ordinary 28px token.
// This is the real causal chain v3.68.10 failed to verify.
const pluginApi=read('src/core/plugins/kernel/modules/plugin-api.js');
const sdkTypes=read('sdk/plugin-api.d.ts');
assert(!pluginApi.includes('isNativeClient:!!state.host'),'Supported Plugin API must remain platform-neutral.');
assert(!sdkTypes.includes('isNativeClient:boolean'),'SDK runtime contract must not expose Desktop/Mobile presentation identity.');

const statusPlugin=read('src/plugins/status-monitor/plugin.js');
const themeLayout=read('src/plugins/status-monitor/theme-layout.js');
const nativeShell=read('src/styles/platform/native-client-shell.css');
assert(!statusPlugin.includes('ctx.runtime?.isNativeClient'),'Theme picker must not branch on Mobile identity.');
assert(themeLayout.includes("const fallbackBottom='calc(var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px))'"),'Theme picker must consume generic renderer status-bar geometry plus the shared status-popover gap.');
assert(nativeShell.includes('html[data-dkds-host="mobile"].react-native-client{--dkds-statusbar-height:0px}'),'Native WebView must publish zero internal status-bar height because RN owns the real bar outside the WebView.');
{
  const context={globalThis:{}};context.globalThis=context;vm.createContext(context);vm.runInContext(themeLayout,context);
  const patches=[];const dom={style:(_el,patch)=>patches.push(patch)};
  const panel={classList:{contains:()=>false},getBoundingClientRect:()=>({width:420,height:380})};
  context.DKDSStatusMonitorThemeLayout.positionThemePanel({dom,panel,anchor:{x:900},viewport:{innerWidth:1200,innerHeight:800}});
  assert.strictEqual(patches.at(-1).bottom,'calc(var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px))','Theme panel must anchor through the generic status-bar and shared popover-gap tokens.');
}

// 2) Mobile projection must have one visible Material paint owner. The frame
// consumes the region role/recipe; reparented plugin content becomes transparent
// composition instead of repainting an opaque Desktop surface over Thin Glass.
const projection=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const material=read('src/styles/theme/material-renderer.css');
assert(projection.includes("if(region==='drawer'||region==='companion-right')return 'sidebar'"),'Non-parameter drawer/right projection frames must consume sidebar Material semantics.');
assert(projection.includes("node.dataset.dkdsMaterialContent='true';node.dataset.dkdsMaterialContentOwner='mobile-presentation'"),'Projected live content must declare parent-owned Material composition.');
assert(projection.includes("if(node?.dataset?.dkdsMaterialContentOwner==='mobile-presentation'){delete node.dataset.dkdsMaterialContent;delete node.dataset.dkdsMaterialContentOwner;}"),'Material composition marker must be removed when the node returns home.');
assert(material.includes('[data-dkds-material-surface="core"] > [data-dkds-material-content="true"]'),'Core Material CSS must flatten a projected child under its frame owner.');
const drawerPaint=material.match(/html\[data-dkds-host="mobile"\]\.react-native-client body\.dkds-modern-ui\s*\n\.dkds-mobile-surface-frame\[data-dkds-mobile-frame-region="drawer"\]\{([^}]*)\}/);
assert(drawerPaint,'Native drawer Material composition block must exist.');
for(const forbidden of ['background:','background-color:','background-image:','box-shadow:','border-color:'])assert(!drawerPaint[1].includes(forbidden),`Native drawer must not hard-code ${forbidden} over the active material recipe.`);
assert(drawerPaint[1].includes('border-width:1px')&&drawerPaint[1].includes('border-style:solid'),'Drawer may define edge geometry while recipe owns paint.');

// 3) Inactive Mobile surfaces must stop reserving Desktop dock tracks immediately,
// not only after opening the drawer moves the node and triggers childList mutation.
const analysis=read('src/core/ui/modules/workbench/analysis.js');
const workbench=read('src/core/ui/modules/workbench/plugin.js');
for(const [name,source] of [['analysis',analysis],['plugin canvas',workbench]]){
  assert(source.includes("node.dataset?.dkdsMobileActive!=='false'"),`${name} visibility must ignore inactive Mobile surfaces.`);
  assert(source.includes("attributes:true,attributeFilter:['data-dkds-mobile-active']"),`${name} observer must resync when Mobile active state changes in place.`);
  assert(source.includes('subtree:true'),`${name} observer must see the child surface attribute transition.`);
}

// 4) The v3.68.11 Mobile-only width reduction remains frozen. Later patches may
// further reduce vertical density, but the scientific control must continue to
// consume the shared item-height slot rather than a raw generic touch minimum.
assert(nativeShell.includes('--dkds-scientific-nav-item-width:22.5px;'),'Native scientific floating action width must remain 22.5 px.');
assert(nativeShell.includes('--dkds-scientific-nav-item-height:'),'Native scientific floating actions must publish a dedicated item-height slot.');
const desktopTouch=read('src/styles/platform/touch.css');
assert(desktopTouch.includes('--dkds-scientific-nav-item-width:25.2px;')&&desktopTouch.includes('--dkds-scientific-nav-item-height:25.2px;'),'Desktop scientific chrome must retain the accepted 25.2 × 25.2 px geometry.');

console.log('v3.68.11 Mobile statusbar geometry + Material drawer + dock resync + compact scientific chrome closure PASS');
