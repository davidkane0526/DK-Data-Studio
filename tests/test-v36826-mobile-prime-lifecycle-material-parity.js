'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(value,floor)=>{const a=String(value).split('.').map(Number),b=String(floor).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};

const pkg=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
assert(atLeast(pkg.version,'3.68.0'));
assert.strictEqual(mobile.version,pkg.version);
assert.strictEqual(expo.version,pkg.version);
assert(expo.android.versionCode>=65);

const host=read('src/core/host/mobile-host-runtime.js');
for(const token of [
  'const reconcileOpenSurfaceState=core=>',
  "const liveOpen=surfaces.filter(surface=>surface?.kind==='prime'&&surface?.active===true&&text(surface?.role)!=='data-control')",
  "else if(kind==='prime'&&surfaceId)",
  'const mobileOwned=text(before.role)===\'data-control\'',
  'const open=mobileOwned?trackedOpen:(actualOpen===null?trackedOpen:actualOpen)'
]) assert(host.includes(token),`Mobile PRIME lifecycle reconciliation missing: ${token}`);
assert(host.includes("window.DKDSUI?.workspaces?.deactivate?.(activityId,openId)"),'Conflicting PRIME cleanup must close the real workspace surface, not only native tracking state.');

const resonancePresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
assert(resonancePresentation.includes("const inspectDefault=allowed.has(String(pluginDefaults.inspectPlacement||''))?String(pluginDefaults.inspectPlacement):'right'"),'Inspector semantic default must remain right in the production Unit presentation; orientation mapping belongs to the Presenter.');
assert(!resonancePresentation.includes('isNativeClient')&&resonancePresentation.includes("stateVersion:'workspace-v5'"),'Resonance production Unit presentation must remain platform-neutral and keep its Desktop-compatible semantic state version.');
const portable=read('src/core/ui/modules/layout/portable-view.js'),mobileSurface=read('src/core/ui/modules/presentation/mobile-web-surface.js');
assert(portable.includes("const savedUserPlacement=saved.placementSource==='user'?saved.placement:''")&&portable.includes("placementSource:source==='user'?'user':(source||undefined)"),'PortableView must restore only explicit current-contract user placement; untagged historical placement must not be interpreted through a legacy branch.');
assert(mobileSurface.includes("const semanticHome=semanticRole==='inspector'?'right':semanticRole==='scientific-secondary'?'bottom':''")&&mobileSurface.includes("placement===semanticHome"),'Mobile Presenter must own non-user inspector and scientific-secondary geometry while preserving explicit user placement.');

const presenters=read('src/core/ui/modules/presentation/presenters.js');
assert(presenters.includes("role===roles.INSPECTOR")&&presenters.includes("region:'companion-right'"),'Mobile Presenter must map the same inspector to bottom in portrait and right in landscape.');

const css=read('src/styles/platform/native-workspace-presentation.css');
assert(css.includes('[data-dkds-mobile-companion-right="true"] .dkds-plugin-canvas-frame'),'Compact landscape inspector composition must be orientation-driven even below 520 CSS px.');
assert(css.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Landscape group panel must occupy a separate bottom row rather than being covered by the inspector.');
assert(css.includes('flex:1 1 0;width:100%;height:100%;'),'Projected landscape inspector frame must be bounded to the right top-row viewport.');

const app=read('mobile/App.tsx'),foundation=read('src/app/modules/foundation.js'),bridge=read('src/web-bridge.js');
assert(!app.includes('WebServicePopover')&&app.includes("host.hostRequest('status', { pluginId: 'builtin.status-monitor', id: 'lan-web' })"),'Mobile LAN status must open the Core WebView panel.');
assert(foundation.includes("window.DKDSMaterialSurface?.apply?.(panel,'popover')"),'Core LAN panel must use popover Material parity.');
assert(bridge.includes("nativeCall('webApplySettings'")&&bridge.includes("nativeCall('webRegenerateKey'"),'Core LAN panel must keep Android settings/key functionality through native bridge.');

console.log('v3.68.27 Mobile PRIME lifecycle/material/orientation closure PASS');
