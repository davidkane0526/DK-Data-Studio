'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

class StyleDecl{
  constructor(){this.map=new Map();}
  setProperty(k,v){this.map.set(String(k),String(v));}
  removeProperty(k){this.map.delete(String(k));}
  getPropertyValue(k){return this.map.get(String(k))||'';}
}
const gate={
  set(el,k,v){el.style.setProperty(k,v);return v;},
  setToken(el,k,v){el.style.setProperty(k,v);return v;},
  remove(el,k){el.style.removeProperty(k);},
  snapshot(){return{};}
};
global.DKDSStyleGate=gate;
global.window={DKDSStyleGate:gate,addEventListener(){},removeEventListener(){}};
global.document={querySelector(){return null;},documentElement:{classList:{contains(){return false;}},dataset:{}}};

const spec=require('../src/core/ui/modules/composition/unit-template-spec');
const {ScientificUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-scientific');
assert.strictEqual(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG).length,41,'detail geometry must not add a 42nd Unit');

const tracked=[];
const scope={track(fn){tracked.push(fn);},plotViews:{},interactionBehaviors:{},options:{contributions:{}},layout:{},actions:{},panels:{},menus:{}};
const runtime=new ScientificUnitRuntime(scope,{plotGroups:{}});

// Parameter-purpose PRIME outer inset is now a uniform Core-owned metric.
// Plugins may still tune contentInsetPx for non-parameter PRIME surfaces, but
// parameter lists cannot create a second spacing owner.
const parameterNode={nodeType:1,dataset:{},style:new StyleDecl()};
const parameterPrime=runtime.buildPrimeSpec({
  id:'parameters',label:'参数',variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',
  existingNode:parameterNode,placements:['left'],defaultPlacement:'left',fixed:true
});
assert.strictEqual(spec.BASE_METRICS.surface.parameterPrimeInsetPx,6);
assert.strictEqual(parameterNode.style.getPropertyValue('padding'),'6px');
assert.strictEqual(parameterNode.dataset.dkdsUnitPrimeDetailGeometry,'plugin-detail');
assert.strictEqual(parameterNode.dataset.dkdsUnitPrimeContentInsetPx,'6');
assert.strictEqual(parameterPrime.header,false);assert.strictEqual(parameterPrime.chrome,false);assert.strictEqual(parameterPrime.placementControl,'host');
assert(!Object.prototype.hasOwnProperty.call(parameterPrime,'detailGeometry'),'Unit-only geometry metadata must not leak into Workbench runtime spec');
assert.throws(()=>runtime.buildPrimeSpec({id:'bad-parameter',presentationRole:'data-control',presentationPurpose:'parameters',existingNode:{nodeType:1,dataset:{},style:new StyleDecl()},detailGeometry:{contentInsetPx:12}}),/UNIT_PARAMETER_PRIME_CONTENT_INSET_FORBIDDEN/);
assert.throws(()=>runtime.buildPrimeSpec({id:'bad',presentationRole:'data-control',contentInset:'comfortable'}),/UNIT_PRIME_RAW_CONTENT_INSET_FORBIDDEN/);
assert.throws(()=>runtime.buildPrimeSpec({id:'bad',presentationRole:'data-control',detailGeometry:{contentInsetPx:-1}}),/UNIT_DETAIL_GEOMETRY_INVALID/);

const customNode={nodeType:1,dataset:{},style:new StyleDecl()};
runtime.buildPrimeSpec({id:'inspector-like',presentationRole:'data-control',existingNode:customNode,detailGeometry:{contentInsetPx:12},placements:['left'],defaultPlacement:'left',fixed:true});
assert.strictEqual(customNode.style.getPropertyValue('padding'),'12px','Non-parameter PRIME detail inset remains an accepted bounded tunable.');

// PlotView accepted detail geometry is declared at the Unit boundary and mapped
// into the already-existing generic PlotView execution fields. Raw Core fields are
// rejected when authoring through Unit Templates.
const strict=runtime.strictPlotSpec('heatmap',{
  title:'Heatmap',csv:()=>'',images:true,placements:['home','left'],
  detailGeometry:{contentAspectRatio:1,contentMinHeightPx:80,contentMaxHeightPx:860}
});
assert.strictEqual(strict.contentAspectRatio,1);
assert.strictEqual(strict.contentMinHeight,80);
assert.strictEqual(strict.contentMaxHeight,860);
assert(!Object.prototype.hasOwnProperty.call(strict,'detailGeometry'));
assert.throws(()=>runtime.strictPlotSpec('bad',{title:'Bad',csv:()=>'',images:true,placements:['home','left'],contentAspectRatio:1}),/UNIT_PLOTVIEW_RAW_CONTENT_GEOMETRY_FORBIDDEN/);
assert.throws(()=>runtime.strictPlotSpec('bad',{title:'Bad',csv:()=>'',images:true,placements:['home','left'],detailGeometry:{contentAspectRatio:1,contentMinHeightPx:900,contentMaxHeightPx:200}}),/UNIT_PLOTVIEW_DETAIL_GEOMETRY_RANGE_INVALID/);

const ter=read('src/plugins/ter-analysis/unit-presentation.js');
assert(ter.includes("variant:'fixed-titleless'")&&ter.includes("presentationPurpose:'parameters'")&&!ter.includes('detailGeometry:{contentInsetPx:12}'),'TER parameters must consume the uniform Core parameter PRIME inset, not a plugin-specific outer inset.');
assert(ter.includes('detailGeometry:{contentAspectRatio:1,contentMinHeightPx:80,contentMaxHeightPx:860}'),'TER heatmaps must consume Unit PlotView detail geometry.');
assert(!ter.includes("contentInset:'comfortable'"),'TER must not bypass Unit PRIME geometry via raw Workbench contentInset.');

const unitSource=read('src/core/ui/modules/composition/unit-template-scientific.js');
const workbenchSource=read('src/core/ui/modules/workbench/analysis.js');
const plotViewSource=read('src/core/ui/modules/plot-view/chart.js');
assert(unitSource.includes('UNIT_PRIME_RAW_CONTENT_INSET_FORBIDDEN')&&unitSource.includes('UNIT_PLOTVIEW_RAW_CONTENT_GEOMETRY_FORBIDDEN'));
assert(!workbenchSource.includes('detailGeometry'),'Plugin accepted detailGeometry must terminate at Unit Templates, not bloat AnalysisWorkbench.');
assert(!plotViewSource.includes('detailGeometry'),'Plugin accepted detailGeometry must terminate at Unit Templates, not bloat PlotView Core service.');

const dts=read('sdk/plugin-api.d.ts');
for(const token of ['DKDSUnitPrimeDetailGeometry','contentInsetPx?:number','DKDSUnitPlotViewDetailGeometry','contentMinHeightPx?:number','contentMaxHeightPx?:number',"Omit<DKDSPlotViewSpec,'contentAspectRatio'|'contentMinHeight'|'contentMaxHeight'>"])
  assert(dts.includes(token),`SDK type contract missing ${token}`);

for(const cleanup of tracked.reverse())cleanup();
assert.strictEqual(parameterNode.style.getPropertyValue('padding'),'','Unit lifecycle must release the canonical parameter inset on scope disposal.');
assert.strictEqual(customNode.style.getPropertyValue('padding'),'','Unit lifecycle must release non-parameter detail geometry on scope disposal.');
console.log('v3.71.14 Unit detail-geometry ownership PASS: parameter PRIME inset is uniform Core geometry; non-parameter detail inset and PlotView size remain bounded Unit contracts.');
