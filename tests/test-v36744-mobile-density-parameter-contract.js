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
for(const token of ['z-index:6800','dkds-mobile-drawer-resize-handle','right:0','dkds-mobile-drawer-resize-grip','scrollbar-width:thin','::-webkit-scrollbar{width:var(--dkds-mobile-scrollbar-size,3px);height:var(--dkds-mobile-scrollbar-size,3px)}']){
  assert(nativePresentation.includes(token),`Native parameter drawer missing ${token}.`);
}
const nativeShell=read('src/styles/platform/native-client-shell.css');
assert(nativeShell.includes('--dkds-mobile-scrollbar-size:3px')&&nativeShell.includes(':where(*)::-webkit-scrollbar{width:var(--dkds-mobile-scrollbar-size);height:var(--dkds-mobile-scrollbar-size)}'),'All Mobile plugin scroll regions must consume the shared 3px Core scrollbar geometry token.');
assert(nativeShell.includes('.plugin-manager-section-list{grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))'),'Plugin Manager sections must use flexible available-width tracks instead of fixed-width rows.');
assert(nativeShell.includes('.command-menu.range-action-menu')&&nativeShell.includes('max-height:min(48vh,360px)'),'Range action UI must be a compact native popover.');
assert(nativeShell.includes('.range-action-menu button{width:auto;min-height:28px'),'Range action buttons must not inherit full-sheet 46px sizing.');

const pulseMobile=read('src/plugins/pulse-analysis/mobile.css');
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
const pulseUnit=read('src/plugins/pulse-analysis/unit-presentation.js');
assert(pulseUnit.includes("variant:'two-card-grid'")&&pulseUnit.includes('responsiveTarget:primaryMain')&&!pulseUnit.includes('units.splitPane.create(primaryMain'),'Pulse native result layout must reflow from projected PRIMARY width through generic Unit Layout while remaining a sequential PRIMARY flow.');
assert(pulseUnit.includes("gridTemplateColumns:'repeat(2,minmax(0,1fr))'"),'Pulse projected PRIMARY must preserve its two-card wide layout through Unit geometry.');
assert(pulseUnit.includes("maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}"),'Pulse projected PRIMARY may collapse only below the accepted 520 px Unit lane width.');
assert(!pulseCss.includes('.pulse-results-grid{')&&!pulseCss.includes('.pulse-results-split{')&&!pulseMobile.includes('.pulse-results-grid{')&&!pulseMobile.includes('.pulse-result-card{'),'Pulse authored CSS must not become a second result-geometry owner.');

const samplerManifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));
const samplerUnit=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
assert(samplerManifest.styles.length===0&&samplerManifest.platformPresentation?.mobile?.mode==='adaptive','Pulse Sampler native parameter density must now be owned by the accepted Unit composition and Mobile Presenter, with no plugin Mobile CSS.');
assert(!read('src/plugins/pulse-sampler-tool/plugin.js').includes('isNativeClient')&&!samplerUnit.includes('isNativeClient'),'Pulse Sampler parameter registration must remain platform-neutral; Mobile activation comes from Presenter semantics.');
assert(samplerUnit.includes("presentationRole:'data-control'")&&samplerUnit.includes("variant:'fixed-titleless'"),'Pulse Sampler parameters must remain a titleless data-control PRIME for Presenter-owned drawer projection.');
assert(samplerUnit.includes("variant:'action-grid-4'")&&samplerUnit.includes("variant:'form-grid-2'"),'Pulse Sampler parameter actions and fields must use responsive Unit layout recipes.');
assert(samplerUnit.includes("variant:'segment-bar'")&&samplerUnit.includes('units.table.mount'),'Pulse Sampler segment table must remain a managed Unit table inside the parameter composition.');

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
