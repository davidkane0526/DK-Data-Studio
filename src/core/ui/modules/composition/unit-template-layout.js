'use strict';
const StyleGate=require('ui/style-ownership-gate');
const {FoundationUnitRuntime}=require('./unit-template-foundation');
const {parentFor,appendResolvedMany,addClasses,resolveElement,markUnitRole}=require('./unit-template-common');
const {LAYOUT_RECIPES}=require('./unit-template-spec');
const {ACCEPTED_LAYOUT_GEOMETRY_VALUES,ACCEPTED_LAYOUT_BREAKPOINTS}=require('./unit-template-geometry-values');
const {publishUnitGeometryConstraint}=require('./unit-geometry-constraints');

const OWNER='core.unit-template.layout';
const SOURCE='src/core/ui/modules/composition/unit-template-layout.js';
const set=(node,property,value)=>StyleGate.set(node,property,String(value),{owner:OWNER,scope:'runtime-unit-layout',source:SOURCE});
const remove=(node,property)=>StyleGate.remove(node,property,{owner:OWNER,scope:'runtime-unit-layout',source:SOURCE});
const px=value=>typeof value==='number'?`${value}px`:String(value);
const STYLE_KEYS=Object.freeze({
  display:'display',flexDirection:'flex-direction',flexWrap:'flex-wrap',flex:'flex',alignItems:'align-items',alignContent:'align-content',alignSelf:'align-self',justifyContent:'justify-content',justifySelf:'justify-self',placeItems:'place-items',
  gridTemplateColumns:'grid-template-columns',gridTemplateRows:'grid-template-rows',gridTemplateAreas:'grid-template-areas',gridAutoRows:'grid-auto-rows',gridAutoFlow:'grid-auto-flow',gridArea:'grid-area',gridColumn:'grid-column',gridRow:'grid-row',
  gap:'gap',rowGap:'row-gap',columnGap:'column-gap',overflow:'overflow',overflowX:'overflow-x',overflowY:'overflow-y',position:'position',inset:'inset',top:'top',right:'right',bottom:'bottom',left:'left',
  minWidth:'min-width',minHeight:'min-height',width:'width',height:'height',maxWidth:'max-width',maxHeight:'max-height',boxSizing:'box-sizing',aspectRatio:'aspect-ratio',whiteSpace:'white-space',textOverflow:'text-overflow',resize:'resize',
  padding:'padding',paddingTop:'padding-top',paddingRight:'padding-right',paddingBottom:'padding-bottom',paddingLeft:'padding-left',margin:'margin',marginTop:'margin-top',marginRight:'margin-right',marginBottom:'margin-bottom',marginLeft:'margin-left'
});
const ALL_PROPERTIES=Object.freeze([...new Set(Object.values(STYLE_KEYS))]);
const SHORTHAND_FAMILIES=Object.freeze({
  padding:Object.freeze(['padding-top','padding-right','padding-bottom','padding-left']),
  margin:Object.freeze(['margin-top','margin-right','margin-bottom','margin-left']),
  inset:Object.freeze(['top','right','bottom','left']),
  overflow:Object.freeze(['overflow-x','overflow-y']),
  gap:Object.freeze(['row-gap','column-gap'])
});
function applyActiveStyle(node,active={}){
  const handled=new Set();
  for(const [shorthand,members] of Object.entries(SHORTHAND_FAMILIES)){
    if(active[shorthand]!==undefined){
      // CSSOM longhands override their shorthand. Clear any stale longhand first,
      // then write the shorthand once. Never remove the freshly-expanded sides.
      for(const property of members)remove(node,property);
      set(node,shorthand,active[shorthand]);
    }else{
      // Conversely, clear a stale shorthand before applying current longhands.
      remove(node,shorthand);
      for(const property of members){if(active[property]!==undefined)set(node,property,active[property]);else remove(node,property);}
    }
    handled.add(shorthand);for(const property of members)handled.add(property);
  }
  for(const property of ALL_PROPERTIES){
    if(handled.has(property))continue;
    if(active[property]!==undefined)set(node,property,active[property]);else remove(node,property);
  }
}

const ACCEPTED_BREAKPOINT_SET=new Set(ACCEPTED_LAYOUT_BREAKPOINTS.map(Number));
function acceptedGeometry(spec={},label='layout geometry'){
  const out={};
  for(const [key,value] of Object.entries(spec||{})){
    const property=STYLE_KEYS[key]||key;
    if(!ALL_PROPERTIES.includes(property))throw new Error(`UNIT_LAYOUT_GEOMETRY_PROPERTY_FORBIDDEN: ${label}:${key}`);
    const accepted=ACCEPTED_LAYOUT_GEOMETRY_VALUES[property]||[];
    const text=String(value);
    if(!accepted.includes(text))throw new Error(`UNIT_LAYOUT_GEOMETRY_VALUE_FORBIDDEN: ${label}:${property}:${text}`);
    out[property]=text;
  }
  return out;
}
function acceptedResponsiveGeometry(rows=[]){
  if(!Array.isArray(rows))throw new Error('UNIT_LAYOUT_RESPONSIVE_GEOMETRY_INVALID');
  return rows.map((row,index)=>{
    const maxWidth=row?.maxWidth===undefined?undefined:Number(row.maxWidth),minWidth=row?.minWidth===undefined?undefined:Number(row.minWidth);
    if(maxWidth===undefined&&minWidth===undefined)throw new Error(`UNIT_LAYOUT_RESPONSIVE_BREAKPOINT_REQUIRED: ${index}`);
    if(maxWidth!==undefined&&!ACCEPTED_BREAKPOINT_SET.has(maxWidth))throw new Error(`UNIT_LAYOUT_BREAKPOINT_FORBIDDEN: max:${maxWidth}`);
    if(minWidth!==undefined&&!ACCEPTED_BREAKPOINT_SET.has(minWidth))throw new Error(`UNIT_LAYOUT_BREAKPOINT_FORBIDDEN: min:${minWidth}`);
    return Object.freeze({maxWidth,minWidth,geometry:acceptedGeometry(row?.geometry||{},`responsive[${index}]`)});
  });
}
function activeResponsiveGeometry(rows,width){
  if(!(Number(width)>0))return [];
  const max=rows.filter(row=>row.maxWidth!==undefined&&width<=row.maxWidth).sort((a,b)=>b.maxWidth-a.maxWidth);
  const min=rows.filter(row=>row.minWidth!==undefined&&width>=row.minWidth).sort((a,b)=>a.minWidth-b.minWidth);
  return [...max,...min];
}

function normalizedStyle(recipe={}){
  const out={};
  for(const [key,property] of Object.entries(STYLE_KEYS))if(recipe[key]!==undefined)out[property]=String(recipe[key]);
  for(const [key,property] of [['gapPx','gap'],['rowGapPx','row-gap'],['columnGapPx','column-gap'],['topPx','top'],['rightPx','right'],['bottomPx','bottom'],['leftPx','left'],['paddingPx','padding'],['paddingTopPx','padding-top'],['paddingRightPx','padding-right'],['paddingBottomPx','padding-bottom'],['paddingLeftPx','padding-left'],['marginPx','margin'],['marginTopPx','margin-top'],['marginRightPx','margin-right'],['marginBottomPx','margin-bottom'],['marginLeftPx','margin-left']])if(recipe[key]!==undefined)out[property]=px(recipe[key]);
  for(const [key,property] of [['minWidthPx','min-width'],['minHeightPx','min-height'],['widthPx','width'],['heightPx','height'],['maxWidthPx','max-width'],['maxHeightPx','max-height']])if(recipe[key]!==undefined)out[property]=px(recipe[key]);
  return out;
}
function responsiveRecipe(recipe,width){
  const patches=Array.isArray(recipe?.responsive)?recipe.responsive:[];
  if(!(Number(width)>0)){const base={...recipe};delete base.responsive;return base;}
  const max=patches.filter(row=>row.maxWidth!==undefined&&width<=Number(row.maxWidth)).sort((a,b)=>Number(b.maxWidth)-Number(a.maxWidth));
  const min=patches.filter(row=>row.minWidth!==undefined&&width>=Number(row.minWidth)).sort((a,b)=>Number(a.minWidth)-Number(b.minWidth));
  const active={...recipe};delete active.responsive;
  for(const patch of [...max,...min]){const next={...patch};delete next.maxWidth;delete next.minWidth;Object.assign(active,next);}
  return active;
}

function columnCount(value=''){
  const text=String(value||'').trim();if(!text||text==='none')return null;
  const repeat=text.match(/^repeat\((\d+),/);if(repeat)return Number(repeat[1]);
  // A single track may still contain nested functions/spaces.  Only the public
  // recipes need a conservative one-column detector: repeat(N,...) handles all
  // canonical multi-column responsive recipes, while the common fallback is
  // minmax(0,1fr) / 1fr.
  if(text==='1fr'||text==='minmax(0,1fr)')return 1;
  return null;
}
function isLastResortGeometry(row={}){
  const columns=row.gridTemplateColumns??row['grid-template-columns'];
  const direction=String(row.flexDirection??row['flex-direction']??'').trim().toLowerCase();
  return columnCount(columns)===1||direction==='column';
}
function lastResortMaxWidth(recipe={},responsiveGeometry=[]){
  let floor=0;
  for(const row of Array.isArray(recipe.responsive)?recipe.responsive:[]){
    if(row?.maxWidth===undefined||!isLastResortGeometry(row))continue;
    floor=Math.max(floor,Number(row.maxWidth)||0);
  }
  for(const row of Array.isArray(responsiveGeometry)?responsiveGeometry:[]){
    if(row?.maxWidth===undefined||!isLastResortGeometry(row.geometry||{}))continue;
    floor=Math.max(floor,Number(row.maxWidth)||0);
  }
  return floor;
}

class LayoutUnitRuntime extends FoundationUnitRuntime {
  constructor(scope){super(scope);this.layoutRecipes=LAYOUT_RECIPES;this.geometryValues=ACCEPTED_LAYOUT_GEOMETRY_VALUES;this.breakpoints=ACCEPTED_LAYOUT_BREAKPOINTS;}
  bindLayout(node,parent,spec={},variant='stack',recipe={}){
    const geometry=acceptedGeometry(spec.geometry||{},`${variant}.geometry`),responsiveGeometry=acceptedResponsiveGeometry(spec.responsiveGeometry||[]);
    const requestedResponsiveTarget=spec.responsiveTarget??null,responsiveTarget=requestedResponsiveTarget?(resolveElement(requestedResponsiveTarget)||requestedResponsiveTarget):null;if(responsiveTarget&&responsiveTarget.nodeType!==1)throw new Error('UNIT_LAYOUT_RESPONSIVE_TARGET_INVALID');
    markUnitRole(node,'layout','layout-v2',variant);node.dataset.dkdsUnitLayoutRecipe=variant;if(Object.keys(geometry).length)node.dataset.dkdsUnitLayoutGeometry='accepted';if(responsiveGeometry.length)node.dataset.dkdsUnitLayoutResponsiveGeometry='accepted';if(responsiveTarget)node.dataset.dkdsUnitLayoutResponsiveTarget='external';
    // Responsive detail is plugin-configurable, but the Unit remains the only
    // geometry writer.  Publish one intrinsic constraint for the Presenter: the
    // smallest *real* local width that avoids a last-resort single-column/column
    // state.  The Presenter may allocate more space, but it never fakes the width
    // observed by this Layout Unit.
    const densityFloor=lastResortMaxWidth(recipe,responsiveGeometry),preferredMin=densityFloor>0?densityFloor+1:0;
    if(preferredMin>0){node.dataset.dkdsUnitInlinePreferredMin=String(preferredMin);node.dataset.dkdsUnitInlineConstraint='avoid-last-resort';}
    else{delete node.dataset.dkdsUnitInlinePreferredMin;delete node.dataset.dkdsUnitInlineConstraint;}
    const measure=()=>responsiveTarget||node;
    const releaseInlineConstraint=preferredMin>0?publishUnitGeometryConstraint(node,'inline','layout-density',()=>Object.freeze({kind:'avoid-last-resort',minInlinePx:preferredMin,target:measure(),priority:'density',variant})):null;
    const apply=()=>{
      const target=measure(),width=Math.max(0,Number(target?.clientWidth)||Number(node.clientWidth)||Number(parent?.clientWidth)||0);
      const active={...normalizedStyle(responsiveRecipe(recipe,width)),...geometry};
      for(const patch of activeResponsiveGeometry(responsiveGeometry,width))Object.assign(active,patch.geometry);
      applyActiveStyle(node,active);node.dataset.dkdsUnitLayoutResponsive=String(width||0);
    };
    node.__dkdsUnitLayoutReflow=apply;
    apply();let ro=null;const hasResponsive=(Array.isArray(recipe.responsive)&&recipe.responsive.length)||responsiveGeometry.length;if(hasResponsive&&globalThis.ResizeObserver){ro=new ResizeObserver(apply);const observed=new Set([node,responsiveTarget,parent].filter(row=>row&&row.nodeType===1));for(const row of observed)ro.observe(row);}this.scope.track(()=>{try{ro?.disconnect?.();}catch{}releaseInlineConstraint?.();for(const property of ALL_PROPERTIES)remove(node,property);delete node.__dkdsUnitLayoutReflow;delete node.dataset.dkdsUnitInlinePreferredMin;delete node.dataset.dkdsUnitInlineConstraint;});return node;
  }
  createLayout(host,spec={}){
    const variant=String(spec.variant||'stack'),recipe=LAYOUT_RECIPES[variant];
    if(!recipe)return super.createLayout(host,spec);
    const parent=parentFor(host,'layout host'),node=document.createElement(spec.tagName||'div');addClasses(node,spec.className);if(spec.content)appendResolvedMany(node,spec.content);parent?.appendChild(node);return this.bindLayout(node,parent,spec,variant,recipe);
  }
  applyLayout(target,spec={}){
    const node=target?.nodeType===1?target:globalThis.document?.querySelector?.(String(target||''));if(!node)throw new Error('UnitTemplate layout.apply target not found.');const variant=String(spec.variant||'stack'),recipe=LAYOUT_RECIPES[variant];if(!recipe)throw new Error(`UNIT_TEMPLATE_UNKNOWN_VARIANT: layout:${variant}`);node.dataset.dkdsUnitLayoutDecorator='true';return this.bindLayout(node,node.parentElement||node.parentNode,spec,variant,recipe);
  }
}
module.exports=Object.freeze({LayoutUnitRuntime,LAYOUT_RECIPES,ACCEPTED_LAYOUT_GEOMETRY_VALUES,ACCEPTED_LAYOUT_BREAKPOINTS,lastResortMaxWidth,isLastResortGeometry});
