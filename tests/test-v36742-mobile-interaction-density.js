'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json'),mobilePkg=json('mobile/package.json'),expo=json('mobile/app.json').expo;
const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=42))),'Mobile interaction/density recovery requires v3.67.42+.');
assert(mobilePkg.version===pkg.version||Number(String(mobilePkg.version).split('.').at(-1))>=28,'Mobile package must retain the v3.67.42+ interaction-density capability or use synchronized app identity.');
assert.strictEqual(expo.version,mobilePkg.version,'Expo/mobile package versions must stay synchronized.');
assert(Number(expo.android.versionCode)>=39,'Android versionCode must retain the v3.67.42+ interaction-density build capability.');

const web=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const presentationCss=read('src/styles/platform/native-workspace-presentation.css');
const shellCss=read('src/styles/platform/native-client-shell.css');
const pulseCss=read('src/plugins/pulse-analysis/mobile.css');
const nav=read('src/core/ui/modules/scientific-curve/navigation.js');
const chart=read('src/core/scientific/chart-runtime.js');
const curveRender=read('src/core/ui/modules/scientific-curve/render.js');
const status=read('mobile/src/components/NativeStatusBar.tsx');
const model=read('src/core/ui/modules/presentation/model.js');
const resonancePlugin=read('src/plugins/resonance-workbench/plugin.js');
const statusStyles=read('mobile/src/styles/shell-styles.ts');
const resonance=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');

for(const match of presentationCss.matchAll(/(^|\n)([^\n{]+)\{/g)){
  const selector=String(match[2]||'').trim();
  if(!selector||selector.startsWith('@'))continue;
  assert(selector.includes('html[data-dkds-host="mobile"].react-native-client'),`Native presentation selector escaped Desktop isolation: ${selector}`);
}
for(const selector of [
  '.dkds-mobile-surface-frame[data-dkds-mobile-frame-region="drawer"] :where(button,input,select,textarea)',
  '.plugin-manager-section-list{grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))'
]) assert(shellCss.includes(selector),`Missing native-only density rule: ${selector}`);
assert(/\[data-dkds-mobile-region="main"\]\[data-dkds-mobile-active="true"\] \.pulse-results-grid\s*\{[\s\S]*?grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,240px\),1fr\)\)/.test(pulseCss),'Pulse native result cards must auto-fit under Presenter-owned semantic activation.');
assert(!read('src/plugins/pulse-analysis/shared-views.js').includes('isNativeClient'),'Pulse shared view must remain platform-neutral; Presenter markers activate Mobile layout.');

for(const token of ['installDrawerHandle(frame,surfaceId','dkds-mobile-drawer-resize-handle','setPointerCapture','drawerStorageKey(surfaceId','clampDrawerWidth'])
  assert(web.includes(token),`Mobile drawer resize ownership missing ${token}.`);
assert(presentationCss.includes('[data-dkds-mobile-drawer-open="true"] .dkds-plugin-canvas-overlay{pointer-events:auto}'),'Open native drawer must block touch-through to the underlying scientific canvas.');
assert(presentationCss.includes('>[data-dkds-mobile-region="drawer"]{position:relative;z-index:1;width:100%;max-width:100%;height:100%;min-height:0;overflow-x:hidden;overflow-y:auto'),'Projected parameter content must scroll inside the drawer frame without horizontal drawer overflow.');
assert(presentationCss.includes('.dkds-mobile-drawer-resize-handle{position:absolute'),'Drawer handle must stay fixed relative to the frame rather than scrolling with content.');
assert(presentationCss.includes('touch-action:none'),'Drawer resize handle must own its drag gesture.');

for(const source of [nav,chart]){
  assert(!source.includes('jump>limit'),'Scientific toolbar drag must not discard legitimate long/fast Android motion.');
  assert(source.includes('NativeTouchDrag')||source.includes('nativeTouchDrag'),'Scientific toolbar drag must use the shared native TouchEvent adapter.');
  assert(source.includes('clientX<=1&&point.clientY<=1'),'Scientific toolbar drag must reject the WebView origin glitch.');
}
assert(nav.includes('const rows=event.getCoalescedEvents?.()'),'Desktop scientific-curve drag keeps the coalesced event path.');

assert(curveRender.includes("contains('react-native-client') ? .78 : 1"),'ScientificCurve marker visuals must use a native-only scale.');
assert(curveRender.includes("attr('r',m=>selectedMarkerIds.has(String(m.id))?12:10)"),'ScientificCurve touch hit radius must remain unchanged.');
assert(chart.includes("contains('react-native-client')&&trace.marker"),'D3 chart trace marker scaling must be native-only.');

assert(resonance.includes("nativeTooltipDismissDispose=dom.on(node,'pointerdown'"),'Resonance native plot must install a Core-DOM-owned blank-touch tooltip dismiss path.');
assert(resonance.includes("$('#resparHoverTip')?.classList.add('hidden')"),'Blank native plot touch must hide the persistent marker tooltip.');

assert(status.includes("setTimeout(() => setTransientStatus(''), 5200)"),'Transient status message must expire instead of staying forever.');
assert(status.includes('!item.activityId || item.activityId === shell.activityId'),'Status contributions with an activity scope must disappear outside that activity.');
assert(model.includes('activityId:text(value.activityId||value.activity)'),'Presentation status model must expose generic activity scoping.');
assert(resonancePlugin.includes("activity:'resonance'"),'Resonance main summary must declare its activity scope rather than relying on host domain knowledge.');
assert(resonancePlugin.includes('isNativeClient:ctx.runtime.isNativeClient===true'),'Resonance must pass native-client capability explicitly instead of reading host DOM.');
for(const token of ['StatusSemanticGlyph','statusGlyphGridA','statusGlyphMemory','statusGlyphTheme','statusGlyphTerminal','statusGlyphAi','statusGlyphWeb'])
  assert(status.includes(token)||statusStyles.includes(token),`Canonical native status glyph missing ${token}.`);
assert(status.includes("['running','ready','ok','mcp','done'].includes(state)"),'AI/Web semantic state must affect native icon color.');
assert(statusStyles.includes('borderWidth:.8'),'Status icon line weight must use the shared thin geometry.');

console.log('v3.67.42 Mobile interaction density PASS: touch-owned resizable drawer, dense plugin layouts, stable toolbar drag, transient status, canonical stateful icons and smaller mobile markers.');
