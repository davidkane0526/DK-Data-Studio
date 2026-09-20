'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
// Importable UI modules resolve composition ids from src/core in production.
const Module=require('module');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);
Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=38))),'Mobile acceptance recovery requires v3.67.38+.');

const header=read('mobile/src/components/NativeHeader.tsx');
const styles=read('mobile/src/styles/shell-styles.ts');
const presenters=read('src/core/ui/modules/presentation/presenters.js');
const mobileWeb=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const workspaceCss=read('src/styles/platform/native-workspace-presentation.css');
const transformRuntime=read('src/core/scientific/transform-runtime.js');

// 1. The + hit target is visually naked: no outline and no rounded tile fill.
assert(styles.includes("projectAdd: { width: 28, height: 30, borderRadius: 0, borderWidth: 0, backgroundColor: 'transparent'"),'Project + must have no visible outline/tile container.');
assert(!header.includes('projectAdd, { backgroundColor:'),'Project + must not receive a theme surface fill at render time.');

// 2. Global mobile commands use theme-colored text. Their exact navigation order is owned by the current Mobile header contract.
assert(!header.includes('SystemGlyph')&&!styles.includes('systemGlyphCanvas'),'Custom black system glyph drawings must stay removed from the native top header.');
for(const token of ["{ id: 'import-sheet', label: '导入' }","{ id: 'data', label: '数据' }","{ id: 'activities', label: '分析' }","{ id: 'home', label: '工作区' }"])
  assert(header.includes(token),`Missing compact text command ${token}`);

// 4. A compact scientific PRIME remains a companion. It must never replace the primary plot as a full-screen route.
assert(presenters.includes("if(role===roles.SCIENTIFIC_SECONDARY&&kind==='prime')return Object.freeze({region:'companion-bottom'"),'Scientific PRIME must remain companion-bottom in compact/portrait layouts.');
assert(!presenters.includes("profile==='compact'?'route':'companion-bottom'"),'Compact scientific PRIME must not regress to route replacement.');
assert(presenters.includes("if(role===roles.INSPECTOR)return Object.freeze({region:'companion-right'"),'Curve inspector must remain a companion: portrait uses the bottom lane instead of an overlaid right-side surface.');
assert(workspaceCss.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)')&&workspaceCss.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Both orientations keep one Workspace-owned companion region from the canonical split preference bounded by the live viewport.');

// 5. Parameter drawer width is solved from Unit semantics and real rendered overflow.
// CSS supplies only physical viewport containment; it does not invent a percentage default.
assert(!workspaceCss.includes('width:min(32vw,420px'),'Parameter drawer must not restore the retired one-third/420px automatic width.');
assert(workspaceCss.includes('max-width:calc(100vw - 12px)'),'Drawer must remain physically contained by the actual viewport.');
assert(mobileWeb.includes('fitDrawerToContent(frame,surfaceId')&&mobileWeb.includes('solveMinimumReasonableWidth(frame,region='),'Presenter must compute the smallest fitting width from live Unit content.');

// 6. Repeated host state publications must not restore/reparent every PRIME on each frame.
const applyStart=mobileWeb.indexOf('  apply(snapshot={}){');
const applyEnd=mobileWeb.indexOf('\n  }\n}',applyStart);
const applyBody=mobileWeb.slice(applyStart,applyEnd);
assert(applyBody.includes('const desiredProjected=new Set()'),'Mobile Web Presenter must compute desired live projections.');
assert(!applyBody.includes('this.restoreAll();'),'Mobile Web Presenter apply() must not restore all projected nodes every publication.');
assert(applyBody.includes('if(!desiredProjected.has(node))this.restoreNode(node)'),'Only surfaces no longer projected may be restored to Desktop ownership.');
assert(!workspaceCss.includes('@keyframes dkds-native-drawer-in'),'Parameter drawer must not replay an entrance animation during state churn.');
// Exercise the presenter: identical state publications must not re-append the drawer.
const makeParent=name=>({name,isConnected:true,appendCount:0,insertCount:0,append(node){this.appendCount++;node.parentNode=this;},insertBefore(node){this.insertCount++;node.parentNode=this;}});
const desktopParent=makeParent('desktop'),center=makeParent('center'),right=makeParent('right'),bottom=makeParent('bottom'),overlay=makeParent('overlay');
const mainNode={dataset:{},parentNode:center,nextSibling:null},parameterNode={dataset:{},parentNode:desktopParent,nextSibling:null};
const fakeRoot={dataset:{},querySelector(selector){if(selector.includes('"right"'))return right;if(selector.includes('"bottom"'))return bottom;if(selector.includes('"overlay"'))return overlay;return null;}};
const priorDocument=global.document;
global.document={
  documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:value=>value==='react-native-client'}},
  querySelectorAll(selector){if(selector==='[data-dkds-mobile-presentation]')return [fakeRoot];if(selector.includes('[data-dkds-mobile-region]'))return [mainNode,parameterNode];return [];},
  querySelector(selector){if(selector==='[data-dkds-workspace-activity="alpha"]')return fakeRoot;if(selector.includes('data-dkds-workspace-surface-id="main"'))return mainNode;if(selector.includes('data-dkds-workspace-surface-id="parameters"'))return parameterNode;return null;}
};
delete global.DKDSStyleGate;
require('../src/core/theme/style-ownership-gate-runtime.js');
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const webPresenter=new MobileWebSurfacePresenter();
const liveSnapshot={activityId:'alpha',layout:{profile:'wide'},workspaces:[{activityId:'alpha',presentationComplete:true,surfaces:[
  {surfaceId:'main',role:'scientific-primary',active:true,presentation:{region:'primary',navigation:'replace'}},
  {surfaceId:'parameters',role:'data-control',active:true,presentation:{region:'drawer',navigation:'overlay'}}
]}]};
webPresenter.apply(liveSnapshot);assert.strictEqual(overlay.appendCount,1,'First drawer projection must move the live parameter surface exactly once.');
webPresenter.apply(liveSnapshot);assert.strictEqual(overlay.appendCount,1,'Publishing an unchanged state must not detach/re-append the parameter drawer.');
const closedSnapshot=JSON.parse(JSON.stringify(liveSnapshot));closedSnapshot.workspaces[0].surfaces[1].active=false;
webPresenter.apply(closedSnapshot);assert.strictEqual(desktopParent.insertCount,1,'Closing the parameter drawer must restore it to Desktop ownership exactly once.');
if(priorDocument===undefined)delete global.document;else global.document=priorDocument;
const host=read('src/core/host/mobile-host-runtime.js');
assert(host.includes('reconcileOpenSurfaceState')&&host.includes("surface?.active===true&&text(surface?.role)!=='data-control'")&&host.includes("text(row?.role)==='data-control'"),'Native host must continuously reconcile live scientific companion PRIME state without auto-opening the Mobile-owned parameter drawer.');

// 3. TER transformed heatmaps receive real directional sweeps when pipeline input is data.table.
assert(transformRuntime.includes('transportDatasetsFromArtifacts')&&transformRuntime.includes('science?.buildSweeps'),'Scientific Transform Runtime must expand transport tables through canonical dataset/buildSweeps semantics.');
const context={window:{},structuredClone:global.structuredClone,performance:{now:()=>Date.now()},console};
context.window.window=context.window;context.globalThis=context.window;context.window.performance=context.performance;
vm.createContext(context);
for(const file of ['src/science/common.js','src/science/peaks.js','src/science/ter.js','src/core/data/model.js','src/core/scientific/pipeline-runtime.js','src/core/scientific/transform-runtime.js'])
  vm.runInContext(read(file),context,{filename:file});
const D=context.window.DKDSData,P=context.window.DKDSScientificPipeline,T=context.window.DKDSScientificTransforms;
T.register('test.v36738','didv',{title:'dI/dV',outputType:'science.transport.didv',fieldType:'science.transport.conductance-field',quantity:'conductance',unit:'A/V',transformKey:'didv',public:true,supportsScalarField:true});
const x=[-1,-.5,0,.5,1,.5,0,-.5,-1];
const y=x.map((v,index)=>1e-6*(v+0.2*v*v)+(index>4?1e-7:0));
const table=D.createTable({id:'v36738:vg0',name:'vg=0 V.csv',semanticType:'science.transport.iv',metadata:{vg:0},columns:[
  {key:'Vd',name:'Vd',role:'x',unit:'V',values:x},
  {key:'Id',name:'Id',role:'y',unit:'A',values:y},
  {key:'Vg',name:'Vg',role:'group',unit:'V',values:x.map(()=>0)}
]});
const direct=T.runScalarField('didv',[table],{targets:[-.5,0,.5],vgs:[0],direction:1,tolerance:.26,radius:1});
assert.strictEqual(direct.missing,0,'Directional scalar field from a transport data.table must not be all missing.');
assert(direct.matrix.flat().every(Number.isFinite),'TER transformed heatmap matrix must contain finite values.');
assert.strictEqual(direct.sources[0],'vg=0 V.csv','Expanded sweeps must preserve the source dataset name used by TER source-file selection.');

const pipeline=P.createScope('test.v36738'),transforms=T.createScope('test.v36738');transforms.installPipeline(pipeline);
const types={
  infer:value=>value?.semanticType?{id:value.semanticType}:(value?.kind?{id:value.kind}:null),
  accepts:(actual,accepted)=>accepted.includes(actual)||((actual==='science.transport.iv'||actual==='data.table')&&accepted.includes('data.table'))
};
const stage=transforms.fieldStageId('didv');
const executed=pipeline.runSync(stage,[table],{dataTypes:types,parameters:{targets:[-.5,0,.5],vgs:[0],direction:1,tolerance:.26,radius:1},publish:false});
assert.strictEqual(executed.viewModel.kind,'heatmap','Pipeline scalar-field projection must remain a heatmap.');
assert.strictEqual(executed.value.missing,0,'Pipeline path used by TER must not return the 100% missing matrix regression.');
assert(executed.value.matrix.flat().every(Number.isFinite),'Pipeline TER transform matrix must render finite heatmap data.');
T.removeOwner('test.v36738');P.removeOwner('test.v36738');

console.log('v3.67.38 Mobile acceptance recovery PASS: naked +, theme-colored text commands, TER table->sweep heatmap recovery, portrait main preservation, compact content-fit parameter drawer and stable non-flickering projection.');
