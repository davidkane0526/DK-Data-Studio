'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const Module=require('module');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);
Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json'),mobilePkg=json('mobile/package.json'),expo=json('mobile/app.json').expo;
const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=41))),'Mobile projection stability recovery requires v3.67.41+.');
assert(mobilePkg.version===pkg.version||Number(String(mobilePkg.version).split('.').at(-1))>=27,'Mobile package must retain the v3.67.41+ native projection capability or use synchronized app identity.');
assert.strictEqual(expo.version,mobilePkg.version,'Expo/mobile package versions must stay synchronized.');
assert(Number(expo.android.versionCode)>=38,'Android versionCode must retain the v3.67.41+ Mobile acceptance build capability.');

const web=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const css=read('src/styles/platform/native-workspace-presentation.css');
const host=read('src/core/host/mobile-host-runtime.js');
const nav=read('src/core/ui/modules/scientific-curve/navigation.js');
const shellModel=read('mobile/src/model/shell-model.ts');

// Desktop isolation: all presentation geometry remains under the native-client root.
for(const match of css.matchAll(/(^|\n)([^\n{]+)\{/g)){
  const selector=String(match[2]||'').trim();
  if(!selector||selector.startsWith('@'))continue;
  assert(selector.includes('html[data-dkds-host="mobile"].react-native-client'),`Native presentation selector escaped Desktop isolation: ${selector}`);
}
assert(!host.includes("dispatchEvent(new Event('resize'))"),'Mobile Host must not synthesize window resize during navigation/surface commands. Real resize remains an input event only.');

// Parameter and companion geometry is isolated by a Mobile-owned shell instead
// of relying on plugin-specific selector specificity.
for(const token of ['createFrame(region,surfaceId=\'\',purpose=\'\',presentationRole=\'\')','dkds-mobile-surface-frame','captureInline(node)','normalizeProjectedNode(node,region)','restoreInline(node,saved.inline)'])
  assert(web.includes(token),`Mobile surface projection shell missing ${token}.`);
assert(css.includes('.dkds-mobile-surface-frame[data-dkds-mobile-frame-region="drawer"]'),'Parameter drawer geometry must be owned by the Mobile projection shell.');
assert(css.includes('width:min(320px,calc(100vw - 20px))')&&css.includes('max-width:min(88vw,680px)')&&web.includes('fitDrawerToContent(frame,surfaceId'),'Parameter drawer must stay bounded while expanding only to its measured content-fit minimum.');
assert(shellModel.includes("surface.role === 'data-control'")&&shellModel.includes('canonicalDataControlSurface'),'Native fixed control command must consume the shared data-control role; presentationPurpose may refine semantics but must not create a second slot.');
assert(!shellModel.includes('/参数|parameter/i'),'Native Parameters command must not guess parameter UI from a label regex.');

// Orientation/profile changes keep one stable canvas topology. Wide/expanded
// tablets expose real side/bottom lanes; compact phones keep the center intact
// and represent semantic side/bottom companions as bounded flow rows. The
// primary scientific row remains explicit, so companions stay visible without
// covering it or replacing it with a route.
assert(css.includes('grid-template-columns:var(--dkds-mobile-left-track) var(--dkds-mobile-left-seam) minmax(0,1fr) var(--dkds-mobile-right-seam) var(--dkds-mobile-right-track)')&&css.includes('"cleft clsplit center crsplit cright"'),'Mobile must keep one stable left/main/right canvas topology across responsive profiles.');
assert(css.includes('var(--dkds-mobile-user-bottom-track,36%)')&&css.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Both orientations keep disjoint, bounded companion regions.');
assert(css.includes('var(--dkds-mobile-user-bottom-track,36%)')&&css.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Both orientations keep disjoint, bounded companion regions.');
assert(/\[data-dkds-mobile-region="route"\]\[data-dkds-mobile-active="true"\]\{\s*position:relative/.test(css),'SUB routes must stay inside the PluginWorkspace route host instead of adding a second fixed viewport layer.');

// Android WebView toolbar drag uses raw pointer coordinates and a drag-start
// delta. Desktop preserves the existing coalesced-event path.
assert(nav.includes("const nativeClient=document.documentElement?.classList?.contains('react-native-client')===true"),'Scientific toolbar drag must branch only for native-client behavior.');
assert(nav.includes('if(!nativeClient){const rows=event.getCoalescedEvents?.()'),'Android native client must bypass the Desktop coalesced pointer path.');
assert(nav.includes('const rows=event.getCoalescedEvents?.()'),'Desktop coalesced pointer behavior must remain available.');
assert(nav.includes('dragState.startX+(latestPoint.clientX-dragState.startClientX)'),'Native drag must move by the pointer delta from the drag-start position.');

// Exercise production frame mode: unchanged publications never reparent again,
// and closing restores both DOM ownership and pre-existing Desktop inline width.
const makeStyle=initial=>{
  const values=new Map(Object.entries(initial||{}));
  return {getPropertyValue:key=>values.get(key)||'',getPropertyPriority:()=>'',setProperty:(key,value)=>values.set(key,String(value)),removeProperty:key=>values.delete(key),value:key=>values.get(key)||''};
};
const makeParent=name=>({name,isConnected:true,children:[],appendCount:0,insertCount:0,append(node){this.appendCount++;if(node.parentNode?.children)node.parentNode.children=node.parentNode.children.filter(row=>row!==node);this.children.push(node);node.parentNode=this;},insertBefore(node,next){this.insertCount++;if(node.parentNode?.children)node.parentNode.children=node.parentNode.children.filter(row=>row!==node);const index=next?this.children.indexOf(next):-1;if(index>=0)this.children.splice(index,0,node);else this.children.push(node);node.parentNode=this;},removeChild(node){this.children=this.children.filter(row=>row!==node);node.parentNode=null;}});
const desktopParent=makeParent('desktop'),center=makeParent('center'),right=makeParent('right'),bottom=makeParent('bottom'),overlay=makeParent('overlay');
const mainNode={dataset:{},parentNode:center,nextSibling:null,style:makeStyle()};center.children=[mainNode];
const parameterNode={dataset:{},parentNode:desktopParent,nextSibling:null,style:makeStyle({width:'100vw',position:'absolute',left:'32px'})};desktopParent.children=[parameterNode];
const fakeRoot={dataset:{},querySelector(selector){if(selector.includes('"right"'))return right;if(selector.includes('"bottom"'))return bottom;if(selector.includes('"overlay"'))return overlay;return null;}};
const makeFrame=()=>{const frame={dataset:{},className:'',parentNode:null,children:[],contains(node){return this.children.includes(node);},append(node){if(node.parentNode?.children)node.parentNode.children=node.parentNode.children.filter(row=>row!==node);this.children.push(node);node.parentNode=this;},remove(){this.parentNode?.removeChild?.(this);}};return frame;};
const priorDocument=global.document;
global.document={
  documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:value=>value==='react-native-client'}},
  createElement:()=>makeFrame(),
  querySelectorAll:()=>[],
  querySelector(selector){if(selector==='[data-dkds-workspace-activity="alpha"]')return fakeRoot;if(selector.includes('data-dkds-workspace-surface-id="main"'))return mainNode;if(selector.includes('data-dkds-workspace-surface-id="parameters"'))return parameterNode;return null;}
};
delete global.DKDSStyleGate;
require('../src/core/theme/style-ownership-gate-runtime.js');
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const presenter=new MobileWebSurfacePresenter();
const opened={activityId:'alpha',layout:{profile:'compact'},workspaces:[{activityId:'alpha',presentationComplete:true,surfaces:[
  {surfaceId:'main',role:'scientific-primary',active:true,presentation:{region:'main',navigation:'primary'}},
  {surfaceId:'parameters',role:'data-control',active:true,presentation:{region:'drawer',navigation:'context'}}
]}]};
presenter.apply(opened);
assert.strictEqual(overlay.appendCount,1,'First parameter projection must append one Mobile frame.');
assert.strictEqual(parameterNode.parentNode?.dataset?.dkdsMobileFrame,'true','Plugin parameter DOM must live inside a Mobile geometry frame while open.');
assert.strictEqual(parameterNode.style.value('width'),'100%','Desktop/plugin inline width must be neutralized only during Mobile projection.');
presenter.apply(opened);
assert.strictEqual(overlay.appendCount,1,'Unchanged state publication must not recreate/reappend the projection frame.');
const closed=JSON.parse(JSON.stringify(opened));closed.workspaces[0].surfaces[1].active=false;
presenter.apply(closed);
assert.strictEqual(parameterNode.parentNode,desktopParent,'Closing parameter drawer must restore the plugin node to its original Desktop-owned parent.');
assert.strictEqual(parameterNode.style.value('width'),'100vw','Closing parameter drawer must restore the original inline width exactly.');
assert.strictEqual(parameterNode.style.value('position'),'absolute','Closing parameter drawer must restore original inline positioning exactly.');
if(priorDocument===undefined)delete global.document;else global.document=priorDocument;

console.log('v3.67.41 Mobile projection stability PASS: native-only surface frames, stable orientation topology, in-flow SUB routes, raw Android toolbar drag and no synthetic host resize.');
