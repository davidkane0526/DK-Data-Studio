'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.109'),'v3.71.109+ source required.');

const mobileHost=read('src/core/host/mobile-host-runtime.js');
const structure=read('src/styles/structure/super-top-contract.css');
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const vthUnit=read('src/plugins/transfer-vth-lab/unit-presentation.js');
const vthManifest=JSON.parse(read('src/plugins/transfer-vth-lab/plugin.json'));
const dcMobile=read('src/plugins/data-center/mobile.css');
const layout=require('../src/core/ui/modules/layout/state-resolver');

assert(mobileHost.includes('const currentViewport=()=>{const visual=window.visualViewport'),'Mobile Host must prefer the live visualViewport for Presenter geometry.');
assert(mobileHost.includes('function publishSettledViewport()'),'Mobile Host must expose one generic settled-viewport publication path.');
assert(mobileHost.includes("window.addEventListener('orientationchange',publishSettledViewport")&&mobileHost.includes("window.visualViewport?.addEventListener?.('resize',publishSettledViewport"),'Orientation and visualViewport changes must converge through the same Presenter publication path.');
assert(mobileHost.includes('viewportSettleFrame=raf(()=>{viewportSettleFrame=raf(()=>{viewportSettleFrame=0;publish();});});'),'Viewport publication must include a post-layout double-frame pass.');

assert(presenter.includes('dkds.mobile.drawer-width.v21.\${this.viewportOrientation()}.\${scope}'),'Drawer width preference must be scoped by live orientation.');
assert(!presenter.includes('parameterSurfaceFloorPx')&&!presenter.includes('viewportInlineSize()*0.25'),'Presenter must not impose a mechanical viewport-percentage minimum width.');
assert(presenter.includes('resolveInlineConstraintDeficit(content)'),'Drawer width must remain content-driven through generic Unit inline deficits.');

assert(/\.dkds-action-button\{[^}]*white-space:nowrap;word-break:keep-all;overflow-wrap:normal/.test(structure),'Canonical Unit Action labels must be atomic and never wrap.');

let split=layout.createLayoutState({id:'orientation-y',axis:'y',defaultSize:180,min:140,reserve:300},{});
split=layout.withLayoutPreference(split,180,{height:450,width:820});
assert(Math.abs(split.preferredRatio-0.4)<1e-9,'A user split preference must record its live block-axis ratio.');
const portrait=layout.resolveLayout(split,{height:900,width:420},{nativeMobile:true});
assert.strictEqual(portrait.effectiveSize,360,'A y-axis split must replay the saved ratio after orientation/viewport growth instead of stale 180 px.');
const compact=layout.resolveLayout(split,{height:500,width:900},{nativeMobile:true});
assert.strictEqual(compact.effectiveSize,200,'The same split preference must scale back with the live visible block extent.');
assert.strictEqual(portrait.handleVisible,true,'Visible split handle must remain available after reflow.');

assert(vthUnit.includes("presentationPurpose:'parameters'")&&vthUnit.includes("existingNode:controlsHost,sizing:'fill'"),'Vth data-control must use the standard fill PRIME contract.');
assert(vthUnit.includes("axis:'y'")&&vthUnit.includes("resizeTarget:'second'")&&vthUnit.includes('defaultSize:180'),'Vth results remain a generic y-axis SplitPane.');
assert(!fs.existsSync(path.join(root,'src/plugins/transfer-vth-lab/plugin.css')),'Vth must not restore any private portrait/layout stylesheet after Unit cutover.');
assert.deepStrictEqual(vthManifest.styles,[],'Production Vth presentation remains Unit-owned.');

assert(dcMobile.includes('--dc-main-columns:minmax(184px,.82fr) minmax(0,1.18fr)')&&dcMobile.includes('--dc-main-areas:"source source" "tool chart"'),'Data Center native detail layout must retain its accepted two-column composition.');
assert(!dcMobile.includes('@container data-center-workspace (max-width:419px)')&&!dcMobile.includes('--dc-main-areas:"source" "tool" "chart"'),'Data Center must not mechanically collapse generic preview into a portrait-only row.');
assert(!dcMobile.includes('.dc-selection-tools>button{'),'Plugin Mobile CSS must not re-own canonical Unit Action nowrap behavior.');

console.log('v3.71.109 Mobile orientation/reflow executable contract PASS');
