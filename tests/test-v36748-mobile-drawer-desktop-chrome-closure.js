'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json'),mobilePkg=json('mobile/package.json'),expo=json('mobile/app.json').expo;
const versionParts=String(pkg.version).split('.').map(Number);
assert(versionParts[0]>3||(versionParts[0]===3&&(versionParts[1]>67||(versionParts[1]===67&&versionParts[2]>=48))),'v3.67.48 drawer/Desktop chrome fixes must remain present in later releases.');
const mobileVersionParts=String(mobilePkg.version).split('.').map(Number);
assert(mobilePkg.version===require('../package.json').version||(mobileVersionParts[0]===0&&mobileVersionParts[1]===8&&mobileVersionParts[2]>=34),'Mobile drawer acceptance fixes must retain the 0.8.34 baseline or use the synchronized app version.');
assert.strictEqual(expo.version,mobilePkg.version,'Expo and Mobile package versions must remain synchronized.');
assert(Number(expo.android.versionCode)>=45,'Android versionCode must advance for v3.67.48.');

// Desktop coarse-pointer hardware must not consume Mobile touch geometry.
const touch=read('src/styles/platform/touch.css'),nativeShell=read('src/styles/platform/native-client-shell.css');
assert(!touch.includes('.react-native-client'),'Shared touch.css must not own native page/control geometry.');
for(const selector of ['.toolbar-btn{','.project-tab{','.plugin-switch-track{','.plugin-card-actions button{']){
  const index=nativeShell.indexOf(selector);assert(index>=0,`Missing native coarse geometry owner for ${selector}`);
  const line=nativeShell.slice(nativeShell.lastIndexOf('\n',index)+1,nativeShell.indexOf('\n',index));
  assert(line.includes('html[data-dkds-host="mobile"].react-native-client.dkds-pointer-coarse'),`Coarse geometry for ${selector} must be native-Mobile-only.`);
}
assert(nativeShell.includes('--dkds-generic-button-min-height:var(--dkds-mobile-control-min-height,var(--dkds-touch-target,44px))'),'Native coarse generic button geometry must now flow through the semantic density slot.');
assert(!/dkds-pointer-coarse\s+button:not\([^\{]+\)\s*\{[^}]*min-height/s.test(nativeShell),'Native coarse touch density must not return to a fragile catch-all exclusion list.');
assert(!nativeShell.includes('.main-plot-tools button{min-height:'),'Native touch density must not directly override canonical main-plot action geometry.');
const nav=read('src/styles/structure/sdk-semantic-surfaces.css');
assert(nav.includes('--dkds-scientific-nav-item-width:28px')&&nav.includes('--dkds-scientific-nav-item-height:28px'),'Shared scientific navigation must retain the frozen semantic geometry.');
const desktopNav=(touch.match(/html\[data-dkds-host="desktop"\] \.dkds-scientific-nav-tools\{[\s\S]*?\n\}/)||[])[0]||'';
assert(desktopNav.includes('--dkds-scientific-nav-item-width:25.2px')&&desktopNav.includes('--dkds-scientific-nav-item-height:25.2px'),'Desktop scientific floating buttons must be exactly 10% smaller than the shared 28 px baseline.');
const mobileNav=(nativeShell.match(/html\[data-dkds-host="mobile"\]\.react-native-client \.dkds-scientific-nav-tools\{[^}]+\}/)||[])[0]||'';
assert(mobileNav.includes('--dkds-scientific-nav-item-width:22.5px')&&mobileNav.includes('--dkds-scientific-nav-item-height:20.4px'),'Native Mobile scientific floating geometry must remain unchanged by Desktop-only tuning.');
const shellNav=read('src/styles/structure/shell-navigation.css'),schema=read('src/styles/structure/schema-and-plugin-ui.css'),appearance=read('src/styles/theme/component-appearance.css');
assert(/\.project-tab-close\{[\s\S]*?flex:0 0 20px;[\s\S]*?width:20px;[\s\S]*?height:20px;[\s\S]*?box-sizing:border-box;/.test(shellNav),'Project tab close must be a compact 20 px integrated hit region.');
assert(schema.includes('.project-tab-close,.dkds-panel-close-button'),'Generic button geometry must not enlarge the project close hit region.');
assert(appearance.includes('[data-dkds-component-identity="toolbarAction"].project-tab-close{border-radius:5px}'),'Project tab close must not render as a detached circular disc.');
assert(appearance.includes(':is(.project-tab-close,.dkds-panel-close-button,.window-control-btn,.dkds-portable-icon-action,#lanWebMinimizeBtn)'),'Project close idle paint must remain transparent through the canonical quiet action owner.');

// Drawer projection owns one vertical scroll axis. No horizontal scrollbar or
// browser resize corner may reserve a white strip/tail in the projected panel.
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const projectionContract=read('src/core/ui/modules/presentation/mobile-web-projection-contract.js');
for(const token of ["overflow:drawer?'visible':overlay?'auto':'visible'", "'overflow-x':drawer?'visible':overlay?'auto':'visible'", "'overflow-y':drawer?'visible':overlay?'auto':'visible'", "resize:overlay?'none':''"])
  assert(projectionContract.includes(token),`Projected PRIME must stay a non-scrolling content owner while the Mobile Drawer viewport owns scrolling; missing ${token}.`);
const workspace=read('src/styles/platform/native-workspace-presentation.css');
assert(workspace.includes('overflow-y:auto')&&workspace.includes('scrollbar-width:none')&&workspace.includes('container-name:dkds-mobile-drawer')&&workspace.includes('>.dkds-mobile-drawer-scroll::-webkit-scrollbar{display:none;width:0;height:0}'),'Drawer must own one vertical gesture-scroll axis while its overall right scrollbar remains hidden.');
assert(!/\[data-dkds-mobile-region=\"drawer\"\]\[data-dkds-mobile-active=\"true\"\]\{[^}]*padding-right:0/.test(workspace),'Core drawer projection must not erase plugin-owned content inset.');
assert(workspace.includes('>.dkds-surface-header{display:grid;grid-template-columns:minmax(0,1fr) auto')&&workspace.includes('@container dkds-mobile-drawer (max-width:360px)'),'Core Mobile Presenter geometry must make semantic drawer headers span/reflow across the complete panel width.');
assert(workspace.includes('right:-6px;top:50%;width:12px;height:72px')&&workspace.includes('width:2px;height:46px'),'Drawer resize affordance must straddle the outer edge so its 12 px hit region cannot cover parameter content.');
assert(workspace.includes('::-webkit-scrollbar-corner')&&workspace.includes('::-webkit-resizer{background:transparent}'),'Scrollbar corner/browser resizer paint must be explicitly transparent.');
const material=read('src/styles/theme/material-renderer.css');
assert(/\.dkds-mobile-drawer-resize-handle\{\s*background:transparent\s*\}/.test(material),'Drawer resize hit region must be visually transparent.');

// Resonance and Data Center own their local Mobile reflow while Core owns the
// generic drawer geometry.
const resonanceMobile=read('src/plugins/resonance-workbench/mobile.css');
const resonanceUnit=read('src/plugins/resonance-workbench/unit-presentation.js');
for(const token of ['container-name:resonance-parameters-mobile','grid-template-columns:auto minmax(72px,110px) auto','grid-template-columns:minmax(44px,max-content) minmax(0,1fr)'])
  assert(resonanceMobile.includes(token),`Resonance domain-row drawer reflow missing ${token}.`);
assert(resonanceUnit.includes("variant:'action-grid-2',className:'respar-scan-global dkds-mode-group'")&&resonanceUnit.includes("variant:'action-grid-2',className:'respar-detect-actions'"),'Resonance parameter action density must be Unit-owned.');
assert(resonanceUnit.includes("if(nativeMobile)units.layout.apply(display,{variant:'form-grid-2'})")&&resonanceUnit.includes('layoutSpec:nativeMobile?PARAMETER_INLINE_LABEL_LAYOUT:null')&&resonanceUnit.includes("maxWidth:310"),'Resonance Mobile field/display reflow must be declared through Unit responsive geometry, not plugin CSS.');
assert(!/respar-(?:scan-global|detect-actions)[^{]*\{[^}]*grid-template-columns/s.test(resonanceMobile),'Resonance mobile.css must not reclaim Unit-owned parameter action columns.');
const resonance=json('src/plugins/resonance-workbench/plugin.json');
{const [major,minor,patch]=String(resonance.version).split('.').map(Number);assert(major>3||(major===3&&(minor>61||(minor===61&&patch>=18))),'Resonance plugin version must retain the Mobile parameter layout.');}
{
  let runtimeManifest=null;
  const sandbox={DKDSPlugins:{define:(manifest)=>{runtimeManifest=manifest;}}};
  vm.createContext(sandbox);
  vm.runInContext(read('src/plugins/resonance-workbench/plugin.js'),sandbox,{filename:'src/plugins/resonance-workbench/plugin.js'});
  assert(runtimeManifest&&runtimeManifest.id===resonance.id,'Resonance runtime manifest must define the plugin manifest id.');
  assert.strictEqual(runtimeManifest.version,resonance.version,'Resonance runtime version must match plugin manifest.');
}
const dcMobile=read('src/plugins/data-center/mobile.css');
for(const token of ['container-name:data-center-artifacts-mobile','.dc-assignment-filter{','grid-template-columns:repeat(2,minmax(0,1fr))'])
  assert(dcMobile.includes(token),`Data Center drawer reflow missing ${token}.`);
assert(!dcMobile.includes('@container data-center-artifacts-mobile (max-width:339px)'),'Data Center drawer must keep hierarchy/field filters in the accepted two-column row at every valid width.');
const dc=json('src/plugins/data-center/plugin.json');
assert(/^1\.15\.(?:[8-9]|\d{2,})$/.test(dc.version),'Data Center must retain the denser native artifact-drawer version.');
{
  let runtimeManifest=null;
  const sandbox={DKDSPlugins:{define:(manifest)=>{runtimeManifest=manifest;}}};
  vm.createContext(sandbox);
  vm.runInContext(read('src/plugins/data-center/plugin.js'),sandbox,{filename:'src/plugins/data-center/plugin.js'});
  assert(runtimeManifest&&runtimeManifest.id===dc.id,'Data Center runtime manifest must define the plugin manifest id.');
  assert.strictEqual(runtimeManifest.version,dc.version,'Data Center runtime version must match plugin manifest.');
}

// Outside taps are transient-drawer dismissals and are consumed instead of
// activating controls behind the drawer.
{
  const prior={window:global.window,document:global.document,KeyboardEvent:global.KeyboardEvent};
  const listeners={};
  const activeDrawerFrame={
    dataset:{dkdsMobileSurfaceId:'parameters'},
    contains(){return false;}
  };
  global.window={DKDSPlugins:{activities:{active:()=> 'resonance'}}};
  global.document={
    addEventListener(type,fn){listeners[type]=fn;},
    querySelectorAll(selector){return selector.includes('dkds-mobile-frame-region="drawer"')?[activeDrawerFrame]:[];}
  };
  delete require.cache[require.resolve('../src/core/ui/modules/interaction/adapters')];
  const {MobileGestureAdapter}=require('../src/core/ui/modules/interaction/adapters');
  const seen=[];const adapter=new MobileGestureAdapter({dispatch:intent=>{seen.push(intent);return true;}});
  adapter.installDocumentBindings();
  let prevented=false,stopped=false;
  listeners.pointerdown({isPrimary:true,pointerType:'mouse',target:{closest(){return null;}},cancelable:true,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.strictEqual(seen.length,1,'An outside pointer press must dispatch exactly one drawer toggle intent.');
  assert.strictEqual(seen[0].type,'workspace.surface.activate','Outside press must dispatch a semantic surface intent.');
  assert.strictEqual(seen[0].payload.activityId,'resonance');
  assert.strictEqual(seen[0].payload.id,'parameters');
  assert(prevented&&stopped,'Outside dismissal must consume the press so it cannot activate UI behind the transient drawer.');
  if(prior.window===undefined)delete global.window;else global.window=prior.window;
  if(prior.document===undefined)delete global.document;else global.document=prior.document;
  if(prior.KeyboardEvent===undefined)delete global.KeyboardEvent;else global.KeyboardEvent=prior.KeyboardEvent;
}

for(const rel of ['src/styles/platform/touch.css','src/styles/structure/shell-navigation.css','src/styles/theme/component-appearance.css','src/styles/platform/native-workspace-presentation.css','src/styles/theme/material-renderer.css','src/plugins/resonance-workbench/mobile.css','src/plugins/data-center/mobile.css'])
  assert(!read(rel).includes('!important'),`${rel} must stay free of patch-style !important overrides.`);

console.log('v3.67.48 drawer/Desktop chrome closure PASS: Desktop touch geometry is isolated, project close is compact, drawers reflow and dismiss outside, and white gutter/corner artifacts are removed.');
