'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const appearance=read('src/core/theme/component-appearance.js');
const semantic=read('src/core/theme/semantic-registry.js');
assert(semantic.includes('const COMPONENT_SELECTOR=COMPONENTS.map(row=>row.selector).join')&&semantic.includes('function assignSubtree(root=document)')&&semantic.includes('PERF.subtreeBatches++'),
  'R7 Semantic UI must assign newly inserted dirty subtrees in the MutationObserver batch instead of scheduling repeated full component-selector rescans across later frames.');
assert(!semantic.includes("for(const node of record.addedNodes||[])if(node?.nodeType===1&&htmlElement(node))scheduleSemanticAssignment(node)"),
  'R7 Semantic UI observer must not enqueue every added node as a later root rescan.');
const split=read('src/core/ui/modules/layout/workspace.js');
const groupPlot=read('src/core/ui/modules/tooltip/group-plot.js');

assert(appearance.includes("const setData=(target,key,value)=>")&&appearance.includes("const clearData=(target,key)=>"),
  'R7 Component Appearance must keep dataset writes idempotent so bootstrap/theme composition does not create self-generated mutation churn.');
assert(!appearance.includes("target.dataset.dkdsComponentContext=resolved.context")&&!appearance.includes("target.dataset.dkdsComponentContextOwner='core-runtime'"),
  'R7 Component Appearance must not blindly rewrite component-context dataset values on every assignment.');
assert(appearance.includes("function assign(root=document,{syncSemantic=true}={})")&&appearance.includes('if(syncSemantic)Semantic.assign(root);'),
  'R7 Component Appearance must make Semantic synchronization explicit instead of coupling every appearance pass to a full semantic rescan.');
assert(appearance.includes('const semanticState=Semantic.performance?.()')&&appearance.includes('if(!semanticState||semanticState.documentAssignments===0)Semantic.assign(document);'),
  'R7 startup must reuse only a completed document-wide Semantic bootstrap; prior subtree/probe assignments are not sufficient.');
assert(appearance.includes('const recomposeAll=()=>scheduleAppearance(document)')&&appearance.includes("globalThis.addEventListener?.('dkds:theme-changed',recomposeAll)")&&appearance.includes("globalThis.addEventListener?.('dkds:theme-profile-changed',recomposeAll)"),
  'R7 theme/profile events must collapse into the same frame-batched appearance recomposition.');

assert(appearance.includes("function variantDelta(baseRow={},resolvedRow={},variant='')")&&appearance.includes('const variantRow=variantDelta(baseRow,row,variant)')&&appearance.includes('resolved.baseRow?.[slot]')&&appearance.includes('resolved.variantRow?.[slot]'),
  'R7 Component Appearance must derive variant CSS variables from the final Theme Contract composition delta so role/context precedence is preserved without copying the base row into every variant.');
assert(!appearance.includes('function variantOverrides(profile,id,variant,context,role)'),
  'R7 must not manually reconstruct Theme variant precedence outside ThemeContract.resolveComponentAppearance.');
const componentCss=read('src/styles/theme/component-appearance.css');
assert(componentCss.includes('border:1px solid var(--dkds-ca-menu-border);border-radius:var(--dkui-component-menu-item-radius,7px)')&&componentCss.includes('--dkds-ca-menu-shadow-selected:'),
  'R7 menu/legend actions must own a one-pixel rounded canonical edge instead of inheriting the browser button frame or a square double border.');
assert(split.includes('schedulePreview(value)')&&split.includes('const raf=globalThis.requestAnimationFrame')&&split.includes('this.previewFrame=raf(()=>{this.previewFrame=0;'),
  'R7 SplitController must coalesce pointer preview geometry with requestAnimationFrame.');
assert(split.includes('this.schedulePreview(this.drag.size+(point-this.drag.start)*sign)')&&!/const move=e=>[^\n]*this\.apply\(this\.drag\.size/.test(split),
  'R7 split pointermove must only schedule preview geometry, not synchronously apply every pointer event.');
assert(split.includes('this.scope.resizeScheduler?.suspend?.()')&&split.includes('this.scope.resizeScheduler?.resume?.()'),
  'R7 split interaction must suspend shared chart/layout resize work during continuous drag and resume at commit.');
assert(split.includes("this.apply(this.size,{persist:true,emit:false,notify:false})")&&split.includes("this.scope.emitResize?.({reason:'split-end'"),
  'R7 split release must persist once and emit one authoritative resize request after preview.');
assert(!/const move=e=>[^\n]*(?:persist:true|emitResize)/.test(split),
  'R7 split pointermove must never persist state or emit authoritative layout resize work.');
assert(groupPlot.includes("dkds-split-drag-active")&&groupPlot.includes('if(document.documentElement?.classList?.contains'),
  'R7 GroupPlot ResizeObserver must ignore split-preview geometry so child plots are not resized on every drag frame.');

console.log('v3.67.10 R7 theme bootstrap and split-preview performance contract checks passed.');
