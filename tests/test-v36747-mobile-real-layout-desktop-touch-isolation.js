'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json'),mobilePkg=json('mobile/package.json'),expo=json('mobile/app.json').expo;
{const [major,minor,patch]=String(pkg.version).split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=47))),'v3.67.47+ app version must retain real-layout isolation.');}
assert(mobilePkg.version===require('../package.json').version||/^0\.8\.(?:3[3-9]|[4-9]\d|\d{3,})$/.test(mobilePkg.version),'Mobile package version must retain the real-layout acceptance baseline or use the synchronized app version.');
assert.strictEqual(expo.version,mobilePkg.version,'Expo and Mobile package versions must stay synchronized.');
assert(Number(expo.android.versionCode)>=44,'Android versionCode must advance for v3.67.47.');

// Desktop must never inherit coarse-pointer geometry. Touch-enabled Windows
// laptops can report pointer:coarse, but native touch geometry belongs only to
// the native-client shell and shared touch.css must remain host-neutral.
const touch=read('src/styles/platform/touch.css');
const nativeShell=read('src/styles/platform/native-client-shell.css');
assert(!touch.includes('.react-native-client'),'Shared touch.css must not own React Native geometry.');
for(const selector of ['.toolbar-btn{','.project-tab{','.plugin-switch-track{','.plugin-card-actions button{']){
  const index=nativeShell.indexOf(selector);
  assert(index>=0,`Expected native coarse-pointer rule missing ${selector}`);
  const line=nativeShell.slice(nativeShell.lastIndexOf('\n',index)+1,nativeShell.indexOf('\n',index));
  assert(line.includes('html[data-dkds-host="mobile"].react-native-client.dkds-pointer-coarse'),`Native coarse-pointer ownership missing for ${selector}`);
}

assert(nativeShell.includes('--dkds-generic-button-min-height:var(--dkds-mobile-control-min-height,var(--dkds-touch-target,44px))')&&!/dkds-pointer-coarse\s+button:not\([^\{]+\)\s*\{[^}]*min-height/s.test(nativeShell),'Native coarse-pointer baseline must use semantic density slots so compact titlebar actions stay under their Structure-owned geometry without a fragile exclusion list.');
assert(!nativeShell.includes('.main-plot-tools button{min-height:'),'Native coarse-pointer policy must not directly resize canonical main-plot actions.');

// The user's gate-analysis screenshot is the respar-derived route. The Desktop
// plugin rule uses #resonanceDedicatedPage under <=1050px, so the Mobile rule
// must carry the same ID specificity before declaring its auto-fit grid.
const resonanceMobile=read('src/plugins/resonance-workbench/mobile.css');
const specific='#resonanceDedicatedPage [data-dkds-mobile-region="route"][data-dkds-mobile-active="true"].respar-derived :where(.reswin-two-col,.reswin-gate-grid){';
assert(resonanceMobile.includes(specific),'Mobile derived-route grid must outrank the Desktop <=1050px single-column ID rule.');
assert(resonanceMobile.includes('grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))'),'Derived scientific charts must pack by real available width.');
const resonanceManifest=json('src/plugins/resonance-workbench/plugin.json');
{const [major,minor,patch]=String(resonanceManifest.version).split('.').map(Number);assert(major>3||(major===3&&(minor>61||(minor===61&&patch>=17))),'Resonance Workbench version must retain the real gate-grid fix.');}
{
  let runtimeManifest=null;
  const sandbox={DKDSPlugins:{define:(manifest)=>{runtimeManifest=manifest;}}};
  vm.createContext(sandbox);
  vm.runInContext(read('src/plugins/resonance-workbench/plugin.js'),sandbox,{filename:'src/plugins/resonance-workbench/plugin.js'});
  assert(runtimeManifest&&runtimeManifest.id===resonanceManifest.id,'Runtime Resonance manifest must define the plugin.json id.');
  assert.strictEqual(runtimeManifest.version,resonanceManifest.version,'Runtime Resonance version must match plugin.json.');
}

// Plugin cards need a minimum readable width, not a fixed width. A fixed 320px
// max track caused the large unused area shown on the actual tablet.
const shell=read('src/styles/platform/native-client-shell.css');
const flexible='.plugin-manager-section-list{grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:7px;width:100%;justify-content:stretch}';
assert(shell.includes(flexible),'Plugin Manager must stretch auto-fit tracks to fill the complete row.');
assert(!shell.includes('repeat(auto-fill,minmax(min(320px,100%),320px))'),'The obsolete fixed 320px card track must not return.');
assert(shell.includes('.plugin-card-actions{flex:0 0 auto;min-width:max-content;flex-wrap:nowrap}'),'Card action groups must remain readable when tracks resize.');

for(const rel of ['src/styles/platform/touch.css','src/plugins/resonance-workbench/mobile.css','src/styles/platform/native-client-shell.css'])
  assert(!read(rel).includes('!important'),`${rel} must remain free of patch-style !important overrides.`);

console.log('v3.67.47 real-layout acceptance PASS: Desktop touch geometry is isolated, Resonance mobile grids outrank Desktop breakpoints, and plugin cards fill their row.');
