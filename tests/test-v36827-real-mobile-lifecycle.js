'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
assert(/^3\.68\./.test(pkg.version));
assert.strictEqual(mobile.version,pkg.version);
assert.strictEqual(expo.version,pkg.version);
assert(expo.android.versionCode>=65);

const workbench=read('src/core/ui/modules/workbench/analysis.js');
assert(workbench.includes('if(container.parentNode===this.slots.parking)home?.appendChild(container);'),
  'Reopening a parked PRIME must return its existing node to semantic home before PortableView captures geometry.');

const host=read('src/core/host/mobile-host-runtime.js');
assert(host.includes("if(typeof api.snapshot==='function')reconcileOpenSurfaceState(api.snapshot({route}));"),
  'Every Native shell snapshot must reconcile PRIME open state, not only presentation events.');

const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
assert(presenterSource.includes("semanticRole==='inspector'||semanticRole==='scientific-secondary'"),
  'Mobile Presenter must own non-user inspector and scientific-secondary default geometry.');
assert(presenterSource.includes('const detachedFromProjection=!!(frame&&node&&!frame.contains?.(node));'),
  'Mobile Presenter must detect nodes moved away by another Core lifecycle.');
assert(presenterSource.includes("node.parentElement?.closest?.('.dkds-analysis-parking')"),
  'Presenter must recognize PRIME parking as an external lifecycle move.');

// Behavioral reproduction of the real close bug: PluginWorkspace has already
// parked the node before Mobile Presenter processes its stale projection frame.
// Presenter must remove only its frame and never resurrect the closed panel.
const moduleBox={exports:{}};
const fakeStyleGate={set(){return true;},remove(){return true;}};
const fakeWindow={DKDSThemeMaterialRenderer:{assignSemanticRoles(){}},DKDSMaterialSurface:{apply(){}}};
const fakeDocument={querySelector(){return null;},querySelectorAll(){return[];},createElement(){throw new Error('not needed');}};
const context={
  module:moduleBox,exports:moduleBox.exports,console,window:fakeWindow,document:fakeDocument,globalThis:{window:fakeWindow,document:fakeDocument,CSS:null},
  require:id=>{
    if(id==='ui/style-ownership-gate')return fakeStyleGate;
    if(id.includes('platform-boundary'))return {isMobileDocument:()=>true};
    if(id.includes('native-touch-drag'))return {bind:()=>()=>{}};
    throw new Error(`unexpected require: ${id}`);
  },setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){}
};
vm.runInNewContext(presenterSource,context,{filename:'mobile-web-surface.js'});
const Presenter=moduleBox.exports.MobileWebSurfacePresenter;
assert.strictEqual(typeof Presenter,'function');
const presenter=new Presenter();
let reinserted=0,frameRemoved=0;
const parking={closest:selector=>selector==='.dkds-analysis-parking'?parking:null};
const node={
  dataset:{dkdsMaterialContentOwner:'mobile-presentation'},
  style:{getPropertyValue(){return'';},getPropertyPriority(){return'';}},
  classList:{contains:name=>name==='dkds-prime-hidden'},
  parentElement:parking
};
const originalParent={isConnected:true,insertBefore(){reinserted++;},append(){reinserted++;}};
const frame={contains:()=>false,querySelector:()=>null,remove(){frameRemoved++;}};
presenter.projectedNodes.set(node,{parent:originalParent,next:null,inline:{},frame,region:'companion-right'});
presenter.decoratedNodes.add(node);
presenter.restoreNode(node);
assert.strictEqual(reinserted,0,'A parked/closed PRIME must not be reinserted into its old projection/home by Mobile Presenter.');
assert.strictEqual(frameRemoved,1,'Presenter must release the stale projection frame after PRIME close.');
assert.strictEqual(presenter.projectedNodes.has(node),false,'Projection ownership must be released after close.');

const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(portable.includes("?'mobile.m3':'desktop'"),'Mobile PortableView state must use a new namespace while Desktop state remains untouched.');
const css=read('src/styles/platform/native-workspace-presentation.css');
assert(css.includes('[data-dkds-mobile-companion-right="true"] .dkds-plugin-canvas-frame'),
  'Landscape companion geometry must be orientation-driven for all Mobile profiles, not gated by CSS-pixel width/profile.');

const app=read('mobile/App.tsx'),shell=read('mobile/src/Shell.tsx'),router=read('mobile/src/host/useNativeRequestRouter.ts'),bridge=read('src/web-bridge.js'),foundation=read('src/app/modules/foundation.js');
assert(!app.includes('WebServicePopover')&&!shell.includes('WebServicePopover'),'Native shell must not render a second RN-owned Web Service panel.');
assert(app.includes("host.hostRequest('status', { pluginId: 'builtin.status-monitor', id: 'lan-web' })"),'Native status button must open the Core WebView LAN panel.');
assert(router.includes("req.type === 'webApplySettings'")&&router.includes("req.type === 'webRegenerateKey'"),'Core LAN panel must retain Android settings/key operations through the Native bridge.');
assert(bridge.includes("nativeCall('webApplySettings'")&&bridge.includes("nativeCall('webRegenerateKey'")&&bridge.includes('localOnly:false'),'Web bridge must expose full Android LAN settings without forcing the old local-only UI.');
assert(foundation.includes("window.DKDSMaterialSurface?.apply?.(panel,'popover')"),'Mobile LAN panel must consume the same Core popover Material role as status popovers.');
assert(!fs.existsSync(path.join(root,'mobile/src/services/WebServicePopover.tsx')),'Retired duplicate RN Web Service UI must not remain in the clean source tree.');
assert(!Object.prototype.hasOwnProperty.call(mobile.dependencies||{},'expo-blur'),'Retired RN blur dependency must be removed from the mobile package.');

console.log('v3.68.27 real Mobile lifecycle PASS: parked PRIME reopen, missed-event reconciliation, Presenter frame release, orientation-owned companions, and single Core Material LAN panel.');
