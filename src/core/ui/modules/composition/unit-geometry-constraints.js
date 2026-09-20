'use strict';

// One geometry-constraint registry sits between Unit-owned intrinsic geometry and
// Presenter-owned outer Surface allocation. Plugins may only tune accepted Unit
// parameters; they never publish arbitrary width/height writes through this API.
const REGISTRY_KEY='__dkdsUnitGeometryConstraintRegistryV1';
const AXES=Object.freeze(['inline','block']);
const EVENTS=Object.freeze({inline:'dkds:unit-inline-constraint',block:'dkds:unit-block-constraint'});
const MARKERS=Object.freeze({inline:'dkdsUnitGeometryInline',block:'dkdsUnitGeometryBlock'});

const UNIT_GEOMETRY_OWNERSHIP_POLICY=Object.freeze({
  version:'1.0.5',
  principle:'single-writer-bounded-configuration-v1',
  roles:Object.freeze({
    plugin:'bounded-configuration',
    unit:'intrinsic-constraint-and-internal-layout',
    presenter:'outer-surface-allocation',
    userPreference:'preference-only'
  }),
  immutable:Object.freeze([
    'final Surface frame width/height',
    'platform placement and projection',
    'canonical control hit geometry',
    'canonical paint/typography/state/accessibility',
    'runtime style-writer ownership',
    'parameter PRIME outer content inset',
    'internal scroll extent cannot own outer Surface allocation',
    'Presenter measurement cannot replay projected Surface root Layout geometry'
  ]),
  boundedTunables:Object.freeze([
    'published Layout variant',
    'accepted Layout geometry',
    'accepted responsive geometry/breakpoints',
    'non-parameter PRIME detailGeometry.contentInsetPx',
    'PRIME detailGeometry.minContentInlinePx/minContentBlockPx',
    'PlotView detailGeometry.contentAspectRatio',
    'PlotView detailGeometry.contentMinHeightPx/contentMaxHeightPx',
    'PlotGroup columns/preferredColumns/minItemWidth/density/gap',
    'Workspace accepted rail/detail geometry'
  ]),
  constraintAxes:Object.freeze({
    inline:Object.freeze({unitPublishes:'minimum local inline size',presenterResolves:'final Surface inline allocation'}),
    block:Object.freeze({unitPublishes:'content minimum plus optional explicit preferred local block size',presenterResolves:'final Surface block allocation; Mobile companion shells may compress below content minimum only when the Unit has its own internal scroll owner so every outer Surface remains visible'})
  })
});

const finiteNonNegative=value=>{const n=Number(value);return Number.isFinite(n)&&n>=0?n:0;};
const effectivePrimeEndInset=root=>root?.dataset?.dkdsMobileParameterInsetHandoff==='true'?0:finiteNonNegative(root?.dataset?.dkdsUnitPrimeContentInsetPx);
const registryFor=(node,create=false)=>{
  if(!node)return null;
  let registry=node[REGISTRY_KEY];
  if(!registry&&create){
    registry={inline:new Map(),block:new Map()};
    try{Object.defineProperty(node,REGISTRY_KEY,{value:registry,writable:false,configurable:true});}catch{node[REGISTRY_KEY]=registry;}
  }
  return registry||null;
};
const normalizeTarget=(target,node)=>target?.nodeType===1?target:node;
function normalizeConstraint(axis,row,node,id='unit'){
  const source=row&&typeof row==='object'?row:{};
  if(axis==='inline'){
    const minInlinePx=finiteNonNegative(source.minInlinePx??source.minimumPx);
    return Object.freeze({axis,kind:String(source.kind||id||'unit'),minInlinePx,target:normalizeTarget(source.target,node),priority:String(source.priority||'density'),variant:source.variant});
  }
  const minBlockPx=finiteNonNegative(source.minBlockPx??source.minimumPx),hasPreferredBlockPx=source.preferredBlockPx!==undefined||source.preferredPx!==undefined,preferredBlockPx=hasPreferredBlockPx?Math.max(minBlockPx,finiteNonNegative(source.preferredBlockPx??source.preferredPx)):minBlockPx;
  return Object.freeze({axis,kind:String(source.kind||id||'unit'),minBlockPx,preferredBlockPx,hasPreferredBlockPx,target:normalizeTarget(source.target,node),rows:finiteNonNegative(source.rows),columns:finiteNonNegative(source.columns),priority:String(source.priority||'content')});
}
function markerName(axis){if(!AXES.includes(axis))throw new Error(`UNIT_GEOMETRY_CONSTRAINT_AXIS_INVALID: ${axis}`);return MARKERS[axis];}
function publishUnitGeometryConstraint(node,axis,id,provider){
  if(!node||node.nodeType!==1)throw new Error('UNIT_GEOMETRY_CONSTRAINT_NODE_REQUIRED');
  if(!AXES.includes(axis))throw new Error(`UNIT_GEOMETRY_CONSTRAINT_AXIS_INVALID: ${axis}`);
  const key=String(id||'unit').trim();if(!key)throw new Error('UNIT_GEOMETRY_CONSTRAINT_ID_REQUIRED');
  if(typeof provider!=='function'&&(provider==null||typeof provider!=='object'))throw new Error('UNIT_GEOMETRY_CONSTRAINT_PROVIDER_INVALID');
  const registry=registryFor(node,true),map=registry[axis];map.set(key,provider);
  if(node.dataset)node.dataset[markerName(axis)]='true';
  return ()=>removeUnitGeometryConstraint(node,axis,key);
}
function removeUnitGeometryConstraint(node,axis,id){
  if(!node||!AXES.includes(axis))return false;const registry=registryFor(node,false),map=registry?.[axis];if(!map)return false;
  const removed=map.delete(String(id||'unit'));if(map.size===0&&node.dataset)delete node.dataset[markerName(axis)];
  if(registry.inline.size===0&&registry.block.size===0)try{delete node[REGISTRY_KEY];}catch{}
  return removed;
}
function readNodeGeometryConstraints(node,axis){
  if(!node||!AXES.includes(axis))return [];
  const map=registryFor(node,false)?.[axis];if(!map?.size)return [];
  const rows=[];for(const [id,provider] of map.entries()){
    let raw=null;try{raw=typeof provider==='function'?provider():provider;}catch{raw=null;}
    if(!raw)continue;const row=normalizeConstraint(axis,raw,node,id);
    if(axis==='inline'&&row.minInlinePx<=0)continue;
    if(axis==='block'&&row.minBlockPx<=0&&row.preferredBlockPx<=0)continue;
    rows.push(row);
  }
  return rows;
}
function collectUnitGeometryConstraints(root,axis){
  if(!root||!AXES.includes(axis))return [];
  const nodes=[];const add=node=>{if(node&&!nodes.includes(node))nodes.push(node);};add(root);
  const attr=axis==='inline'?'[data-dkds-unit-geometry-inline]':'[data-dkds-unit-geometry-block]';
  for(const node of root.querySelectorAll?.(attr)||[])add(node);
  const rows=[];for(const node of nodes)for(const row of readNodeGeometryConstraints(node,axis))rows.push(Object.freeze({...row,node}));
  return rows;
}
function notifyUnitGeometryConstraint(node,axis,detail={}){
  if(!node||!AXES.includes(axis)||typeof node.dispatchEvent!=='function'||typeof globalThis.CustomEvent!=='function')return false;
  try{node.dispatchEvent(new CustomEvent(EVENTS[axis],{bubbles:true,detail:{axis,...detail}}));return true;}catch{return false;}
}
function measureInlineSize(node){
  if(!node)return 0;const client=finiteNonNegative(node.clientWidth);if(client>0)return client;return finiteNonNegative(node.getBoundingClientRect?.().width);
}
function intentionalHorizontalScroll(node){
  if(!node||node===node?.ownerDocument?.documentElement)return false;
  const parameterLegend=node.matches?.('[data-dkds-unit-template="legend-v2"]')&&node.closest?.('[data-dkds-presentation-purpose="parameters"]');
  if(parameterLegend)return true;
  if(node.matches?.('[data-dkds-horizontal-scroll],.table-wrap,.table-scroll,.data-table-scroll,.dkds-table-wrap'))return true;
  const overflow=String(node.style?.overflowX||'').trim().toLowerCase();return overflow==='auto'||overflow==='scroll';
}
function reflowUnitGeometry(root,{passes=2,includeRoot=true}={}){
  if(!root)return 0;
  const rows=[];const isProjectedSurfaceRoot=node=>!!(node?.dataset?.dkdsMobileRegion&&node?.dataset?.dkdsMobileActive!=='false');
  const add=node=>{if(node&&typeof node.__dkdsUnitLayoutReflow==='function'&&!isProjectedSurfaceRoot(node)&&!rows.includes(node))rows.push(node);};
  // Any active Mobile-projected Surface root is Presenter geometry, even when a
  // broader canvas reflow walks through it. Descendant Unit recipes may settle,
  // but the PRIME/companion root recipe must never replay pre-projection width or
  // height (for example height:100%) over the Presenter allocation.
  if(includeRoot!==false)add(root);for(const node of root.querySelectorAll?.('[data-dkds-unit-layout-recipe]')||[])add(node);
  const count=Math.max(1,Math.min(4,Math.round(Number(passes)||1)));
  for(let pass=0;pass<count;pass+=1){
    for(const node of rows)try{node.__dkdsUnitLayoutReflow();}catch{}
    // Flush the accepted Unit tree between passes so nested responsiveTarget
    // layouts measure their parent's newly resolved content box. The Presenter
    // does not participate in this internal layout settlement.
    try{root.getBoundingClientRect?.();}catch{}
  }
  return rows.length;
}
function resolveInlineConstraintDeficit(root,{measure=measureInlineSize,isIntentionalHorizontalScroll=intentionalHorizontalScroll}={}){
  if(!root)return Object.freeze({deficitPx:0,constraintDeficitPx:0,boundaryDeficitPx:0,overflowDeficitPx:0,constraints:Object.freeze([])});
  const constraints=collectUnitGeometryConstraints(root,'inline');let constraintDeficitPx=0,boundaryDeficitPx=0;
  const rootRect=root.getBoundingClientRect?.(),unitEndInset=effectivePrimeEndInset(root);
  const rootEnd=Number.isFinite(Number(rootRect?.right))?Number(rootRect.right)-unitEndInset:null;
  for(const row of constraints){
    const actual=finiteNonNegative(measure(row.target));if(actual>0&&actual<row.minInlinePx)constraintDeficitPx=Math.max(constraintDeficitPx,row.minInlinePx-actual);
    // A target can keep its own max-content width yet extend beyond the PRIME
    // content edge (the Pulse Designer Vd/Vs/Vg regression). Published Unit
    // constraints therefore protect both intrinsic size and containment.
    const targetRect=row.target?.getBoundingClientRect?.();if(rootEnd!==null&&Number.isFinite(Number(targetRect?.right)))boundaryDeficitPx=Math.max(boundaryDeficitPx,Number(targetRect.right)-rootEnd);
  }
  // Containment is a final geometry invariant, not merely a padding declaration.
  // Every ordinary Unit must finish inside the PRIME content edge; only Units that
  // explicitly own horizontal scrolling (for example a parameter Legend) may cross
  // that edge without widening the Drawer.
  const unitNodes=[...(root.querySelectorAll?.('[data-dkds-unit-template]')||[])];
  for(const node of unitNodes){
    if(isIntentionalHorizontalScroll(node)||node?.hidden||node?.classList?.contains?.('hidden'))continue;
    const rect=node.getBoundingClientRect?.();if(rootEnd!==null&&Number.isFinite(Number(rect?.right)))boundaryDeficitPx=Math.max(boundaryDeficitPx,Number(rect.right)-rootEnd);
  }
  let overflowDeficitPx=0;const nodes=[root,...unitNodes];
  for(const node of nodes){if(isIntentionalHorizontalScroll(node)||node?.hidden||node?.classList?.contains?.('hidden'))continue;const width=finiteNonNegative(measure(node)),scroll=finiteNonNegative(node.scrollWidth);if(width>0&&scroll>width+1)overflowDeficitPx=Math.max(overflowDeficitPx,scroll-width);}
  return Object.freeze({deficitPx:Math.ceil(Math.max(constraintDeficitPx,boundaryDeficitPx,overflowDeficitPx)),constraintDeficitPx:Math.ceil(constraintDeficitPx),boundaryDeficitPx:Math.ceil(Math.max(0,boundaryDeficitPx)),overflowDeficitPx:Math.ceil(overflowDeficitPx),constraints:Object.freeze(constraints)});
}
function offsetInlineFromRoot(root,target){
  if(!root||!target||root===target)return 0;
  const rootRect=root.getBoundingClientRect?.(),targetRect=target.getBoundingClientRect?.();
  if(Number.isFinite(Number(rootRect?.left))&&Number.isFinite(Number(targetRect?.left)))return Math.max(0,Number(targetRect.left)-Number(rootRect.left));
  let left=0,cur=target,guard=0;while(cur&&cur!==root&&guard<128){left+=finiteNonNegative(cur.offsetLeft);cur=cur.offsetParent||cur.parentElement;guard+=1;}return cur===root?left:0;
}
function resolveInlineSurfaceConstraint(root){
  if(!root)return Object.freeze({minInlinePx:0,constraints:Object.freeze([])});
  const constraints=collectUnitGeometryConstraints(root,'inline');let min=0;
  const unitEndInset=effectivePrimeEndInset(root);
  for(const row of constraints){const overhead=row.target===root?0:offsetInlineFromRoot(root,row.target)+unitEndInset;min=Math.max(min,row.minInlinePx+overhead);}
  return Object.freeze({minInlinePx:Math.ceil(min),constraints:Object.freeze(constraints)});
}
function offsetFromRoot(root,target){
  if(!root||!target||root===target)return 0;
  const rootRect=root.getBoundingClientRect?.(),targetRect=target.getBoundingClientRect?.();
  if(Number.isFinite(Number(rootRect?.top))&&Number.isFinite(Number(targetRect?.top)))return Math.max(0,Number(targetRect.top)-Number(rootRect.top));
  let top=0,cur=target,guard=0;while(cur&&cur!==root&&guard<128){top+=finiteNonNegative(cur.offsetTop);cur=cur.offsetParent||cur.parentElement;guard+=1;}return cur===root?top:0;
}
function resolveBlockSurfaceConstraint(root){
  if(!root)return Object.freeze({minBlockPx:0,preferredBlockPx:0,constraints:Object.freeze([])});
  const constraints=collectUnitGeometryConstraints(root,'block');let min=0,preferred=0,explicitPreferred=0;
  // PRIME is the only outer-content inset owner. The descendant target offset
  // already includes the block-start inset; add only the block-end inset here.
  const unitEndInset=effectivePrimeEndInset(root);
  for(const row of constraints){const overhead=row.target===root?0:offsetFromRoot(root,row.target)+unitEndInset;min=Math.max(min,row.minBlockPx+overhead);preferred=Math.max(preferred,row.preferredBlockPx+overhead);if(row.hasPreferredBlockPx)explicitPreferred=Math.max(explicitPreferred,row.preferredBlockPx+overhead);}
  return Object.freeze({minBlockPx:Math.ceil(min),preferredBlockPx:Math.ceil(Math.max(min,preferred)),explicitPreferredBlockPx:Math.ceil(explicitPreferred),constraints:Object.freeze(constraints)});
}

module.exports=Object.freeze({
  UNIT_GEOMETRY_OWNERSHIP_POLICY,
  GEOMETRY_CONSTRAINT_EVENTS:EVENTS,
  publishUnitGeometryConstraint,
  removeUnitGeometryConstraint,
  readNodeGeometryConstraints,
  collectUnitGeometryConstraints,
  notifyUnitGeometryConstraint,
  resolveInlineConstraintDeficit,
  resolveInlineSurfaceConstraint,
  resolveBlockSurfaceConstraint,
  measureInlineSize,
  intentionalHorizontalScroll,
  reflowUnitGeometry
});
