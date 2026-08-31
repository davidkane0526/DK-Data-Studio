'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=7))),'Desktop presentation polish requires v3.67.7+.');}

const workspace=read('src/core/ui/modules/workbench/plugin.js');
const semantic=read('src/core/theme/semantic-registry.js');
const grid=read('src/styles/structure/plugin-workspace.css');
for(const token of ['dkds-plugin-canvas-left dkds-material-role-sidebar','dkds-plugin-canvas-right dkds-material-role-sidebar','dkds-plugin-canvas-center dkds-material-role-surface','dkds-plugin-canvas-bottom dkds-material-role-surface'])assert(!workspace.includes(token),`dock geometry must not paint its own Material surface: ${token}`);
for(const token of ['.dkds-plugin-canvas-left','.dkds-plugin-canvas-right','.dkds-plugin-canvas-center','.dkds-plugin-canvas-bottom'])assert(!semantic.includes(token),`semantic registry must leave dock geometry layout-only: ${token}`);
assert(grid.includes('"cleft clsplit center crsplit cright"'),'desktop rails must remain explicit scientific-canvas regions.');

const portable=read('src/core/ui/modules/layout/portable-view.js');
const analysis=read('src/core/ui/modules/workbench/analysis.js');
const resonance=read('src/plugins/resonance-workbench/view-components.js');
const shared=read('src/plugins/resonance-workbench/workbench-shared.js');
assert(portable.includes("chrome=this.spec.chrome!==false")&&analysis.includes('chrome:row.chrome!==false'),'fixed desktop rails must be able to suppress generic PortableView chrome without forking the workspace runtime.');
assert(/dataControlPresentation[^\n]+placements:\['left'\][^\n]+chrome:false/.test(resonance),'Resonance data control must be a fixed left rail without injected placement arrows.');
assert(shared.includes("id:'data-control',label:'参数'"),'Resonance host label must use the requested concise 参数 label.');
assert(resonance.includes("id:'res-settings',label:'设置',activity:'resonance',section:'UTILITY',order:980"),'Resonance settings must be a trailing utility command.');

const desktopShell=read('src/core/ui/modules/presentation/desktop-shell.js');
assert(desktopShell.includes('110-(Number(item.priority)||0)')&&desktopShell.includes("buttons.sort((a,b)=>(Number(a.dataset.pluginOrder)||100)"),'Presenter surface buttons must receive leading context orders and be deterministically sorted with plugin utility commands.');

const nav=read('src/styles/structure/shell-navigation.css');
const shell=read('src/styles/presentation/shell.css');
const component=read('src/styles/theme/component-appearance.css');
const componentRuntime=read('src/core/theme/component-appearance.js');
const themeRuntime=read('src/core/theme/runtime.js');
const desktopChrome=read('src/styles/structure/desktop-chrome-geometry.css');
assert(/\.window-control-btn\{[^}]*width:30px[^}]*height:30px/s.test(nav),'desktop window controls must use compact 30 px hit chrome instead of full-titlebar slabs.');
assert(/\[data-dkds-component-identity="toolbarAction"\]:is\(\.dkds-panel-close-button,\.window-control-close\):hover:not\(:disabled\)\{[^}]*box-shadow:none/s.test(component),'window close hover must remain a canonical shadow-free ToolbarAction state.');
assert(/plugin-section-start\{[^}]*margin-left:10px[^}]*padding-left:11px/s.test(nav)&&/plugin-section-start::before\{[^}]*top:10px[^}]*bottom:10px/s.test(nav),'context section divider must keep the canonical 11 px action inset while sitting farther from neighboring command shadows.');
assert(componentRuntime.includes('function contextFor(target)')&&componentRuntime.includes('function roleFor(target)')&&componentRuntime.includes('ThemeContract.resolveComponentAppearance')&&themeRuntime.includes('contexts:{grouped:')&&themeRuntime.includes('standalone:{variants:')&&!component.includes('--dkds-shell-action-halo'),'Theme 3.10 must resolve standalone/grouped depth through Core composition instead of hard-coded topbar halo/suppression CSS.');

const semanticCss=read('src/styles/structure/sdk-semantic-surfaces.css');
const integrated=read('src/styles/theme/integrated-command-chrome.css');
assert(desktopChrome.includes('.dkds-panel-close-button{')&&component.includes('[data-dkds-component-identity="toolbarAction"].dkds-panel-close-button{border-radius:7px}'),'Core must expose one close-button geometry owner in Structure and one appearance owner in Component Appearance.');
assert(!integrated.includes('body.dkds-modern-ui .dkds-panel-close-button{'),'Integrated command Theme CSS must not reclaim shared close-button appearance.');
const status=read('src/plugins/status-monitor/plugin.js');
const devtools=read('src/core/plugins/devtools.js');
const index=read('src/index.html');
const connectivity=read('src/plugins/connectivity-center/plugin.js');
assert((status.match(/dkds-panel-close-button/g)||[]).length>=2,'Theme and Memory tools must consume the shared close button.');
assert(devtools.includes('data-act="close" class="dkds-panel-close-button"'),'Plugin DevTools must consume the shared close button.');
assert(index.includes('panel-close dkds-panel-close-button'),'LAN Web panel must consume the shared close button.');
assert(connectivity.includes('id="dkaiChatClose" class="dkds-icon-button dkds-panel-close-button"'),'AI Agent must consume the shared close button.');

console.log('v3.67.7 desktop presentation polish PASS: layout-only dock slots, fixed data rail, restored panel hierarchy, trailing settings, compact window chrome, balanced command shadows and one close-button contract.');
