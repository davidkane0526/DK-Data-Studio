'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(value,message){if(!value)throw new Error(message);}

const pkg=json('package.json');
const dc=json('src/plugins/data-center/plugin.json');
const sdk=json('sdk/contract.json');
assert(pkg.version==='3.61.21','Application version must be 3.61.21.');
assert(dc.version==='1.13.6','Data Center version must advance to 1.13.6.');
assert(sdk.pluginApiVersion==='1.15.0','Data navigation / legacy restoration / Core plot chrome must not bump the Plugin SDK.');

// The legacy project migrator must recover meaningful root state even when an
// intermediate build wrote empty namespaced placeholders.
const PF=require('../src/core/project-format.js');
global.DKDSScience={};
require('../src/science/common.js');
require('../src/science/import.js');
require('../src/science/peaks.js');
const S=global.DKDSScience;
const mkPoints=()=>[-1,-.5,0,.5,1,.5,0,-.5,-1].map((v,index)=>({v,i:(index+1)*1e-9,index,sourceLine:index+3}));
const idDataset={name:'Id adopted',path:'fixture.csv::series::0::x1y2',sourcePath:'fixture.csv',sourceName:'fixture.csv',vg:5,points:mkPoints(),importSpec:{layout:'single',resolvedLayout:'single',xCol:0,yCol:1,yCols:[1],xHeader:'vd(V)',yHeader:'id(0.0)',seriesLabel:'id(0.0)'}};
const igDataset={name:'Ig retained but not adopted',path:'fixture.csv::series::1::x1y3',sourcePath:'fixture.csv',sourceName:'fixture.csv',vg:5,points:mkPoints().map(p=>({...p,i:p.i*1e-3})),importSpec:{layout:'single',resolvedLayout:'single',xCol:0,yCol:2,yCols:[2],xHeader:'vd(V)',yHeader:'ig(0.0)',seriesLabel:'ig(0.0)'}};
const idSweeps=S.buildSweeps(idDataset);
assert(idSweeps.length===2,'Synthetic legacy Id fixture must produce two directional sweeps.');
const peaks=idSweeps.map((sw,index)=>({id:`peak-${index}`,sweepId:sw.id,datasetPath:idDataset.path,vg:5,direction:sw.direction,index:2,v:sw.points[2].v,i:sw.points[2].i,accepted:true,manual:false,locked:false,peakOrder:1,peakLabel:'峰1'}));
const migrated=PF.canonicalizeProject({
  version:'3.17-plugin',datasets:[idDataset,igDataset],
  scanVisibility:[[idDataset.path,{forward:true,reverse:true}]],peaks,trendColumns:4,
  plugins:{'builtin.resonance-workbench':{workspace:{scanVisibility:[],peaks:[]}}}
});
const ws=migrated.plugins['builtin.resonance-workbench'].workspace;
assert(ws.scanVisibility.length===1&&ws.scanVisibility[0][0]===idDataset.path,'Non-empty legacy scanVisibility must win over an empty namespaced placeholder.');
assert(ws.peaks.length===2,'Non-empty legacy peaks must survive empty namespaced placeholders.');
assert(ws.legacyVisibilityExplicit===true&&ws.legacyVisibilityDatasetPaths.includes(igDataset.path),'Legacy migration must remember every stored dataset so unadopted auxiliary channels remain hidden.');
const migratedIg=migrated.datasets.find(row=>row.path===igDataset.path);
assert(Array.isArray(migratedIg?.assignments)&&migratedIg.assignments.length===0,'Unadopted legacy Ig must migrate to generic Data Center-only assignments.');
assert(String(ws.groupColumns)==='4'&&String(migrated.host.trendColumns)==='4','Legacy trend-column layout must migrate into both resonance workspace and host layout.');

// Verify the exact group/trend model used by Resonance still resolves saved
// sweep ids after migration. This is the failure mode behind empty old-project
// group panels.
let shared=null;
global.window={DKDSScience:S,DKDSPluginModules:{define:(pluginId,name,api)=>{if(pluginId==='builtin.resonance-workbench'&&name==='workbench-shared')shared=api;}}};
require('../src/plugins/resonance-workbench/workbench-shared.js');
assert(shared?.createController,'Resonance shared controller failed to load.');
const sweeps=[...idSweeps,...S.buildSweeps(igDataset)];
const visibleIds=new Set(idSweeps.map(row=>row.id));
const sweepById=new Map(sweeps.map(row=>[row.id,row]));
const service={
  getState:()=>({workspace:ws,datasets:[idDataset,igDataset],sweeps,peaks:ws.peaks}),
  visibleSweepIds:()=>[...visibleIds],sweepById:id=>sweepById.get(id)||null,
  peakLabel:p=>p.peakLabel||'峰1',directionName:d=>d>0?'正扫':'反扫',
  metrics:p=>({vg:p.vg,v:p.v,i:p.i})
};
const model=shared.createController(service,{science:S}).buildTrendModel();
assert(model.series.length===2&&model.series.reduce((n,row)=>n+row.points.length,0)===2,'Migrated legacy peaks must populate Resonance group/trend series rather than empty axes.');

// Saved import mappings must remain authoritative. Re-reading the embedded
// multi-column source may never promote Ig when the legacy project selected Id.
const text='header\nvd(V),id(0.0),ig(0.0)\n0,1e-9,1e-12\n0.5,2e-9,2e-12\n1,3e-9,3e-12';
const opts={...S.defaultImportOptions(),layout:'single',xCol:0,yCol:1,yCols:[1]};
const parsed=S.parseFlexibleData({name:'fixture.csv',path:'fixture.csv',text,encoding:'utf-8'},opts);
assert(parsed.datasets.length===1&&parsed.datasets[0].importSpec.yHeader==='id(0.0)','Saved exact Id mapping must parse only Id, not auxiliary Ig.');

const app=read('src/app.js');
const projectFormat=read('src/core/project-format.js');
const resRuntime=read('src/plugins/resonance-workbench/feature-runtime.js');
const dcView=read('src/plugins/data-center/shared-views.js');
const dcRuntime=read('src/plugins/data-center/feature-runtime.js');
const index=read('src/index.html');
const css=read('src/style.css');
const automation=read('src/core/automation-test-runtime.js');
assert(app.includes('...savedSpec')&&app.includes('path:single&&source.path?source.path:dataset.path'),'Self-contained old projects must reparse embedded text with the saved importSpec and preserve the original dataset path.');
assert(projectFormat.includes('const adoptedPaths=new Set')&&projectFormat.includes('assignments:[]'),'Legacy auxiliary channels omitted from the explicit adopted-data list must be translated once into generic Data Center-only assignments by Project Format.');
assert(!app.includes('builtin.resonance-workbench'),'The host app must remain scientifically domain-neutral; legacy Resonance interpretation belongs only to Project Format migration.');
assert(projectFormat.includes('legacyVisibilityExplicit=true')&&resRuntime.includes('legacyVisibilityDatasetPaths')&&resRuntime.includes('forward:!hiddenLegacy'),'Resonance must preserve explicit legacy adoption/visibility semantics so stored Ig auxiliaries do not reappear.');
assert(dcView.includes('dcLineageFilter')&&dcView.includes('dcFieldFilter')&&!dcView.includes('dcTagChips'),'Data Center must use compact lineage/actual-field navigation rather than semantic tag pills.');
assert(dcRuntime.includes("a?.kind==='data.table'")&&dcRuntime.includes('c?.name||c?.key')&&dcRuntime.includes('artifactOrigin(a)'),'Data Center field filtering must use actual column/field labels and Core lineage.');
assert(index.includes('importColumnFieldSelect')&&!index.includes('importColumnTagChips'),'Import Workbench must expose a compact exact-column dropdown, not semantic tag chips.');
assert(app.includes('normalizeImportFieldName(column.header)===wanted')&&app.includes('applyImportColumnFieldFilter'),'Import signal filtering must match exact inspected column headers.');
assert(css.includes('opacity:0;pointer-events:none')&&css.includes('.dkds-scientific-surface-host:hover>.dkds-scientific-nav-tools')&&css.includes('@media (hover:none),(pointer:coarse)'),'Core D3 toolbar must auto-hide on desktop while remaining usable on touch devices.');
assert(automation.includes("const VERSION='1.23.0'")&&automation.includes("'project.resonance-groups'")&&automation.includes('buildTrendModel()'),'Windows automation must diagnose current-project Resonance group-data integrity.');
console.log('v3.61.21 legacy selection + lineage navigation + old-project group integrity + D3 auto-hide checks passed.');
