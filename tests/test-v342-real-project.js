const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const input=process.argv[2]||process.env.DKDS_REAL_PROJECT||'';
if(!input){console.error('Usage: node tests/test-v342-real-project.js <historical-project.json>');process.exit(2);}
if(!fs.existsSync(input)){console.error(`v3.62 historical real-project regression input not found: ${input}`);process.exit(2);}
const project=JSON.parse(fs.readFileSync(input,'utf8'));
assert(Array.isArray(project.datasets),'Historical fixture must contain a dataset array before conversion.');
const ProjectFormat=require('../src/core/project/format.js');
require('../src/project-importers/compatibility-gateway.js').register(ProjectFormat);
const serializedProject=ProjectFormat.serializeProject(project);
const reopenedProject=ProjectFormat.parseProjectText(serializedProject);
assert.strictEqual(reopenedProject.schemaVersion,3,'Historical project must reopen as canonical Schema v3.');
assert(!Object.prototype.hasOwnProperty.call(reopenedProject,'datasets'),'Schema v3 must not persist a dataset side channel.');
const resonanceWorkspace=reopenedProject.plugins?.['builtin.resonance-workbench']?.workspace||{};
assert.strictEqual((resonanceWorkspace.peaks||[]).length,(project.peaks||[]).length,'Historical saved peaks must survive one-way gateway conversion.');

const A=require('../src/science/index.js');
const context={console,structuredClone,setTimeout,clearTimeout,crypto:global.crypto,document:{querySelector:()=>null,querySelectorAll:()=>[]}};context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['src/core/data/model.js','src/core/data/entity-runtime.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const D=context.DKDSData,E=context.DKDSEntities;
const direct=project.datasets;
const directSweeps=direct.flatMap(ds=>A.buildSweeps(ds));
assert.strictEqual(direct.length,21,'real project dataset count changed');assert.strictEqual(directSweeps.length,42,'real project sweep split changed');
assert.strictEqual(directSweeps.filter(s=>s.direction>0).length,21);assert.strictEqual(directSweeps.filter(s=>s.direction<0).length,21);assert.strictEqual((project.peaks||[]).length,93,'real project saved-peak count changed');

const artifacts=(reopenedProject.dataModel?.artifacts||[]).filter(a=>a?.kind==='data.table'&&a?.metadata?.importedSource===true);
assert.strictEqual(artifacts.length,direct.length,'Gateway must materialize one canonical source table per historical dataset series.');
const restored=D.transportDatasetsFromArtifacts(artifacts,{consumer:'builtin.resonance-workbench'});
assert.strictEqual(restored.length,direct.length,'Canonical transport projection must preserve every adopted historical dataset.');
const byPath=new Map(restored.map(d=>[d.path,d]));
for(const ds of direct){const rt=byPath.get(ds.path);assert(rt,`missing canonical projection ${ds.path}`);assert.strictEqual(rt.vg,ds.vg);assert.strictEqual(rt.points.length,ds.points.length);for(let i=0;i<ds.points.length;i++){assert.strictEqual(rt.points[i].v,ds.points[i].v);assert.strictEqual(rt.points[i].i,ds.points[i].i);}}
const rtSweeps=restored.flatMap(ds=>A.buildSweeps(ds));assert.strictEqual(rtSweeps.length,directSweeps.length);const rtSweepMap=new Map(rtSweeps.map(s=>[s.id,s]));
const close=(a,b,eps=1e-12)=>Number.isNaN(a)&&Number.isNaN(b)||Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=eps*Math.max(1,Math.abs(a),Math.abs(b));
for(const sw of directSweeps){const rt=rtSweepMap.get(sw.id);assert(rt,`missing sweep ${sw.id}`);assert.strictEqual(rt.direction,sw.direction);assert.strictEqual(rt.points.length,sw.points.length);for(let i=0;i<sw.points.length;i++){assert(close(rt.points[i].v,sw.points[i].v));assert(close(rt.points[i].i,sw.points[i].i));}}
for(const type of ['raw','detrend','didv','dlog','dvdi','resistance'])for(const sw of directSweeps){const a=A.transformSweep(sw,type).points,b=A.transformSweep(rtSweepMap.get(sw.id),type).points;assert.strictEqual(a.length,b.length,`${type} length`);for(let i=0;i<a.length;i++){assert(close(a[i].v,b[i].v),`${type} v ${i}`);assert(close(a[i].y,b[i].y,1e-10),`${type} y ${sw.id} ${i}`);}}
const params=A.detectTerVoltageParameters(direct);const terA=A.computeTerMatrix(direct,{...params,currentFloor:1e-15}),terB=A.computeTerMatrix(restored,{...params,currentFloor:1e-15});assert.strictEqual(terA.vgs.length,21);assert.strictEqual(terA.targets.length,200);assert.strictEqual(terA.records.length,4200);assert.strictEqual(terB.records.length,terA.records.length);for(let i=0;i<terA.records.length;i++)for(const key of ['vg','vds','iUp','iDown','rUp','rDown','ter'])assert(close(terA.records[i][key],terB.records[i][key],1e-10),`TER ${key} row ${i}`);

const r=new E.EntityRegistry();r.transact(()=>{for(const ds of restored)r.upsert({id:`resonance.dataset:${ds.path}`,type:'resonance.dataset',value:{path:ds.path,vg:ds.vg}});for(const sw of rtSweeps)r.upsert({id:sw.id,type:'resonance.sweep',parents:[`resonance.dataset:${sw.datasetPath}`],value:{direction:sw.direction,vg:sw.vg}});for(const peak of (resonanceWorkspace.peaks||[]))r.upsert({id:peak.id,type:'resonance.peak',parents:[peak.sweepId],locked:!!peak.locked,value:{v:peak.v,vg:peak.vg,direction:peak.direction}});});
assert.strictEqual(r.list().length,156,'real project entity graph must contain 21 datasets + 42 sweeps + 93 peaks');const peak=resonanceWorkspace.peaks[0];assert.strictEqual(r.closestInSet(peak.id,new Set(restored.map(ds=>`resonance.dataset:${ds.path}`))),`resonance.dataset:${peak.datasetPath}`,'peak focus must project to its dataset view');

const firstDs=restored[0],raw=artifacts.find(a=>String(a?.metadata?.seriesPath||a.id)===String(firstDs.path));assert(raw,'First canonical source Artifact must be locatable by seriesPath.');
const firstSweep=rtSweeps.find(s=>s.datasetPath===firstDs.path),sweepArtifact=D.createSweep({id:firstSweep.id,name:`${firstDs.name} ${firstSweep.scanLabel}`,x:firstSweep.points.map(p=>p.v),y:firstSweep.points.map(p=>p.i),direction:firstSweep.direction,scanAxis:'Vd',lineage:{parents:[raw.id],role:'sweep',producer:'real-project-regression'}}),peakArtifact=D.createPeakSet({id:`real.peaks:${firstSweep.id}`,name:'Saved peaks',peaks:resonanceWorkspace.peaks.filter(p=>p.sweepId===firstSweep.id),lineage:{parents:[firstSweep.id],role:'analysis',producer:'real-project-regression'}});
const lstore=D.createStore();let eventCount=0;lstore.onChange(()=>eventCount++);lstore.batch(()=>{lstore.publish(raw);lstore.publish(sweepArtifact);lstore.publish(peakArtifact);});assert.strictEqual(eventCount,1,'artifact batch should emit once');const lineage=lstore.lineage(peakArtifact.id);assert(lineage.ancestors.some(a=>a.id===firstSweep.id)&&lineage.ancestors.some(a=>a.id===raw.id),'peak lineage must reach sweep and canonical source table');assert.strictEqual(lstore.publish(peakArtifact).changed,false,'identical analysis publication must dedupe');
console.log('v3.62 historical real-project regression passed:',{datasets:restored.length,sweeps:rtSweeps.length,forward:21,reverse:21,peaks:resonanceWorkspace.peaks.length,entities:r.list().length,terCells:terA.records.length,transforms:6,schema:reopenedProject.schemaVersion});
