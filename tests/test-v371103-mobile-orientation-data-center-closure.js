'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.103'),'v3.71.103+ source required.');

const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const structure=read('src/styles/structure/super-top-contract.css');
const split=read('src/core/ui/modules/composition/unit-template-behavior.js');
const vth=read('src/plugins/transfer-vth-lab/unit-presentation.js');
const dcMobile=read('src/plugins/data-center/mobile.css');
const dcFeature=read('src/plugins/data-center/feature-runtime.js');
const material=read('src/styles/theme/material-renderer.css');
const dcManifest=json('src/plugins/data-center/plugin.json');

// 1. Re-projecting an already mounted Drawer after orientation/viewport changes
// must recompute the current Unit-derived minimum instead of keeping stale width.
assert(presenter.includes("if(region==='drawer'){this.installDrawerHandle(saved.frame,surfaceId,storageScope);this.installDrawerConstraintListener(saved.frame,surfaceId,storageScope);this.scheduleDrawerFit(saved.frame,surfaceId,storageScope);}"),'Every live Drawer projection must reschedule content-width fitting.');
assert(structure.includes('.dkds-action-button')&&/\.dkds-action-button\{[^}]*white-space:nowrap/.test(structure),'Canonical action-button labels, including range-selection actions, must never wrap.');

// Runtime evidence for orientation re-entry: a stale user preference that is
// narrower than the newly measured portrait minimum is clamped upward on fit.
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(el,p,v){if(el?.style?.setProperty)el.style.setProperty(p,String(v));else if(el?.style)el.style[p]=String(v);return v;},setToken(el,p,v){return this.set(el,p,v);},remove(){return true;}};
global.window={innerWidth:744,addEventListener(){},removeEventListener(){}};global.innerWidth=744;
global.localStorage={getItem(){return '210';},setItem(){},removeItem(){}};
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const runtimePresenter=new MobileWebSurfacePresenter();
const styleMap=new Map(),frame={isConnected:true,dataset:{},style:{setProperty(k,v){styleMap.set(k,String(v));}},parentElement:{clientWidth:744}};
runtimePresenter.solveMinimumReasonableWidth=()=>340;runtimePresenter.syncDrawerSafeExtent=()=>0;runtimePresenter.setData=(node,key,value)=>{node.dataset[key]=String(value);return true;};runtimePresenter.setStyle=(node,key,value)=>{node.style.setProperty(key,value);return true;};
runtimePresenter.fitDrawerToContent(frame,'data-control','resonance:data-control');
assert.strictEqual(styleMap.get('width'),'340px','Portrait re-fit must raise a stale 210 px saved Drawer width to the current 340 px Unit minimum.');
assert.strictEqual(frame.dataset.dkdsMobileDrawerFitted,'true');

// 2. Inline-width responsive reflow only makes sense for left/right SplitPanes.
// A top/bottom SplitPane is already vertical and must keep its handle in portrait.
assert(split.includes("reflow=axis==='x'&&reflowBelow!==null"),'SplitPane reflowBelow must only transform x-axis splits.');
assert(vth.includes("axis:'y'")&&vth.includes('reflowBelow:920')&&vth.includes("resizeTarget:'second'"),'Vth must continue to use the generic resizable top/bottom SplitPane contract.');

// 3. Data Center portrait keeps formula + generic preview in the accepted two-column row.
assert(dcMobile.includes('--dc-main-columns:minmax(184px,.82fr) minmax(0,1.18fr)')&&dcMobile.includes('--dc-main-areas:"source source" "tool chart"'),'Data Center native home layout must default to the accepted two-column detail row.');
assert(!dcMobile.includes('@container data-center-workspace (max-width:419px)')&&!dcMobile.includes('--dc-main-areas:"source" "tool" "chart"'),'Native Data Center must not use a hard portrait breakpoint to force the detail row into one column.');

// 4. The growing auto-flow PRIMARY host is geometry only; child Unit Panels own visible depth.
assert(material.includes('.dkds-plugin-canvas-frame[data-primary-scroll="auto"] .dkds-analysis-primary-host[data-primary-scroll="auto"]')&&material.includes('box-shadow:none'),'Mobile auto-flow PRIMARY host must not paint a second shadow through long content.');

// 5. Project/store replacement must invalidate catalog identity even when the new
// store happens to expose the same numeric revision; metadata list paint is side-effect free.
assert(dcFeature.includes("function invalidateArtifactCaches(){catalogCache={revision:-1,rows:[]};fullCache={id:'',revision:-1,artifact:null};}"),'Data Center must expose one cache invalidation path for project/store replacement.');
assert(dcFeature.includes("ctx.events.on('data:artifacts-changed',()=>{invalidateArtifactCaches();"),'Artifact replacement/change must invalidate the catalog before repaint.');
assert(dcFeature.includes("meta?.reason==='project-restore'||meta?.reason==='project-reset'||meta?.reason==='reset')invalidateArtifactCaches()"),'Project restore/reset must invalidate Data Center artifact caches independent of revision equality.');
const renderStart=dcFeature.indexOf('function renderArtifacts()'),renderEnd=dcFeature.indexOf('function renderPreview()',renderStart),renderBlock=dcFeature.slice(renderStart,renderEnd);
assert(renderStart>=0&&renderEnd>renderStart,'Data Center renderArtifacts() block missing.');
assert(!renderBlock.includes('projectArtifact?.(a)'),'Metadata catalog painting must not project metadata snapshots as complete Artifacts.');
assert(renderBlock.includes('provenanceCount')&&renderBlock.includes("id=String(a?.id||'')")&&renderBlock.includes("name=String(a?.name||id||'未命名数据对象')"),'Artifact rows must be paintable from bounded listMetadata snapshots.');
assert(atLeast(dcManifest.version,'1.15.35'),'Data Center plugin version must advance for the project-restore/list and portrait-layout fixes.');

console.log('v3.71.103 Mobile orientation + Vth split + Data Center portrait/restore closure PASS');
