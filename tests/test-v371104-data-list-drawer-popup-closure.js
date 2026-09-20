'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=require('../package.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.104'),'v3.71.104+ source required.');

// Data Center dynamic Artifact rows must remain on the canonical Unit List path.
// v3.71.105 moves the atomic staging responsibility into the retained List Unit.
const dc=read('src/plugins/data-center/feature-runtime.js');
const foundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
assert(dc.includes('artifactListUnit?.setItems')||dc.includes('artifactListUnit.setItems(specs)'),'Data Center restored rows must update the retained Unit List handle.');
assert(dc.includes('dkdsRenderedArtifactRows'),'Data Center must expose the committed catalog count for runtime diagnostics.');
assert(foundation.includes("if(spec.selectable===true){node.setAttribute('role',String(spec.role||'option'));node.dataset.dkdsComponentIdentity='menuItem';node.dataset.dkdsComponentIdentityOwner='core-unit-list';}"),'Selectable Unit ListItems must receive synchronous Core selection/menu-item identity instead of waiting for async semantic hydration.');

// A portal menu opened by a control inside a Mobile Drawer is a logical child of
// that Drawer. Pointerdown on an option must not be misclassified as an outside tap.
{
  const prior={window:global.window,document:global.document,performance:global.performance};
  const listeners={};
  let popupItem=null,select=null;
  const frame={dataset:{dkdsMobileSurfaceId:'parameters'},contains:node=>node===select};
  select={closest(selector){if(selector.includes('data-dkds-mobile-frame-region="drawer"'))return frame;if(selector.includes('select'))return select;return null;}};
  popupItem={closest(selector){if(selector.includes('button'))return popupItem;return null;}};
  const menuElement={contains:node=>node===popupItem};
  global.window={DKDSPlugins:{activities:{active:()=> 'resonance'}}};
  global.document={addEventListener(type,fn){listeners[type]=fn;},querySelectorAll(selector){return selector.includes('dkds-mobile-frame-region="drawer"')?[frame]:[];}};
  global.performance={now:()=>1000};
  delete require.cache[require.resolve('../src/core/ui/modules/interaction/transient-registry')];
  delete require.cache[require.resolve('../src/core/ui/modules/interaction/adapters')];
  const registry=require('../src/core/ui/modules/interaction/transient-registry');
  const menu={element:menuElement,spec:{anchor:select},close(){}};registry.registerContextMenu(menu);
  const {MobileGestureAdapter}=require('../src/core/ui/modules/interaction/adapters');let dispatched=0;
  new MobileGestureAdapter({dispatch:()=>{dispatched++;return true;}}).installDocumentBindings();
  listeners.pointerdown({isPrimary:true,pointerType:'touch',pointerId:9,clientX:420,clientY:260,target:popupItem,composedPath:()=>[popupItem,menuElement],cancelable:true,preventDefault(){},stopPropagation(){}});
  assert.strictEqual(dispatched,0,'Selecting an option in a Drawer-owned portal popup must not dismiss the Drawer.');
  registry.unregisterContextMenu(menu);
  if(prior.window===undefined)delete global.window;else global.window=prior.window;
  if(prior.document===undefined)delete global.document;else global.document=prior.document;
  if(prior.performance===undefined)delete global.performance;else global.performance=prior.performance;
}

console.log('v3.71.104 Data Center Unit-list + Mobile Drawer logical-popup containment PASS');
