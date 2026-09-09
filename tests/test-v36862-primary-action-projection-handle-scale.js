'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(v,min)=>{const a=String(v).split('.').map(Number),b=String(min).split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(json('package.json').version,'3.68.62'));
assert(json('mobile/app.json').expo.android.versionCode>=89);

// Important action variants must survive every projection layer. The original
// page button already had primary semantics; 3.68.61 lost them when the
// dedicated titlebar rebuilt the action as quiet.
const actions=read('src/core/ui/modules/interaction/context-actions.js');
const model=read('src/core/ui/modules/presentation/model.js');
const chrome=read('src/plugin-window/chrome.js');
const ter=read('src/plugins/ter-analysis/feature-runtime.js');
assert(actions.includes("const ACTION_VARIANTS=new Set(['primary','secondary','selected','active','quiet','destructive'])"),'ActionGroup must normalize the canonical variant vocabulary once.');
assert(actions.includes('variant:actionVariant(action)'),'Action registry projection must retain the authored semantic variant.');
assert(model.includes('variant:text(row.variant)'),'Presentation model must not drop action variant metadata.');
assert(chrome.includes("variant:row.variant")&&chrome.includes("const semanticVariant=String(variant||'').trim()||(active?'active':'quiet')"),'Dedicated plugin titlebar must preserve primary/secondary variants instead of forcing quiet.');
assert(ter.includes("label:'计算 TER',className:'primary',variant:'primary'"),'TER calculate action must remain explicitly primary.');

// Native presenter must also retain the same emphasis rather than flattening
// the important action while moving it between direct and overflow slots.
const shellTypes=read('mobile/src/model/shell-types.ts');
const nativeHeader=read('mobile/src/components/NativeHeader.tsx');
const nativeSheet=read('mobile/src/sheets/ShellActionSheet.tsx');
assert(shellTypes.includes('variant?: string'),'Native shell action contract must carry the variant field.');
assert(nativeHeader.includes("const primary = row.kind === 'action' && row.variant === 'primary';")&&nativeHeader.includes('backgroundColor: primary ? palette.accent'),'Native topbar primary actions must use the active theme accent fill.');
assert(nativeSheet.includes("primary={action.variant === 'primary'}")&&nativeSheet.includes('backgroundColor: primary ? palette.accent'),'Overflowed primary actions must keep the same theme emphasis.');

// User-approved resize shape stays intact, only the visible footprint shrinks.
// The 36px input target is intentionally unchanged. Theme-owned translucent
// colors are allowed; z-depth effects that recreate a folded page are not.
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
const paint=read('src/styles/presentation/plugin-chrome.css');
assert(structure.includes('width:36px;height:36px'),'Resize interaction target must remain 36×36.');
assert(structure.includes('width:18px;height:18px')&&structure.includes('width:15px;height:15px'),'Visible resize corner must scale to 18/15 while preserving the 3px edge relationship.');
assert(structure.includes('clip-path:polygon(100% 0,100% 100%,0 100%)'),'Visible layers must remain the accepted clipped shape.');
assert(paint.includes('--dkui-component-floating-chrome-indicator')&&paint.includes('--dkui-component-floating-chrome-border-active'),'Resize-corner optical material must come from Theme floatingChrome slots.');
assert(!paint.includes('backdrop-filter'),'Backdrop sampling is forbidden because it recreates the folded-layer depth cue.');
assert(!/\.dkds-portable-resize-handle::(?:before|after)\s*\{[^}]*(?:rgba\(|#[0-9A-Fa-f]{3,8})/s.test(paint),'Handle paint itself must not hard-code profile colors.');

console.log('v3.68.62 primary action projection + smaller theme-owned handle PASS.');
