'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=44))),'v3.67.44+ density contract must remain available.');}

// The existing Plugin API 1.19 semantic purpose is the platform-neutral way to
// identify a parameter surface. Do not create ctx.ui.mobile/desktop parameter APIs.
const sdk=read('sdk/plugin-api.d.ts');
assert(sdk.includes("export type DKDSPresentationSurfacePurpose='parameters';"),'SDK must expose the platform-neutral parameters purpose.');
assert(!sdk.includes('ui.mobile')&&!sdk.includes('ui.desktop'),'SDK must not fork parameter ownership by platform.');
const analysis=read('src/core/ui/modules/workbench/analysis.js');
assert(analysis.includes('node.dataset.dkdsPresentationPurpose=purpose'),'Live PRIME DOM must preserve presentationPurpose metadata for presenters.');
assert(analysis.includes('node.dataset.dkdsPresentationRole=presentationRole'),'Live PRIME DOM must preserve presentationRole metadata.');

const nativePresentation=read('src/styles/platform/native-workspace-presentation.css');
for(const token of ['z-index:6800','dkds-mobile-drawer-resize-handle','right:0','dkds-mobile-drawer-resize-grip','scrollbar-width:thin','::-webkit-scrollbar{width:3px;height:3px}']){
  assert(nativePresentation.includes(token),`Native parameter drawer missing ${token}.`);
}
const nativeShell=read('src/styles/platform/native-client-shell.css');
assert(nativeShell.includes('.plugin-manager-section-list{grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))'),'Plugin Manager sections must use flexible available-width tracks instead of fixed-width rows.');
assert(nativeShell.includes('.command-menu.range-action-menu')&&nativeShell.includes('max-height:min(48vh,360px)'),'Range action UI must be a compact native popover.');
assert(nativeShell.includes('.range-action-menu button{width:auto;min-height:28px'),'Range action buttons must not inherit full-sheet 46px sizing.');

const pulseMobile=read('src/plugins/pulse-analysis/mobile.css');
assert(/\.pulse-results-split\s*\{[^}]*display:flex;[^}]*flex-direction:column;[^}]*height:auto;[^}]*min-height:0/.test(pulseMobile),'Pulse native result layout must not use the Desktop fixed split height.');
assert(pulseMobile.includes('grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))'),'Pulse result charts must pack responsively.');
assert(pulseMobile.includes('.pulse-results-grid')&&pulseMobile.includes('height:auto'),'Pulse native result grid must not overrun its toolbar row.');

const samplerManifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));
assert(!samplerManifest.styles.includes('mobile.css')&&samplerManifest.platformPresentation?.mobile?.mode==='custom'&&samplerManifest.platformPresentation.mobile.styles?.includes('mobile.css'),'Pulse Sampler must keep native parameter density in Mobile-only platform presentation assets.');
const samplerMobile=read('src/plugins/pulse-sampler-tool/mobile.css');
assert(samplerMobile.includes('.ps-designer[data-dkds-mobile-region=\"drawer\"]'),'Pulse Sampler native CSS must be scoped to a Presenter-owned mobile region marker.');
assert(!read('src/plugins/pulse-sampler-tool/plugin.js').includes('isNativeClient'),'Pulse Sampler parameter registration must remain platform-neutral; Mobile activation comes from the Presenter region.');
assert(samplerMobile.includes('.ps-actions{display:flex;flex-wrap:wrap'),'Pulse Sampler parameter actions must wrap within drawer width.');
assert(samplerMobile.includes('.ps-mini-table')&&samplerMobile.includes('overflow:auto'),'Pulse Sampler table overflow must stay inside the drawer.');

const sciNav=read('src/core/ui/modules/scientific-curve/navigation.js');
const chartRuntime=read('src/core/scientific/chart-runtime.js');
for(const source of [sciNav,chartRuntime]){
  assert(source.includes('NativeTouchDrag')||source.includes('nativeTouchDrag'),'Native scientific toolbar drag must use the shared TouchEvent adapter.');
  assert(source.includes('point.clientX<=1&&point.clientY<=1'),'Native drag must reject the Android origin glitch.');
  assert(!source.includes('jump>limit'),'Native drag must not discard legitimate long/fast finger motion.');
}

const structure=read('src/styles/structure/plugin-workspace.css');
const material=read('src/styles/theme/material-renderer.css');
assert(structure.includes('[data-dkds-presentation-purpose="parameters"][data-dkds-workspace-surface-kind="prime"]')&&structure.includes('z-index:24'),'Desktop parameter stacking must be semantic Structure geometry, not plugin-specific.');
assert(material.includes('[data-dkds-presentation-purpose="parameters"][data-dkds-workspace-surface-kind="prime"]'),'Desktop parameter elevation paint must be semantic, not plugin-specific.');
assert(material.includes('html:not([data-dkds-host="mobile"])'),'Desktop elevation rule must explicitly exclude Mobile.');
assert(material.includes('.dkds-mobile-surface-frame[data-dkds-mobile-frame-region="drawer"]'),'Core Material Renderer must retain the Mobile parameter drawer composition contract.');
assert(material.includes('[data-dkds-material-recipe="thin-glass"]')&&material.includes('var(--dkds-material-shadow,var(--dkui-shadow-1))'),'Mobile drawer depth must come from the active Material recipe rather than a platform-specific hard-coded shadow.');

console.log('v3.67.44 mobile density/parameter contract PASS: responsive plugin cards, contained parameter UI, compact selection menu, and full-range native toolbar drag.');
