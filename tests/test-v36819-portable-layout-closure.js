'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
assert(Number(String(pkg.version).split('.').at(-1))>=19,'v3.68.19+ application version required.');

const dc=read('src/plugins/data-center/plugin.css');
const dcMobile=read('src/plugins/data-center/mobile.css');
const pulse=read('src/plugins/pulse-sampler-tool/plugin.css');
const nativeWorkspace=read('src/styles/platform/native-workspace-presentation.css');
const nativeShell=read('src/styles/platform/native-client-shell.css');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const semantic=read('src/styles/structure/sdk-semantic-surfaces.css');
const chrome=read('src/styles/presentation/plugin-chrome.css');
const shell=read('src/styles/presentation/shell.css');
const windowCss=read('src/plugin-window/style.css');
const windowHtml=read('src/plugin-window/index.html');
const windowRuntime=read('src/plugin-window/runtime.js');
const dockRuntime=read('src/plugin-window/dock-layout.js');

assert(dc.includes('gap:4px 6px;align-items:start}'),'Data Center derived-form grid must align field tops instead of bottom-aligning fields with different help/textarea heights.');
assert(dc.includes('.dc-chart-pane[data-placement="home"]{grid-area:chart;align-self:start;height:auto;min-height:0;max-height:none;flex:none}'),'Data Center chart home state must restore bounded intrinsic panel geometry.');
assert(dc.includes('.dc-chart-pane[data-placement="home"]>.dc-chart{height:var(--dc-chart-height);min-height:var(--dc-chart-min-height);max-height:none;flex:none}'),'Data Center home chart must restore the authored bounded chart height.');

assert(pulse.includes('.ps-analysis-controls{display:grid;grid-template-columns:minmax(220px,1.45fr) repeat(4,minmax(118px,.8fr)) minmax(148px,.72fr);'),'Pulse desktop extraction controls must use an explicit aligned six-cell row.');
assert(pulse.includes('.ps-wide{min-width:0;grid-column:auto}'),'Desktop source selector must not force a stale two-column span.');
assert(pulse.includes('.ps-result-controls{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr)) repeat(2,minmax(132px,.62fr));'),'Pulse desktop result controls must keep X/Y/copy/export on one coherent row.');

for(const token of ['grid-template-areas:', '"left lsplit main rsplit right"', '"left lsplit bottom bottom right"', ':has(#pluginWindowLeftDock:not(:empty))', ':has(#pluginWindowRightDock:not(:empty))', ':has(#pluginWindowBottomDock:not(:empty))'])
  assert(windowCss.includes(token),`Dedicated plugin window real dock layout missing ${token}`);
for(const id of ['pluginWindowLeftDockResizer','pluginWindowRightDockResizer','pluginWindowBottomDockResizer'])
  assert(windowHtml.includes(`id="${id}"`),`Dedicated plugin window dock resizer missing ${id}`);
assert(windowRuntime.includes('DKDSPluginWindowDockLayout?.install?.()'),'Dedicated runtime must activate the split-dock host module.');
for(const token of ['function install(', '--dkds-plugin-window-left-dock-width', '--dkds-plugin-window-right-dock-width', '--dkds-plugin-window-bottom-dock-height', 'DKDSStyleGate'])
  assert(dockRuntime.includes(token),`Dedicated plugin dock runtime missing ${token}`);
assert(!/\.style\.(?:setProperty|removeProperty)|\.style\[[^\]]+\]\s*=/.test(dockRuntime),'Dedicated plugin dock resizing must not bypass Style Gate.');

assert(nativeWorkspace.includes('--dkds-mobile-bottom-track:clamp(160px,var(--dkds-mobile-user-bottom-track,36%),min(680px,58vh))')&&nativeWorkspace.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Mobile group companion must reserve a bounded user-resizable row through the stable Core bottom lane and visible split seam.');
assert(nativeWorkspace.includes('flex:1 1 0;width:100%;height:100%;'),'Projected companion must fill its bounded lane.');
assert(nativeWorkspace.includes('flex:1 1 0;width:100%;height:100%;'),'Projected companion must fill its bounded lane.');

assert(nativeShell.includes('.schema-parameter-panel.auto-fit.compact .schema-param-field :where(select.dkds-field-control,.dkds-multiselect-trigger.dkds-field-control){'),'Native compact X/Y/mode controls must share one Core-owned exact control box.');
assert(nativeShell.includes('.schema-parameter-panel.auto-fit.compact .dkds-multiselect-trigger.dkds-field-control{display:flex;align-items:center;width:100%;overflow:hidden}'),'Native multiselect proxy must consume the same aligned field-control box.');
assert(!dcMobile.includes('height:32px;min-height:32px;max-height:32px'),'Data Center Mobile CSS must not own final Core field geometry.');

assert(semantic.includes('right:0;bottom:0;z-index:12;width:36px;height:36px'),'Floating resize hit box must use the current reference HTML 36×36 interaction footprint.');
assert(!shell.includes('--dkui-portable-corner-'),'Portable handle colors must be owned by active Theme component appearance, not shell-level literals/mixes.');
assert(!portable.includes("presentationChanged?.('portable-place',{portableId:this.id,placement});\n      this.scope.presentationChanged?.('portable-place'"),'Portable placement must emit one presentation-change transaction, not duplicate it.');

console.log('v3.68.19 portable/data-center/pulse/mobile layout closure PASS');
