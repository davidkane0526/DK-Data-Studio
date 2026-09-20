'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const app=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
assert.strictEqual(mobile.version,app.version);
assert.strictEqual(expo.version,app.version);
assert(expo.android.versionCode>=67);

const gridSource=read('src/core/ui/modules/grid/controller.js');
assert(gridSource.includes('class GroupAreaController extends GridController')&&gridSource.includes('super(scope,container,spec)')&&gridSource.includes("get kind(){return 'group-area';}"),'Core must publish a formal GroupAreaController on the current Grid contract without the retired groupArea flag.');
assert(gridSource.includes("className='dkds-grid-sticky-rail'")&&gridSource.includes("rail.appendChild(anchor)"),'A sticky GroupArea child must leave normal CSS Grid flow so its viewport height cannot change sibling row/Y geometry.');
assert(!gridSource.includes('preserveTemplate'),'Managed grids must not retain an escape hatch that lets plugin CSS replace Core column geometry.');
const gridCss=read('src/styles/structure/analysis-workbench.css');
assert(gridCss.includes('.dkds-managed-grid>.dkds-grid-sticky-rail{position:absolute')&&gridCss.includes('pointer-events:none'),'Sticky rail must be out of flow and must not create an overlay hit blocker around sibling plots.');
assert(gridCss.includes('.dkds-grid-sticky-rail>.dkds-portable-view')&&gridCss.includes('pointer-events:auto'),'Only the sticky PlotView itself may receive pointer input inside the reserved rail.');

// Execute the sticky-rail ownership with a tiny DOM harness. This protects the
// actual failure mode: the sticky card must not remain a direct grid item.
class ClassList{
  constructor(...rows){this.rows=new Set(rows);}
  add(...rows){rows.forEach(row=>this.rows.add(row));}
  remove(...rows){rows.forEach(row=>this.rows.delete(row));}
  contains(row){return this.rows.has(row);}
  toggle(row,value){if(value===undefined)value=!this.contains(row);value?this.add(row):this.remove(row);return value;}
}
class Elem{
  constructor(doc,...classes){this.nodeType=1;this.ownerDocument=doc;this.classList=new ClassList(...classes);this.dataset={};this.styles={};this._children=[];this.parentElement=null;this.hidden=false;this.clientWidth=900;}
  get children(){return this._children;}
  get isConnected(){return !!this.parentElement||this===this.ownerDocument?.root;}
  appendChild(child){if(child.parentElement)child.parentElement._detach(child);this._children.push(child);child.parentElement=this;return child;}
  insertBefore(child,before){if(child.parentElement)child.parentElement._detach(child);const i=this._children.indexOf(before);if(i<0)this._children.push(child);else this._children.splice(i,0,child);child.parentElement=this;return child;}
  _detach(child){const i=this._children.indexOf(child);if(i>=0)this._children.splice(i,1);if(child.parentElement===this)child.parentElement=null;}
  remove(){this.parentElement?._detach(this);}
}
const doc={root:null,createElement(){return new Elem(doc);}};
const gate={set:(node,key,value)=>{node.styles[key]=value;return true;},setToken:(node,key,value)=>{node.styles[key]=value;return true;},remove:(node,key)=>{delete node.styles[key];return true;}};
let mutationCallback=null;
class MutationObserver{constructor(cb){mutationCallback=cb;}observe(){}disconnect(){}}
const moduleBox={exports:{}};
doc.documentElement={dataset:{dkdsHost:'desktop'},classList:new ClassList()};
const context={module:moduleBox,exports:moduleBox.exports,console,window:{MutationObserver},MutationObserver,document:doc,innerWidth:1200,innerHeight:800,globalThis:null,require:id=>{
  if(id==='../foundation/shortcuts')return {resolveElement:value=>value};
  if(id==='ui/style-ownership-gate')return gate;
  if(id==='../composition/unit-geometry-constraints')return {publishUnitGeometryConstraint(){return ()=>{};},notifyUnitGeometryConstraint(){return false;}};
  throw new Error(id);
}};
context.globalThis=context;vm.createContext(context);vm.runInContext(gridSource,context,{filename:'grid/controller.js'});
const GridController=moduleBox.exports.GridController;
const grid=new Elem(doc);doc.root=grid;const sticky=new Elem(doc,'is-sticky'),a=new Elem(doc),b=new Elem(doc);grid.appendChild(sticky);grid.appendChild(a);grid.appendChild(b);
const GroupAreaController=moduleBox.exports.GroupAreaController;
const controller=new GroupAreaController({emitResize(){},requestChartResize(){}},grid,{columns:3,minItemWidth:200});
const rail=grid.children.find(child=>child.dataset.dkdsGridStickyRail==='1');
assert(rail,'Sticky GroupArea child must create an out-of-flow rail.');
assert.strictEqual(sticky.parentElement,rail,'Sticky PlotView must be removed from normal grid track sizing.');
assert.deepStrictEqual([a.styles['grid-column'],b.styles['grid-column']],['1','2'],'Visible siblings must deterministically occupy the remaining columns instead of hiding behind the sticky plot.');
assert.strictEqual(sticky.styles['grid-row'],undefined,'Sticky child itself must not own a grid row/span that can alter sibling Y spacing.');
sticky.hidden=true;controller.apply();
assert(!grid.children.some(child=>child.dataset.dkdsGridStickyRail==='1'),'Hiding/leaving sticky must release the reserved rail immediately.');
assert.strictEqual(a.styles['grid-column'],undefined,'Returning to ordinary layout must clear temporary sibling geometry.');
controller.dispose();

const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(portable.includes("home?.closest?.('.dkds-group-area-grid')")&&!portable.includes("home?.closest?.('.dkds-managed-grid')"),'Only GroupArea children may receive the current-scroll-region sticky placement; generic managed grids and standalone plots must not.');
assert(portable.includes("if(placement==='sticky'||placement==='home')")&&portable.includes('previousGrid?.__dkdsGridController?.apply?.()'),'Sticky/home transitions must synchronize GroupArea geometry in the same frame, avoiding the one-frame Y shift and restoring home height/layout immediately.');
assert(portable.includes("dataset?.dkdsHost==='mobile'")&&portable.includes("classList?.contains('react-native-client'))return;"),'Mobile must exit before installing held-title resize gestures.');

// Orientation-aware GridController harness: landscape preference 4 -> portrait default 3,
// portrait manual 2 -> actual 2, then landscape restores 4.
doc.documentElement.dataset.dkdsHost='mobile';doc.documentElement.classList.add('react-native-client');
context.innerWidth=1200;context.innerHeight=900;let portraitPreference=null;
const grid2=new Elem(doc);grid2.clientWidth=900;const controller2=new GridController({emitResize(){},requestChartResize(){}},grid2,{columns:6,maxColumns:6,minItemWidth:200,responsive:true,orientationPolicy:{mode:'portrait-offset',offset:-1,minColumns:1},preferredColumns:({orientation})=>orientation==='landscape'?4:portraitPreference});
assert.strictEqual(controller2.getOrientation(),'landscape');assert.strictEqual(controller2.getAppliedColumns(),4,'Landscape preference must be applied first.');
context.innerWidth=900;context.innerHeight=1200;controller2.apply();assert.strictEqual(controller2.getOrientation(),'portrait');assert.strictEqual(controller2.getColumns(),6);assert.strictEqual(controller2.getAppliedColumns(),3,'Portrait default must be the last actual landscape count - 1.');
portraitPreference=2;controller2.apply();assert.strictEqual(controller2.getAppliedColumns(),2,'A manual portrait selection of 2 columns must actually produce 2 columns.');
context.innerWidth=1200;context.innerHeight=900;controller2.apply();assert.strictEqual(controller2.getOrientation(),'landscape');assert.strictEqual(controller2.getAppliedColumns(),4,'Returning to landscape must restore the saved landscape column count.');controller2.dispose();
doc.documentElement.dataset.dkdsHost='desktop';doc.documentElement.classList.remove('react-native-client');

const resonance=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const ter=read('src/plugins/ter-analysis/feature-runtime.js');
const terUnits=read('src/plugins/ter-analysis/unit-presentation.js');
assert(resonance.includes('unitTemplates?.plotGroup')&&resonance.includes("factory.create(hostEl,{variant:'regular',columns:6")&&resonance.includes("orientationPolicy:{mode:'portrait-offset',offset:-1,minColumns:1},preferredColumns:groupColumnPreference"), 'Resonance must consume the formal GroupArea behavior through the Unit PlotGroup facade and delegate orientation-aware effective columns to Core.');
assert(resonance.includes("placements:['home','left','right','bottom','float','global'],defaultPlacement:'home'"),'Resonance GroupArea children must expose the same ordinary dock/float placement contract as TER plots; sticky is injected only by GroupArea membership.');
assert(terUnits.includes("const plotGroup=units.plotGroup.create(groupHost,{columns:3")&&terUnits.includes('gapPx:14'),'TER production multi-plot layout must consume formal Unit PlotGroup behavior while retaining its accepted source-detail 14 px gap.');
assert(!ter.includes("id:'resistance-inspector'")&&!ter.includes('setSticky(')&&!ter.includes('layoutSettings.sticky'),'TER R–V must not have a private inspector/sticky positioning model.');
assert(terUnits.includes("placements:['home','left','right','bottom','float','global'],defaultPlacement:'home'"),'TER R–V and sibling charts must share one ordinary Unit PlotView placement contract.');
assert(!ter.includes("id:'rv-visibility'")&&!ter.includes('toggleResistanceVisibility'),'Retired R–V visibility linkage must stay removed; ordinary PlotView placement is the only Core surface control.');
const terManifest=json('src/plugins/ter-analysis/plugin.json');
assert(!(terManifest.capabilities||[]).includes('ui.sticky-inspector'),'TER manifest must not advertise the retired R–V-specific sticky inspector capability.');

const nativeCss=read('src/styles/platform/native-workspace-presentation.css');
assert(nativeCss.includes('grid-template-columns:var(--dkds-mobile-left-track) var(--dkds-mobile-left-seam) minmax(0,1fr) var(--dkds-mobile-right-seam) var(--dkds-mobile-right-track)'),'Mobile scientific canvas must keep the same stable split topology used by the desktop-style boundary interaction.');
assert(nativeCss.includes('--dkds-mobile-right-seam:var(--dkds-canvas-resizer-track-size,7px)')&&nativeCss.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Right inspector and bottom group companion must expose the 7px boundary hit track.');
const chromeCss=read('src/styles/presentation/plugin-chrome.css');
const shell=read('src/styles/presentation/shell.css');
assert(chromeCss.includes('Native scientific companions use the same split boundary affordance as Desktop')&&chromeCss.includes('box-shadow:0 0 3px')&&chromeCss.includes('box-shadow:0 0 5px'),'Mobile boundary seam must stay visible but visually thinner than the previous heavy glow.');


assert(!resonance.includes('document.documentElement')&&!resonance.includes('window.innerHeight>window.innerWidth'),'Resonance must not own native-host/orientation detection; that belongs to Core GridController.');
assert(resonance.includes('syncGroupLayout')&&resonance.includes('groupLayoutKey'),'GroupArea toolbar must synchronize the current column label through the cheap layout path after responsive changes.');
const nav=read('src/core/ui/modules/scientific-curve/navigation.js');
assert(nav.includes("[data-dkds-floating-chrome]")&&nav.includes('isNavigationObstacleNode'),'Scientific plot floating toolbars must avoid plugin floating chrome and auto-recover if dragged underneath it.');
const foundation=read('src/app/modules/foundation.js');
assert(foundation.includes("mobileService?'↻':'换一个 Key'")&&foundation.includes("newKeyBtn.setAttribute('aria-label',mobileService?'刷新 Key':'换一个 Key')")&&foundation.includes("width:'min(352px,calc(100vw - 12px))'"),'Mobile LAN panel must use the narrower shell and an icon-only refresh-Key action.');
assert(foundation.includes("panel.classList.add('dkds-mobile-service')")&&!foundation.includes("panel.classList.remove('lan-web-panel')"),'Mobile Web Service must keep the canonical LAN panel identity so Core Material ownership remains intact.');
assert(foundation.includes('floating-header drag-handle dkds-surface-header dkds-mobile-service-header'),'Mobile Web Service must use the canonical panel-header chrome instead of a parallel RN/custom title shell.');
assert(foundation.includes("window.DKDSMaterialSurface?.apply?.(panel,'popover')"),'Web Service panel must consume the same Core popover material role as Theme/Memory/AI.');
const materialCss=read('src/styles/theme/material-renderer.css');
assert(nativeCss.includes('.lan-web-panel.dkds-mobile-service')&&nativeCss.includes('.dkds-mobile-service-header')&&nativeCss.includes('.dkds-mobile-service-body')&&materialCss.includes('.floating-panel.dkds-material-role-popover{border-radius:var(--ui-panel-radius)}'),'Mobile Web Service organization must stay inside the canonical rounded/header/body panel shell, with radius owned by Core Material rather than platform CSS.');


const resonanceCss=read('src/plugins/resonance-workbench/plugin.css'),resonanceUnits=read('src/plugins/resonance-workbench/unit-presentation.js');
assert(resonanceUnits.includes('reswin-group-grid dkds-managed-grid')&&terUnits.includes('units.plotGroup.create'),'Both Unit-cutover Resonance and TER must delegate managed group geometry to Core.');
assert(!/#resonanceDedicatedPage \.reswin-group-grid\{[^}]*grid-template-columns/s.test(resonanceCss)&&!terUnits.includes('gridTemplateColumns'),'Resonance and TER plugins must not own final managed-grid columns.');
const semanticAudit=read('tools/quality/semantic-style-ownership.js');
assert(semanticAudit.includes('core-managed-grid-final-geometry')&&semanticAudit.includes('dkds-managed-grid'),'Authored-style Gate must reject alias selectors that try to retake final geometry from a Core-managed grid.');
const d3Renderer=read('src/core/scientific/d3-chart-renderer.js');
assert(d3Renderer.includes('if(px<m.l||px>m.l+state.innerW||py<m.t||py>m.t+state.innerH)return;')&&d3Renderer.includes('.stopPropagation?.()'),'D3 wheel zoom must be captured only inside the actual XY plot rectangle; panel/title/axis margins must continue scrolling the parent GroupArea.');
assert(nativeCss.includes('.dkds-plugin-canvas-bottom-resizer.active::before{top:calc((var(--dkds-canvas-resizer-track-size,7px) - 1px)/2);height:1px}'),'Mobile bottom group resize guide must paint a 1px visible seam while the separate ::after hit target stays large.');
const shellCss=read('src/styles/presentation/shell.css');
const scientificCss=read('src/styles/presentation/scientific.css');
assert(chromeCss.includes('html[data-dkds-host="mobile"].react-native-client body.dkds-modern-ui [data-dkds-mobile-presentation="semantic"] :is(.dkds-plugin-canvas-left-resizer,.dkds-plugin-canvas-right-resizer,.dkds-plugin-canvas-bottom-resizer).active::before')&&chromeCss.includes('box-shadow:0 0 3px color-mix(in srgb,var(--dkui-accent) 22%,transparent)'),'Mobile PluginWorkspace split seams must expose a theme-aware idle glow without enlarging their hit tracks.');
assert(shellCss.includes('html[data-dkds-host="mobile"].react-native-client body.dkds-modern-ui .dkds-split-handle::after')&&shellCss.includes('box-shadow:0 0 3px color-mix(in srgb,var(--dkui-accent) 24%,transparent)'),'Generic Core split handles must expose Mobile glow.');
assert(materialCss.includes('.dkds-mobile-drawer-resize-grip')&&materialCss.includes('box-shadow:0 0 4px color-mix(in srgb,var(--dkui-accent) 26%,transparent)'),'Mobile data-control drawer grip must expose Mobile glow.');
assert(scientificCss.includes('html[data-dkds-host="mobile"].react-native-client body.dkds-modern-ui .dkds-table-column-resizer::after')&&scientificCss.includes('box-shadow:0 0 3px color-mix(in srgb,var(--dkui-accent) 24%,transparent)'),'Mobile table column resize handles must expose Mobile glow.');
assert(chromeCss.includes('.dkds-portable-resize-handle.is-dragging::before')&&chromeCss.includes('color-mix(in srgb,var(--dkui-component-floating-chrome-border-hover'),'Desktop and Mobile floating PlotViews must share the Core active-corner treatment; Mobile must not fork its own resize-handle paint.');
assert(nav.includes('navigationClampedPosition')&&nav.includes('{avoidObstacles:false}')&&nav.includes('persistDrag')&&nav.includes("this.setNavigationToolsPosition(x,y,{persist:true})"),'Scientific floating tools must track freely during drag with O(1) bounds clamping, then repair obstacle overlap only on release before persisting.');

console.log('v3.68.67 GroupArea / Mobile seam / TER parity / LAN shell regressions PASS.');
