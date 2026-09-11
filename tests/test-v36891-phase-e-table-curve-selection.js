'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const interactionSource=read('src/core/ui/modules/selection/data-interaction.js');
const tableSource=read('src/core/ui/modules/table/surfaces.js');
const plotSource=read('src/core/scientific/plot-runtime.js');
const curveModel=read('src/core/ui/modules/scientific-curve/model.js');
const curveRender=read('src/core/ui/modules/scientific-curve/render.js');
const dataCenter=read('src/plugins/data-center/feature-runtime.js');
const sdk=read('sdk/plugin-api.d.ts');
const refs=require('../src/core/ui/modules/selection/data-interaction').selectionReferences;

assert.strictEqual(refs.version,'1.1.0','Phase E 6.1 must version the row-projection reference helpers.');
const broad=refs.row('artifact-A','row:7'),exactA=refs.row('artifact-A','row:7',{seriesId:'series-A'}),exactB=refs.row('artifact-A','row:7',{seriesId:'series-B'}),other=refs.row('artifact-A','row:8',{seriesId:'series-A'});
assert.strictEqual(refs.sourceRowKey(broad),refs.sourceRowKey(exactA),'source-row projection must ignore series identity for table-row projection.');
assert(refs.sameSourceRow(exactA,exactB),'different series from the same artifact row must map to one table row.');
assert(!refs.sameSourceRow(exactA,other),'different source rows must not alias.');
assert.notStrictEqual(refs.identity(exactA),refs.identity(exactB),'permanent point identity must still include seriesId.');

for(const token of ["selectionReferences.sourceRowKey","interaction.bindView(`table:","interaction.selectRef(ref", "entityLinked:false"])assert(tableSource.includes(token),`TableSurface reference-selection adapter missing: ${token}`);
assert(tableSource.includes("row?.rowId??row.id")&&tableSource.includes('dkdsSourceRowIndex'),'managed table rows must preserve stable source row identity across sorting/re-rendering.');
for(const token of ['this.pointReferences=[]','pointReference(trace,traceIndex,pointIndex','trace?.rowIds?.[pointIndex]','spec.pointReference','broadRows','exactRefs'])assert(plotSource.includes(token),`ScientificPlot row-reference mapping missing: ${token}`);
assert(curveModel.includes('pointReference(curve,point,index=-1)')&&curveModel.includes('selectPoint(curve,point,index=-1'), 'ScientificCurveSurface must expose generic source-row point selection.');
assert(curveModel.includes('selectedPointReferenceKeys()')&&curveRender.includes('selectionKeys=this.selectedPointReferenceKeys()'),'ScientificCurveSurface must compile selection references once per render instead of scanning all selection items for every point.');
assert(curveRender.includes("this.spec.selectionTarget==='point'"),'ScientificCurveSurface point targeting must remain explicit and opt-in.');
assert(dataCenter.includes('seriesId:D.seriesId(artifact,y.key)')&&dataCenter.includes('data-row-id=')&&dataCenter.includes("source:'data-center-table'"),'Data Center must adopt the Core table↔curve selection contract.');
assert(!dataCenter.includes("window.addEventListener('dkds:selection-changed'")&&!dataCenter.includes('new EventTarget('),'Data Center must not create a plugin-private cross-view event path.');
assert(interactionSource.includes("const INTERACTION_BRIDGE_EVENT='dkds:selection-changed'")&&!/dkds:(?:viewport|axis|interaction)-changed/.test(interactionSource),'the canonical cross-scope Interaction bridge must remain the single existing event name.');
assert(sdk.includes('sourceRowKey(ref:DKDSSelectionReference):string')&&sdk.includes('sameSourceRow(a:DKDSSelectionReference,b:DKDSSelectionReference):boolean'),'SDK must publish source-row projection helpers.');
assert(sdk.includes('DKDSTableSelectionSpec')&&sdk.includes("selectionTarget?:'series'|'point'"),'SDK must type the table and curve selection adapters.');

// Execute the real ScientificPlot mapping with a minimal renderer facade.
global.window=global;global.document={getElementById:()=>null,querySelector:()=>null};window.DKDSUI={selectionReferences:refs};
const handlers=new Map(),overlays=[];const entities=new Map();
window.DKDSEntities={createScope:()=>({upsert(row){entities.set(row.id,row);return row;},get(id){return entities.get(id)||null;},related(a,b){return a===b;}})};
window.DKDSCharts={createScope(){return this;},react(target,data,layout,config){target.data=data;target.layout=layout;target._context=config;return target;},bind(_target,name,fn){handlers.set(name,fn);return()=>handlers.delete(name);},selectionOverlay(_target,update,traces){overlays.push({update,traces});},adoptDisplayScale(){},tooltipTheme:{},themePaint(){},relayout(){},selectLegendForTrace(){},clearLegendSelection(){},displayScaleState(){return null;}};
require('../src/core/scientific/plot-runtime.js');
const target={nodeType:1,id:'phase-e-plot',dataset:{},data:[],layout:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},removeEventListener(){}};
let subscriber=null,selected=null;const interaction={subscribe(fn,{immediate}={}){subscriber=fn;if(immediate)fn(null,{reason:'subscribe'});return()=>{};},select(value,options){selected={value,options};return value;},get(){return null;}};
(async()=>{const scope=window.DKDSScientificPlot.createScope('phase-e-test');await scope.react(target,[{artifactId:'artifact-A',seriesId:'series-A',x:[0,1,2],y:[1,2,3],mode:'lines+markers',marker:{size:6,opacity:1}},{artifactId:'artifact-A',seriesId:'series-B',x:[0,1,2],y:[4,5,6],mode:'lines+markers',marker:{size:6,opacity:1}}],{}, {},{interaction,source:'phase-e-test'});
handlers.get('dkds_chart_click')({points:[{curveNumber:0,pointNumber:1}],event:{}});assert(selected,'point click must publish Selection');assert.deepStrictEqual(selected.value.ref,{artifactId:'artifact-A',seriesId:'series-A',rowId:'row:1'},'curve point click must publish exact artifact/series/row reference');
overlays.length=0;const rowRef=refs.row('artifact-A','row:1');subscriber({schema:2,revision:1,items:[{type:'data.point',id:refs.identity(rowRef),role:'row',ref:rowRef,meta:{}}],focus:{type:'data.point',id:refs.identity(rowRef),role:'row',ref:rowRef,meta:{}},ranges:[],context:{},source:'table'},{});assert.strictEqual(overlays.length,2,'a broad table row selection must project to both visible series');for(const row of overlays){const sizes=row.update['marker.size']?.[0];assert(sizes&&sizes[1]>sizes[0]&&sizes[1]>sizes[2],'the selected source row point must be emphasized without copying row payload data');}
overlays.length=0;const pointRef=refs.row('artifact-A','row:2',{seriesId:'series-A'});subscriber({schema:2,revision:2,items:[{type:'data.point',id:refs.identity(pointRef),role:'point',ref:pointRef,meta:{}}],focus:{type:'data.point',id:refs.identity(pointRef),role:'point',ref:pointRef,meta:{}},ranges:[],context:{},source:'plot'},{});const active=overlays.filter(row=>row.update['marker.size']);assert.strictEqual(active.length,1,'an exact series+row selection must not activate the same row in sibling series');assert.strictEqual(active[0].traces[0],0,'exact point selection must remain on the originating series');
console.log('Phase E 6.1 table↔curve reference selection checks passed.');})().catch(err=>{console.error(err);process.exit(1);});
