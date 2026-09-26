'use strict';
const assert=require('node:assert');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.67.54'),'v3.67.54+ source required.');

// 1/6/9: every Desktop host, including dedicated TOP/plugin windows, must enter
// the same platform geometry + Component Appearance path before Core CSS loads.
const pluginWindow=read('src/plugin-window/index.html');
assert(pluginWindow.includes('<html lang="zh-CN" data-dkds-host="desktop">'),'Dedicated plugin window must declare Desktop host identity in markup.');
assert(pluginWindow.indexOf("root.dataset.dkdsHost='desktop'")>=0&&pluginWindow.indexOf("root.dataset.dkdsHost='desktop'")<pluginWindow.indexOf('../core.css'),'Desktop host identity must be frozen before Core CSS is parsed.');
assert(pluginWindow.includes("Object.defineProperty(window,'__DKDS_HOST_KIND__',{value:'desktop'"),'Dedicated plugin window must expose the same frozen platform boundary used by the main shell.');

const touch=read('src/styles/platform/touch.css');
assert(touch.includes('--dkds-scientific-nav-item-width:22.176px;'),'Desktop scientific action width must retain the accepted 20.16 px width contract.');
assert(touch.includes('--dkds-scientific-nav-item-height:25.2px;'),'Desktop scientific action height must retain the accepted 25.2 px height contract.');
assert(touch.includes('--dkds-scientific-nav-padding-inline:1.76px;'),'Desktop floating navigation horizontal padding must increase 10% from the v3.71.121 compact baseline with the complete UI width contract.');
{const native=read('src/styles/platform/native-client-shell.css');assert(native.includes('html[data-dkds-host="mobile"].react-native-client .dkds-scientific-nav-tools')&&native.includes('--dkds-scientific-nav-item-width:')&&native.includes('--dkds-scientific-nav-item-height:'),'Mobile must retain its independently owned scientific-control geometry.');}
for(const rel of ['src/plugins/resonance-workbench/plugin.css']){
  const text=read(rel);assert(!text.includes('--dkds-scientific-nav-item-width')&&!text.includes('--dkds-scientific-nav-item-height'),`${rel} must not specialize shared scientific floating-tool geometry.`);
}
assert(!fs.existsSync(path.join(root,'src/plugins/transfer-vth-lab/plugin.css')),'Retired Vth private stylesheet must stay deleted after production Unit cutover.');

// Patch audit: platform presenters must consume semantic annotations instead of
// hard-coding first-party plugin class names. Plugins may declare generic width/
// scroll intent on their own DOM, but Core must remain domain blind.
const mobilePresenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const unitGeometry=read('src/core/ui/modules/composition/unit-geometry-constraints.js');
for(const token of ['respar-','dc-','pulse-table-scroll'])assert(!mobilePresenter.includes(token),`Core Mobile presenter still contains plugin-specific patch selector: ${token}`);
assert(!mobilePresenter.includes('[data-dkds-mobile-width-critical]'),'Mobile Presenter must not infer Drawer width from retired plugin width-critical annotations.');
assert(mobilePresenter.includes('resolveInlineConstraintDeficit')&&mobilePresenter.includes('reflowUnitGeometry'),'Mobile Presenter must consume the shared Unit-tree intrinsic inline constraint resolver without inspecting Unit-private markers.');
assert(unitGeometry.includes('[data-dkds-horizontal-scroll]'),'Intentional horizontal-scroll semantics may remain in the generic Unit constraint resolver as an overflow-measurement exclusion without becoming a geometry owner.');
const dataCenterViews=read('src/plugins/data-center/unit-presentation.js');
assert(dataCenterViews.includes("className:'dc-table-preview'")&&dataCenterViews.includes("previewHost.dataset.dkdsHorizontalScroll='true'"));

const appearance=read('src/styles/theme/component-appearance.css');
assert(appearance.includes('[data-dkds-component-identity="panelHeader"]')&&appearance.includes('[data-dkds-component-identity="inspectorHeader"]'),'Titlebar hover must be keyed by semantic header identity.');
assert(!appearance.includes(':where(.dkds-group-plot-head,.dkds-plot-view-head,.trend-card-header,.dkds-portable-header)'),'Do not restore the old class whitelist that made one chart family visually special.');

// 2: plugin overrides are current-contract-only. A stale API 1.18 package is
// invalid and must fail visibly; Core must not quarantine it and silently fall
// back to the bundled package. Invalid current-API overrides fail the same way.
const {createPluginPackageRuntime}=require(path.join(root,'desktop','main-modules','plugin-package-runtime'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-v36754-override-'));
try{
  const userData=path.join(temp,'user-data');
  const fakeApp={getPath:key=>key==='userData'?userData:temp,getAppPath:()=>root,getVersion:()=>pkg.version};
  const runtime=createPluginPackageRuntime({app:fakeApp,BrowserWindow:{getAllWindows:()=>[]}});
  const bundled=runtime.readBuiltinPluginPackage('com.dkds.tools.pulse-sampler');
  assert.strictEqual(bundled.manifest.apiVersion,'1.19.0');
  const dir=runtime.ensurePluginOverrideDirectory(),file=path.join(dir,'com.dkds.tools.pulse-sampler.dkplugin');
  const stale=JSON.parse(JSON.stringify(bundled));stale.manifest.apiVersion='1.18.0';stale.manifest.version='99.0.0';
  fs.writeFileSync(file,JSON.stringify(stale,null,2));
  const scan=runtime.readInstalledPluginOverrides();
  assert.strictEqual(scan.packages.length,0);assert.strictEqual(scan.errors.length,0,'Retired Plugin API overrides must not remain as active installation errors.');
  assert(scan.removed.some(row=>row.id==='com.dkds.tools.pulse-sampler'&&row.reason==='non-current-contract'),'Retired overrides must be deleted from current installation state.');
  assert(!Object.prototype.hasOwnProperty.call(scan,'quarantined'),'Current-only override scanning must not expose a compatibility quarantine lane.');
  assert(!fs.existsSync(file),'A non-current override must be removed instead of shadowing the current bundled package.');
  assert.strictEqual(runtime.currentPluginPackage('com.dkds.tools.pulse-sampler').manifest.apiVersion,'1.19.0','After obsolete installation state is removed, the canonical bundled current package must be the only package for that ID.');
  const invalid=JSON.parse(JSON.stringify(bundled));invalid.manifest.version='99.0.1';invalid.files['plugin.js']+='\nctx.ui.pluginWorkspace.create(document.body,{});\n';
  fs.writeFileSync(file,JSON.stringify(invalid,null,2));
  const invalidScan=runtime.readInstalledPluginOverrides();
  assert.strictEqual(invalidScan.errors.length,1,'A genuinely invalid current-API override must remain actionable.');
  assert.match(invalidScan.errors[0].error,/ctx\.ui\.pluginWorkspace/);
}finally{fs.rmSync(temp,{recursive:true,force:true});}

// 3: registered workspace regions now carry an explicit scroll policy. The
// normal resize/mutation path does not scan and rewrite the plugin subtree.
const workbench=read('src/core/ui/modules/workbench/plugin.js');
assert(workbench.includes("applyScrollPolicy(this.canvasSlots.left,'chain')")&&workbench.includes("applyScrollPolicy(this.canvasSlots.overlay,'contain')"),'Workspace regions must declare their scroll ownership.');
assert(!workbench.includes("querySelectorAll('*')")&&!workbench.includes('installLayoutGuard'),'Normal layout changes must not scan the PRIMARY subtree.');
assert(workbench.includes('diagnosticRegions()')&&workbench.includes('bounded:true'),'Layout inspection must be an on-demand bounded diagnostic.');
const components=read('src/styles/structure/workbench-components.css');
assert(components.includes('[data-dkds-scroll-policy="chain"],[data-dkds-scroll-policy="viewport"]'),'Horizontal containment and vertical chaining must come from the declared policy.');
assert(!components.includes('.dkds-layout-overflow-fallback')&&!touch.includes('.dkds-layout-overflow-fallback'),'Desktop behavior must not depend on a recovery selector or inline rewrite.');

// 4: Pulse Sampling controls are now the accepted production Unit composition.
// The plugin owns only production domain/action wiring; Unit recipes own the
// multi-row geometry without introducing plugin CSS or Toolbar impersonation.
const pulse=read('src/plugins/pulse-sampler-tool/plugin.js'),pulseUnit=read('src/plugins/pulse-sampler-tool/unit-presentation.js'),pulseManifest=json('src/plugins/pulse-sampler-tool/plugin.json');
assert(pulseUnit.includes("variant:'analysis-control-grid'")&&pulseUnit.includes("variant:'result-control-grid'"),'Pulse extraction must use the accepted Unit multi-row command recipes.');
assert(pulseUnit.includes("variant:'result-grid-asymmetric'"),'Pulse extraction result plot/table geometry must remain Unit-owned.');
assert(!pulse.includes('ps-analysis-command-surface')&&!pulseUnit.includes('dkds-toolbar'),'Legacy Pulse sampling Surface/Toolbar DOM must remain retired.');
assert(Array.isArray(pulseManifest.styles)&&pulseManifest.styles.length===0,'Pulse production Unit presentation must load no legacy plugin CSS.');
assert(pulse.includes('actions:liveDomain.actions')&&pulse.includes('snapshot:liveSnapshot'),'Pulse Unit presentation must remain projected from the existing production live-domain owner.');

const vthUnit=read('src/plugins/transfer-vth-lab/unit-presentation.js');

// 5: Vth plot owns no scrollbar around a responsive ResizeObserver surface. The
// result table is the scroll owner, preventing scrollbar appearance/disappearance
// from feeding back into chart width and triggering repeated re-render.
assert(vthUnit.includes("units.layout.apply(plotPanel.body,{variant:'plot-card-fill'})"),'Vth plot fill geometry must remain Unit-owned.');
assert(vthUnit.includes("const resultsHost=units.layout.create(null,{variant:'scroll-pane',geometry:{minHeight:'140px'}})"),'Vth results scroll/minimum geometry must remain Unit-owned.');

// 7/8: PlotView must reuse a canonical authored surface header/action host. A
// second injected header breaks PortableView dragging and creates the split-row
// chrome. Floating PlotViews consume remaining vertical space after resize.
const plotView=read('src/core/ui/modules/plot-view/chart.js');
assert(plotView.includes('.dkds-chart-head,.dkds-surface-header'));
assert(plotView.includes('.dkds-chart-actions,.dkds-surface-actions'));
const terViews=read('src/plugins/ter-analysis/unit-presentation.js');
assert(terViews.includes('units.header.create')&&terViews.includes('units.action.create'),'TER Unit cutover must obtain chart-header actions from Core Units.');
assert(!terViews.includes('dkds-toolbar'),'TER Unit source-parity presentation must not recreate a nested/private toolbar material surface.');
assert(terViews.includes('ter-chart-actions'),'TER source parity may retain the accepted chart-action geometry hook while Unit action/header remain the semantic/material owners.');
const portableCss=read('src/styles/structure/super-top-contract.css');
assert(portableCss.includes('.dkds-plot-view.dkds-portable-view.is-floating'));
assert(portableCss.includes('--dkds-plot-content-flex:1 1 0;')&&portableCss.includes('--dkds-plot-content-min-height:0;')&&portableCss.includes('--dkds-plot-content-height:auto;'));
const pluginWorkspaceCss=read('src/styles/structure/plugin-workspace.css');assert(pluginWorkspaceCss.includes('flex:var(--dkds-plot-content-flex);')&&pluginWorkspaceCss.includes('height:var(--dkds-plot-content-height);'),'PlotView content geometry must consume floating geometry slots from its canonical owner.');
assert(portableCss.includes(':is(.dkds-portable-header,.dkds-portable-inline-header){cursor:move;}'),'Authored inline PortableView headers must advertise the same drag affordance as injected headers.');

// 9: the page viewport itself is not a visual card. Both legacy analysis pages
// and the Unified AnalysisWorkbench must be flush on all four edges; plugins own
// any intentional inner content inset. Compact Desktop must not silently restore
// a perimeter gutter. The legacy scroll root also participates in vertical wheel
// chaining instead of imposing shorthand containment.
const analysisShell=read('src/styles/structure/analysis-shell.css'),analysisWorkbench=read('src/styles/structure/analysis-workbench.css'),pluginWindowStyle=read('src/plugin-window/style.css');
assert(/\.analysis-page-body\{[\s\S]*?overscroll-behavior-x:contain;[\s\S]*?overscroll-behavior-y:auto;[\s\S]*?padding:0;/.test(analysisShell),'Legacy analysis viewport must be edge-to-edge and vertically chainable.');
assert(/\.dkds-analysis-frame\{[\s\S]*?gap:0;[\s\S]*?padding:0;[\s\S]*?overflow:hidden;/.test(analysisWorkbench),'Unified AnalysisWorkbench frame must be edge-to-edge on all four sides.');
assert(/\.dkds-analysis-main\{[^}]*padding:0;/.test(analysisWorkbench),'Main dock slot must not reintroduce a horizontal page gutter.');
assert(/\.dkds-analysis-right\{[^}]*padding:0;/.test(analysisWorkbench),'Right dock slot must not reintroduce a perimeter gutter.');
assert(/\.dkds-analysis-bottom\{[^}]*padding:0;/.test(analysisWorkbench),'Bottom dock slot must not reintroduce a perimeter gutter.');
assert(/@media\(max-width:1000px\)\{[\s\S]*?grid-template-areas:"left" "main" "right" "bottom";\s*gap:0;/.test(analysisWorkbench),'Compact AnalysisWorkbench must not create phantom grid gaps around hidden dock rows.');
assert(/\.dkds-size-compact \.analysis-page-body\{\s*padding:0;\s*\}/.test(touch),'Compact Desktop must not restore the removed page perimeter gutter.');
assert(!pluginWindowStyle.includes('analysis-page-body{background:var(--app-bg,#f6f8fb);padding-bottom'),'Plugin-window host must not carry a separate bottom-gap patch.');

// The real visual closure diagnostic must follow the computed shared variables,
// not hard-code the old 25x24 Desktop geometry and call that a gate.
const visual=read('src/diagnostics/automation-visual-cases.js');
assert(visual.includes("style.getPropertyValue('--dkds-scientific-nav-item-width')"));
assert(visual.includes('first action no longer fills the left interior edge'));
assert(visual.includes('last action no longer fills the right interior edge'));

// A global file-hash visual freeze is historical evidence, not an active release
// gate: it cannot distinguish an intentional owner refactor from a regression and
// does not validate computed/runtime geometry. The platform firewall remains
// semantic/host-scoped and is verified by the v3.67.43 runtime assertions.
const isolationGate=read('tests/test-v36743-desktop-mobile-projection-isolation.js');
assert(!isolationGate.includes('Desktop Visual Closure owner changed during Mobile work'),'Brittle global SHA visual freeze must not be restored as an active gate.');

for(const rel of ['src/styles/platform/touch.css','src/styles/theme/component-appearance.css','src/styles/structure/super-top-contract.css','src/styles/structure/analysis-workbench.css','src/styles/structure/analysis-shell.css'])assert(!read(rel).includes('!important'),`${rel} must remain free of !important.`);
console.log('v3.67.54 Desktop regression root-cause contracts PASS.');
