'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const tuple=v=>String(v).split('.').slice(0,3).map(Number);
const atLeast=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
const pkg=json('package.json');
const html=read('src/index.html');
const desktop=read('desktop/main.js');
const preload=read('desktop/preload.js');
const shellStructure=read('src/styles/structure/shell-navigation.css');
const shellSchemaStructure=read('src/styles/structure/schema-and-plugin-ui.css');
const semanticStructure=read('src/styles/structure/sdk-semantic-surfaces.css');
const componentAppearance=read('src/styles/theme/component-appearance.css');
const connectivity=read('src/plugins/connectivity-center/plugin.js');
const connectivityCss=read('src/plugins/connectivity-center/plugin.css');
const connectivityPresentation=read('src/styles/presentation/connectivity.css');
const theme=read('src/plugins/aurora-pop-theme/plugin.js');
const resonanceView=read('src/plugins/resonance-workbench/view-components.js');
const resonanceControls=read('src/plugins/resonance-workbench/feature-controls-runtime.js');

assert(atLeast(tuple(pkg.version),[3,66,9]),'This closure requires DK Data Studio 3.66.9+.');

assert(desktop.includes("title: '选择数据 / 项目文件'")&&desktop.includes("{ name: '项目文件', extensions: ['json'] }"),'Unified native import dialog must expose the existing JSON project format as a Project Files filter.');
assert(html.includes('id="importChooseFilesBtn"')&&html.includes('>导入数据/项目</button>')&&html.includes('点击“导入数据/项目”选择本地数据或项目文件'),'Import Workbench must describe the unified data/project action consistently.');

assert(semanticStructure.includes('.dkds-overlay[data-dkds-overlay-stack="foreground"]{z-index:1600}'),'Core must own a reusable foreground nested-overlay layer.');
assert(connectivity.includes("dataset:{dkdsOverlayStack:'foreground'}"),'SMB browser must request the Core foreground overlay layer when launched from another modal.');
assert(!connectivityCss.includes('z-index:920'),'Connectivity plugin must not privately own Core overlay stacking.');

assert(connectivity.includes('<section class="dksmb-browser">')&&connectivity.includes('dksmb-toolbar dkds-surface-muted')&&connectivity.includes('dksmb-connection dkds-surface-muted')&&connectivity.includes('dksmb-foot dkds-surface-muted'),'SMB must remain one outer dialog with flat internal regions.');
for(const selector of ['.dksmb-window{','.dksmb-window>.dksvc-head{','.dksmb-nav{','.dksmb-browser{','.dksmb-toolbar{','.dksmb-list-head{','.dksmb-list{','.dksmb-connection{','.dksmb-foot{']){
  assert(connectivityPresentation.includes(selector),`Core Connectivity presentation must own SMB zone paint: ${selector}`);
}

assert(componentAppearance.includes('[data-dkds-component-variant="primary"]:disabled')&&componentAppearance.includes('color:#fff;-webkit-text-fill-color:#fff'),'Disabled primary commands must retain white labels while Core softens the disabled surface.');
assert(theme.includes("toolbarAction:{")&&theme.includes("active:{surface:LIGHT_EMERALD.softSurface,text:LIGHT_EMERALD.text,border:LIGHT_EMERALD.border,indicator:LIGHT_EMERALD.accent}"),'Light-theme active toolbar actions must use the former bright mint/teal treatment instead of the dark emerald fill.');

for(const id of ['reswinShowAll','reswinShowForward','reswinShowReverse','reswinHideAll']){
  const re=new RegExp(`<button id="${id}" class="dkds-action-button" data-dkds-action-layout="standalone"`);
  assert(re.test(resonanceView),`${id} must consume the canonical standalone action surface.`);
}
assert(resonanceControls.includes("button.classList.toggle('selected',selected)")&&resonanceControls.includes("button.classList.remove('active')"),'Resonance visibility modes must use selected-mode styling rather than activity styling.');

assert(desktop.includes('frame: false'),'Primary desktop window must be frameless so the app chrome owns the title bar.');
for(const ipc of ["windows:minimizeCurrent","windows:toggleMaximizeCurrent","windows:getCurrentState"]){assert(desktop.includes(ipc),`Desktop must expose ${ipc}.`);}
for(const api of ['minimizeCurrentWindow','toggleMaximizeCurrentWindow','getCurrentWindowState','onCurrentWindowMaximizedChanged']){assert(preload.includes(api),`Preload must expose ${api}.`);}
for(const id of ['windowCommandbar','windowMinimizeBtn','windowMaximizeBtn','windowCloseBtn']){assert(html.includes(`id="${id}"`),`Self-drawn title bar is missing ${id}.`);}
assert(shellSchemaStructure.includes('-webkit-app-region:drag')&&shellStructure.includes('.window-commandbar')&&shellStructure.includes('.window-control-btn'),'Core shell geometry must own the draggable title bar and native-like window-control hit regions.');

console.log('v3.66.9 import/SMB/window chrome PASS: project filter, nested SMB layering/zoning, command contrast, restored scan controls, bright active chrome and frameless self-drawn window controls are enforced.');
