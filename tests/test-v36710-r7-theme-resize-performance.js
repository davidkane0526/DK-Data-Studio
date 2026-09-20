'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const appearance=read('src/core/theme/component-appearance.js');
const semantic=read('src/core/theme/semantic-registry.js');
const themeRuntime=read('src/core/theme/runtime.js');
assert(semantic.includes('const COMPONENT_SELECTOR=COMPONENTS.map(row=>row.selector).join')&&semantic.includes('function assignSubtree(root=document)')&&semantic.includes('PERF.subtreeBatches++'),
  'R7 Semantic UI must assign newly inserted dirty subtrees in the MutationObserver batch instead of scheduling repeated full component-selector rescans across later frames.');
assert(!semantic.includes("for(const node of record.addedNodes||[])if(node?.nodeType===1&&htmlElement(node))scheduleSemanticAssignment(node)"),
  'R7 Semantic UI observer must not enqueue every added node as a later root rescan.');
const split=read('src/core/ui/modules/layout/workspace.js');
const layoutState=read('src/core/ui/modules/layout/state-resolver.js');
const groupPlot=read('src/core/ui/modules/tooltip/group-plot.js');

assert(appearance.includes("const setData=(target,key,value)=>")&&appearance.includes("const clearData=(target,key)=>"),
  'R7 Component Appearance must keep dataset writes idempotent so bootstrap/theme composition does not create self-generated mutation churn.');
assert(!appearance.includes("target.dataset.dkdsComponentContext=resolved.context")&&!appearance.includes("target.dataset.dkdsComponentContextOwner='core-runtime'"),
  'R7 Component Appearance must not blindly rewrite component-context dataset values on every assignment.');
assert(appearance.includes("function assign(root=document,{syncSemantic=true}={})")&&appearance.includes('if(syncSemantic)Semantic.assign(root);'),
  'R7 Component Appearance must make Semantic synchronization explicit instead of coupling every appearance pass to a full semantic rescan.');
assert(appearance.includes('const semanticState=Semantic.performance?.()')&&appearance.includes('if(!semanticState||semanticState.documentAssignments===0)Semantic.assign(document);'),
  'R7 startup must reuse only a completed document-wide Semantic bootstrap; prior subtree/probe assignments are not sufficient.');
assert(!appearance.includes("globalThis.addEventListener?.('dkds:theme-changed'")&&!appearance.includes("globalThis.addEventListener?.('dkds:theme-profile-changed'"),
  'Current Theme Runtime must own DOM composition synchronously; Component Appearance must not subscribe to broad Theme repaint events.');

assert(themeRuntime.includes('function commitProfile(key,{emit=true,detail={}}={})')&&themeRuntime.includes('applyProfileTokens(current);refreshVisualComposition();')&&themeRuntime.includes('visualSynchronized:true,...detail'),
  'R7I profile activation must use the same atomic synchronous visual transaction as light/dark switching.');
assert(themeRuntime.includes("commitProfile(profile.id,{detail:{restored:true}})")&&!themeRuntime.includes("activeProfile=profile.id;applyProfileTokens(current);try{globalThis.dispatchEvent(new CustomEvent('dkds:theme-profile-changed'"),
  'R7I saved Theme-provider restoration must not retain the old unsynchronized token/event path that produced startup overlap.');

assert(appearance.includes("function variantDelta(baseRow={},resolvedRow={},variant='')")&&appearance.includes('const variantRow=variantDelta(baseRow,row,variant)')&&appearance.includes('resolved.baseRow?.[slot]')&&appearance.includes('resolved.variantRow?.[slot]'),
  'R7 Component Appearance must derive variant CSS variables from the final Theme Contract composition delta so role/context precedence is preserved without copying the base row into every variant.');
assert(!appearance.includes('function variantOverrides(profile,id,variant,context,role)'),
  'R7 must not manually reconstruct Theme variant precedence outside ThemeContract.resolveComponentAppearance.');
const componentCss=read('src/styles/theme/component-appearance.css');
assert(componentCss.includes('border:1px solid var(--dkds-ca-menu-border);border-radius:var(--dkui-component-menu-item-radius,7px)')&&componentCss.includes('--dkds-ca-menu-shadow-selected:'),
  'R7 menu/legend actions must own a one-pixel rounded canonical edge instead of inheriting the browser button frame or a square double border.');
assert(split.includes('schedulePreview(value)')&&split.includes('const raf=globalThis.requestAnimationFrame')&&split.includes('this.previewFrame=raf(()=>{this.previewFrame=0;this.paintPreview();'),
  'R7 SplitController must coalesce live panel preview writes with requestAnimationFrame.');
assert(split.includes('this.previewViewport=this.viewport(this.drag?.rect)')&&split.includes('if(Number.isFinite(raw))this.previewSize=raw')&&split.includes('if(this.previewFrame)return'),
  'Current SplitController must own frozen drag geometry and coalesce raw pointer events without runtime method replacement.');
assert(layoutState.includes('function resolveLayout(state,viewport={},platformProfile={})')&&layoutState.includes("platform:nativeMobile?'mobile':'desktop'"),
  'Desktop and Native Mobile split constraints must resolve through one pure Core layout function.');
assert(split.includes('this.schedulePreview(this.drag.size+(point-this.drag.start)*sign)')&&!/const move=e=>[^\n]*this\.apply\(this\.drag\.size/.test(split),
  'R7 split pointermove must only schedule preview geometry, not synchronously apply every pointer event.');
assert(split.includes('this.scope.resizeScheduler?.suspend?.()')&&split.includes('this.scope.resizeScheduler?.resume?.()'),
  'R7 split interaction must suspend shared chart/layout resize work during continuous drag and resume at commit.');
assert(split.includes("this.apply(next,{persist,emit:false,notify:false,intent:true,viewport:this.previewViewport||this.viewport()})")&&split.includes("this.scope.emitResize?.({reason,id:this.spec.id,size:this.size})"),
  'R7 split release must persist once and emit one authoritative resize request after preview, including shared held-title commits.');
assert(!/const move=e=>[^\n]*(?:persist:true|emitResize)/.test(split),
  'R7 split pointermove must never persist state or emit authoritative layout resize work.');
assert(groupPlot.includes("dkds-split-drag-active")&&groupPlot.includes('if(document.documentElement?.classList?.contains'),
  'R7 GroupPlot ResizeObserver must ignore split-preview geometry so child plots are not resized on every drag frame.');

console.log('v3.67.10 R7 theme bootstrap and split-preview performance contract checks passed.');
