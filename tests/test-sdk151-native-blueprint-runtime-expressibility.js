'use strict';
const assert=require('assert');const path=require('path');const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
global.window={addEventListener(){},removeEventListener(){},DKDSPlotPresentation:null};global.document={querySelector:()=>null,documentElement:{classList:{contains:()=>false},dataset:{}}};global.DKDSStyleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};window.DKDSStyleGate=global.DKDSStyleGate;
const {UNIT_CATALOG,LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS}=require('../tools/sdk/native-blueprints');
const {UnitTemplateRuntime}=require('../src/core/ui/modules/composition/unit-templates');
const fake={interactionBehaviors:{compile:s=>s},track(){},options:{contributions:{}},plotViews:{},tables:{},scientificPlot:{},actions:{},panels:{},menus:{}};
const runtime=new UnitTemplateRuntime(fake,{plotGroups:{}});
const facade={
  workspace:['create'],page:['create'],pageHeader:['create'],surface:['create'],panel:['create'],section:['create'],layout:['create'],header:['create'],toolbar:['create'],action:['create'],actionRow:['create'],tabs:['create'],field:['create'],check:['create'],chip:['create'],note:['create'],message:['create'],summary:['create'],divider:['create'],emptyState:['create'],metric:['create'],list:['create'],componentTree:['mount'],parameterForm:['mount'],table:['mount'],prime:['build'],plotView:['create'],plotGroup:['create'],scientificPlot:['create'],legend:['create'],floatingChrome:['create'],splitHandle:['create'],splitPane:['create'],movableWindow:['create'],meter:['create'],dialog:['open'],menu:['create'],popover:['create'],status:['create'],portable:['create'],provider:['describe']
};
for(const [unit,methods] of Object.entries(facade))for(const method of methods)assert.strictEqual(typeof runtime[unit]?.[method],'function',`${unit}.${method} runtime facade missing`);
let visualRegions=0,layoutRegions=0;
for(const [plugin,blueprint] of Object.entries(NATIVE_PLUGIN_BLUEPRINTS))for(const region of blueprint.regions){
  visualRegions++;const catalog=UNIT_CATALOG[region.unit];assert(catalog,`${plugin}/${region.id}: catalog missing ${region.unit}`);assert(facade[region.unit],`${plugin}/${region.id}: Unit ${region.unit} has no public runtime facade`);
  if(region.variant&&catalog.variants?.length)assert(catalog.variants.includes(region.variant),`${plugin}/${region.id}: variant ${region.variant} not executable`);
  if(region.unit==='layout'){layoutRegions++;const special=String(region.variant||'').startsWith('accepted-')||region.variant==='grid';assert(special||LAYOUT_RECIPES[region.variant],`${plugin}/${region.id}: layout ${region.variant} has no executable Core recipe`);}
  if(region.unit==='plotView'){assert(['complete','prime-contained'].includes(region.variant),`${plugin}/${region.id}: native plot reconstruction must use complete or prime-contained PlotView`);if(region.variant==='prime-contained')assert(blueprint.regions.some(row=>row.unit==='prime'&&row.role==='scientific-secondary'),`${plugin}/${region.id}: prime-contained PlotView requires a scientific-secondary PRIME position owner in the blueprint`);}
  if(region.unit==='plotGroup'){assert(['standard','none'].includes(region.header||'standard'),`${plugin}/${region.id}: invalid PlotGroup header mode`);assert(['compact','regular','comfortable'].includes(region.density||region.variant)||region.variant==='accepted-scientific',`${plugin}/${region.id}: invalid PlotGroup density`);}
}
assert(layoutRegions>=20,`Blueprints are still under-specified: only ${layoutRegions} layout regions`);
assert(Object.keys(LAYOUT_RECIPES).length>=30,'Expected broad Core-owned layout recipe coverage.');
console.log(`SDK 1.51 native blueprint runtime expressibility PASS (${visualRegions} regions, ${layoutRegions} layout regions, ${Object.keys(LAYOUT_RECIPES).length} layout recipes)`);
