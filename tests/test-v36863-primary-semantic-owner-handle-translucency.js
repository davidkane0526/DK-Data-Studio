'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(v,min)=>{const a=String(v).split('.').map(Number),b=String(min).split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(json('package.json').version,'3.68.63'));
assert(json('mobile/app.json').expo.android.versionCode>=90);

// The previous release carried `variant: primary` through projection, but the
// Semantic UI hydration pass later treated its module-specific owner as
// transient and erased the variant on the second pass. Core-created actions
// now use the canonical explicit component owner, so primary survives repeated
// hydration in main toolbars, ActionGroups and dedicated plugin titlebars.
const registry=read('src/core/theme/semantic-registry.js');
const toolbar=read('src/core/plugins/kernel/modules/commands/toolbar.js');
const actions=read('src/core/ui/modules/interaction/context-actions.js');
const chrome=read('src/plugin-window/chrome.js');
const appearance=read('src/styles/theme/component-appearance.css');
const ter=read('src/plugins/ter-analysis/unit-presentation.js');
const pulse=read('src/plugins/pulse-analysis/unit-presentation.js');
const dc=read('src/plugins/data-center/unit-presentation.js');
assert(registry.includes("dkdsComponentVariantOwner==='core-component'"),'Semantic registry must preserve explicit core-component variants.');
for(const [name,source] of [['plugin toolbar',toolbar],['ActionGroup',actions],['dedicated titlebar',chrome]]){
  assert(source.includes("dkdsComponentVariantOwner='core-component'"),`${name} must author canonical persistent component variants.`);
}
assert(chrome.includes('variant:row.variant'),'Dedicated titlebar must consume the projected action variant.');
assert(appearance.includes('[data-dkds-component-identity="toolbarAction"][data-dkds-component-variant="primary"]'),'Canonical primary action appearance must remain Theme-driven.');
for(const [name,source,needle] of [
  ['TER',ter,"label:'计算 TER',variant:'primary'"],
  ['Pulse',pulse,"label:'分析勾选',className:'primary',variant:'primary'"],
  ['Data Center',dc,"label:'运行工作流',className:'primary',variant:'primary'"],
]) assert(source.includes(needle),`${name} important action must explicitly request primary emphasis.`);

// User-approved shape stays identical; only visual footprint shrinks. The hue
// comes from current Theme floatingChrome slots and Core adds alpha by mixing
// with transparent. This is real translucency, not an opaque theme token.
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
const paint=read('src/styles/presentation/plugin-chrome.css');
assert(structure.includes('width:36px;height:36px'),'Resize hit target must remain 36×36.');
assert(structure.includes('width:18px;height:18px')&&structure.includes('width:15px;height:15px'),'Visible resize affordance must shrink to 18/15 while preserving the 3px relationship.');
assert(structure.includes('clip-path:polygon(100% 0,100% 100%,0 100%)'),'Accepted clipped geometry must not change.');
assert(paint.includes('color-mix(in srgb,var(--dkui-component-floating-chrome-indicator')&&paint.includes('58%,transparent'),'Outer layer must derive theme hue with visible alpha.');
assert(paint.includes('color-mix(in srgb,var(--dkui-component-floating-chrome-border-active')&&paint.includes('44%,transparent'),'Inner layer must derive theme hue with visible alpha.');
assert(paint.includes('color-mix(in srgb,var(--dkui-component-floating-chrome-border-hover')&&paint.includes('68%,transparent'),'Active treatment must remain theme-derived and translucent.');
assert(!paint.includes('backdrop-filter'),'No backdrop material/depth cue may return.');
assert(!/\.dkds-portable-resize-handle::(?:before|after)\s*\{[^}]*(?:rgba\(|#[0-9A-Fa-f]{3,8})/s.test(paint),'Handle CSS must not hard-code profile colors.');

console.log('v3.68.63 persistent primary semantics + translucent smaller resize handle PASS.');
