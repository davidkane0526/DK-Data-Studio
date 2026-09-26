'use strict';
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const tuple=v=>String(v).split('.').map(Number);
const atLeast=(v,min)=>{const a=tuple(v),b=tuple(min);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};

const pkg=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
assert(atLeast(pkg.version,'3.67.51'));
assert(atLeast(mobile.version,'0.8.37'));
assert(atLeast(expo.version,'0.8.37'));
assert(Number(expo.android.versionCode)>=48);

// Desktop plot chrome: export menu is an ordinary quiet titlebar action, never
// a placement trigger. Scientific floating tools are compact and CSS-viewport adaptive.
const chart=read('src/core/ui/modules/plot-view/chart.js');
const touch=read('src/styles/platform/touch.css');
assert(chart.includes("b.className='dkds-plot-view-action dkds-plot-view-menu-trigger'"));
assert(!chart.includes("dkds-plot-view-menu-trigger dkds-portable-placement-trigger"));
assert(chart.includes("b.dataset.dkdsComponentVariant='quiet'"));
assert(touch.includes('--dkds-scientific-nav-item-width:22.176px;'),'Desktop scientific navigation must retain the accepted 22.176px width contract.');
assert(touch.includes('--dkds-scientific-nav-item-height:25.2px;'),'Desktop scientific navigation must retain the accepted 25.2px height contract.');
assert(touch.includes('.dkds-plot-view-actions>.dkds-plot-view-menu-trigger'));

// Canonical appearance owns the fixes for titlebar hover depth, list-row rims,
// and native Chromium number spinners.
const appearance=read('src/styles/theme/component-appearance.css');
assert(appearance.includes('[data-dkds-component-identity="panelHeader"]')&&appearance.includes('[data-dkds-component-identity="inspectorHeader"]'),'Canonical titlebar appearance must target semantic header identities rather than a plugin/class whitelist.');
assert(appearance.includes('--dkds-titlebar-action-shadow-hover'));
assert(appearance.includes('--dkds-titlebar-action-shadow-hover'));
assert(appearance.includes('.dkds-selection-item.dkds-selection-row:is('));
assert(appearance.includes('[aria-selected="true"]'));
assert(appearance.includes('input[type="number"]::-webkit-inner-spin-button'));
assert(appearance.includes('-webkit-appearance:none'));

// Theme picker is anchored above its status item instead of falling back to
// the viewport bottom and obscuring status-bar buttons.
const status=read('src/plugins/status-monitor/plugin.js');
const statusThemeLayout=read('src/plugins/status-monitor/theme-layout.js');
assert(status.includes('ThemeLayout.positionThemePanel')&&statusThemeLayout.includes('innerHeight-anchorTop+statusGap'));
assert(!status.includes("themePanel.style.bottom='8px';return")&&!statusThemeLayout.includes("themePanel.style.bottom='8px';return"));
assert(statusThemeLayout.includes('var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px)'));

// Mobile owns its former compact scientific toolbar independently of Desktop.
const native=read('src/styles/platform/native-client-shell.css');
assert(native.includes('--dkds-scientific-nav-item-width:')&&native.includes('--dkds-scientific-nav-item-height:'));
assert(native.includes('grid-template-areas:"search status type count refresh install"'));
assert(native.includes('#pluginManagerOpenFolderBtn[hidden]{display:none}'));
const manager=read('src/core/plugins/manager-ui.js');
assert(manager.includes('external?.folderAvailable?.()===true')&&manager.includes('folderBtn.hidden=!folderSupported'));
const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
assert(packageRuntime.includes('folderAvailable:()=>!!window.electronAPI?.pluginOpenFolder')&&packageRuntime.includes('!window.electronAPI?.isNativeClient'));
assert(native.includes('@media (max-width:1120px)'));
const index=read('src/index.html');
assert(index.includes('plugin-manager-search-wrap dkds-material-role-control" data-dkds-component-identity="field"'));

// Pulse parameters are a semantic PRIME: Mobile must suppress their main-route
// first paint before Presenter projection and leave real breathing room in Drawer.
const pulseUnit=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const pulseManifest=json('src/plugins/pulse-sampler-tool/plugin.json');
const pulseRuntime=read('src/plugins/pulse-sampler-tool/plugin.js');
assert(/^1\.9\.(?:9|\d{2,})$/.test(pulseManifest.version));
{
  let runtimeManifest=null;
  const sandbox={DKDSPlugins:{define:(manifest)=>{runtimeManifest=manifest;}}};
  vm.createContext(sandbox);
  vm.runInContext(pulseRuntime,sandbox,{filename:'src/plugins/pulse-sampler-tool/plugin.js'});
  assert(runtimeManifest&&runtimeManifest.id===pulseManifest.id,'Runtime Pulse Sampler manifest must define the plugin.json id.');
  assert.strictEqual(runtimeManifest.version,pulseManifest.version,'Runtime Pulse Sampler version must match plugin.json.');
}
const workspaceMobile=read('src/styles/platform/native-workspace-presentation.css');
const workbench=read('src/core/ui/modules/workbench/analysis.js');
assert(workspaceMobile.includes('[data-dkds-prime-owned="1"][data-dkds-presentation-role="data-control"]:not([data-dkds-mobile-region="drawer"]){display:none}'));
assert(workbench.includes("owned.dataset.dkdsPrimeOwned='1'")&&workbench.includes("owned.dataset.dkdsPrimeContentInset=contentInset")&&workbench.includes("this.markSurfaceNode(owned,row,'prime')"));
assert(pulseUnit.includes("variant:'fixed-titleless'")&&pulseUnit.includes("presentationRole:'data-control'"),'Pulse parameter first paint must be controlled by the semantic data-control PRIME rather than plugin Mobile CSS.');
assert(pulseUnit.includes("variant:'stack-comfortable'")&&pulseUnit.includes("variant:'form-grid-2'"),'Pulse parameter breathing room and responsive field geometry must come from Unit layout recipes.');

for(const rel of ['src/styles/platform/touch.css','src/styles/platform/native-client-shell.css','src/styles/theme/component-appearance.css']){
  assert(!read(rel).includes('!important'),`${rel} must remain free of !important.`);
}
console.log('v3.67.51 Desktop/Mobile presentation polish PASS: compact separated plot chrome, canonical field/selection/titlebar appearance, anchored theme panel, dense Plugin Manager, and no Pulse parameter first-paint transfer.');
