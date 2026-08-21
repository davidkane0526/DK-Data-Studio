const assert=require('assert');
const fs=require('fs');
const path=require('path');
const F=require('../src/core/project-format.js');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const legacyProject={
  version:'3.26.0',
  datasets:[{
    name:'embedded.csv',path:'C:/missing/original/embedded.csv',text:'V,I\n0,1e-9\n1,2e-9\n',vg:1,
    points:[{v:0,i:1e-9,index:0,sourceLine:2},{v:1,i:2e-9,index:1,sourceLine:3}]
  }],
  scanVisibility:[['C:/missing/original/embedded.csv',{forward:true,reverse:true}]],
  peaks:[{id:'p1',datasetPath:'C:/missing/original/embedded.csv',v:1,i:2e-9}],
  peakCategories:[{order:1,label:'峰1'}],
  gateAnalysisSettings:{seriesA:'峰1'},
  terMaxSettings:{vmin:-1,vmax:1},
  terHeatmapDisplay:{colorscale:'Viridis'},
  terMaxResult:{records:[{vg:1,vds:1,ter:100}]},
  pulseAnalysis:{files:[{name:'old.csv'}]},
  panelLayout:{groupPanelMode:'floating',inspectorPanelMode:'dock'},
  plugins:{'external.example':{workspace:{answer:42}}}
};
const canonical=F.parseProjectText(JSON.stringify(legacyProject));
assert.strictEqual(canonical.format,F.FORMAT);
assert.strictEqual(canonical.schemaVersion,2);
assert.deepStrictEqual(canonical.datasets[0].points,legacyProject.datasets[0].points,'embedded parsed points must survive migration');
assert.strictEqual(canonical.datasets[0].text,legacyProject.datasets[0].text,'embedded source text must survive migration');
assert.deepStrictEqual(canonical.plugins['external.example'],legacyProject.plugins['external.example'],'unrelated plugin state must survive migration');
assert.deepStrictEqual(canonical.plugins['builtin.resonance-workbench'].workspace.peaks,legacyProject.peaks,'legacy peaks must migrate to the resonance plugin slice');
assert.deepStrictEqual(canonical.plugins['builtin.resonance-workbench'].workspace.scanVisibility,legacyProject.scanVisibility,'legacy visibility must migrate to the resonance plugin slice');
assert.strictEqual(canonical.plugins['builtin.resonance-workbench'].workspace.gateAnalysisSettings.seriesA,legacyProject.gateAnalysisSettings.seriesA,'legacy gate state must migrate to the resonance plugin slice');
assert.strictEqual(canonical.plugins['builtin.resonance-workbench'].workspace.gateAnalysisSettings.terSettings.vmin,legacyProject.terMaxSettings.vmin,'legacy Resonance Gate TER settings must be absorbed into the resonance slice');
assert.deepStrictEqual(canonical.plugins['builtin.ter-analysis'].workspace.settings,legacyProject.terMaxSettings,'legacy TER settings must migrate to the TER plugin slice');
assert.deepStrictEqual(canonical.plugins['builtin.ter-analysis'].workspace.result,legacyProject.terMaxResult,'legacy TER result must migrate to the TER plugin slice');
assert.deepStrictEqual(canonical.plugins['builtin.pulse-analysis'].workspace,legacyProject.pulseAnalysis,'legacy pulse state must migrate to the pulse plugin slice');
assert.strictEqual(canonical.host.panelLayout.groupPanelMode,'floating','legacy generic panel layout must migrate into the generic host namespace');
for(const key of F.DOMAIN_ROOT_FIELDS)assert.strictEqual(Object.prototype.hasOwnProperty.call(canonical,key),false,`canonical project root must not contain ${key}`);

const text=F.serializeProject(canonical,2);
const parsed=JSON.parse(text);
assert.strictEqual(parsed.schemaVersion,2,'serialized project must use canonical schema v2');
for(const key of F.DOMAIN_ROOT_FIELDS)assert.strictEqual(Object.prototype.hasOwnProperty.call(parsed,key),false,`serialized project root must remain domain-neutral: ${key}`);

const utf8bom=Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from(text,'utf8')]);
assert.strictEqual(F.parseProjectBytes(utf8bom).project.datasets[0].points.length,2,'UTF-8 BOM project must open');
const utf16le=Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(text,'utf16le')]);
const decoded16=F.parseProjectBytes(utf16le);
assert.strictEqual(decoded16.encoding,'utf-16le');
assert.strictEqual(decoded16.project.datasets[0].name,'embedded.csv','UTF-16LE project must open');
assert.throws(()=>F.parseProjectText('{"datasets":{}}'),/datasets/,'damaged dataset schema must be rejected');

const app=read('src/app.js');
const web=read('src/web-bridge.js');
const main=read('main.js');
const makeStart=app.indexOf('function makeProject(){');
const makeEnd=app.indexOf('\n  let projectSaveChoicePromise',makeStart);
const makeProjectSource=app.slice(makeStart,makeEnd);
assert(app.includes('if(Array.isArray(source?.points)&&source.points.length)'),'project loader must prefer embedded parsed points when original data files do not exist');
assert(makeProjectSource.includes("format:'dk-data-studio-project'")&&makeProjectSource.includes('schemaVersion:2'),'project saver must emit the canonical generic project envelope');
assert(makeProjectSource.includes('name:d.name,path:d.path,text:d.text,vg:d.vg'),'project saver must keep embedded raw source text');
assert(makeProjectSource.includes('points:(d.points||[]).map'),'project saver must keep embedded parsed points');
for(const token of ['scanVisibility:','peaks:','peakCategories:','algorithms:','terMaxSettings:','terHeatmapDisplay:','terMaxResult:','gateAnalysisSettings:','transformPreviewByDataset:','pulseAnalysis:'])assert(!makeProjectSource.includes(token),`Core project saver must not persist domain-owned field ${token}`);
assert(makeProjectSource.includes('host:{')&&makeProjectSource.includes('panelLayout:{'),'generic host layout must persist under the host namespace, not as a legacy root field');
assert(web.includes('DKDSProjectFormat.serializeProject')&&web.includes('DKDSProjectFormat.parseProjectBytes'),'web open/save must use the same project-format layer');
assert(main.includes('DKDSProjectFormat.serializeProject')&&main.includes('DKDSProjectFormat.parseProjectBytes'),'desktop open/save must use the same project-format layer');
console.log('Project format v2 OK: generic root, plugin-owned domain slices, one-way legacy migration, shared desktop/web parser.');
