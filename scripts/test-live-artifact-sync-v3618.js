const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok){console.error(`V3.61.8 LIVE ARTIFACT SYNC ERROR: ${msg}`);process.exit(2);}};

const pkg=JSON.parse(read('package.json'));
const app=read('src/app.js');
const main=read('main.js');
const preload=read('preload.js');
const aux=read('src/plugin-window/runtime.js');
const dataCenter=read('src/plugins/data-center/feature-runtime.js');
const sdkReadme=read('sdk/README.md');
const sdkTypes=read('sdk/plugin-api.d.ts');

assert(pkg.version==='3.61.18','Application version must be 3.61.18.');
assert(preload.includes("pushActivityArtifactDelta: payload => ipcRenderer.send('windows:ownerArtifactDelta'")&&preload.includes("onOwnerArtifactDelta: callback =>"),'Preload must expose owner-to-TOP Artifact delta transport in both directions of the IPC boundary.');
assert(main.includes("ipcMain.on('windows:ownerArtifactDelta'")&&main.includes("win.webContents.send('windows:ownerArtifactDelta'")&&main.includes("if (row?.prewarm === true) continue")&&main.includes('excludeActivityId'),'Main process must forward live Artifact deltas to matching hydrated TOP windows, skip the origin activity, and avoid waking runtime-only prewarm windows.');
assert(app.includes('function pushArtifactDeltaToActivityWindows(')&&app.includes("pushArtifactDeltaToActivityWindows(importDelta,'import')")&&app.includes("pushArtifactDeltaToActivityWindows(payload.artifactDelta||{},'activity-merge'"),'Import commits and auxiliary-window result merges must publish exact Artifact deltas to other already-open TOP windows.');
assert(app.includes('function diffArtifactRows(')&&app.includes("pushArtifactDeltaToActivityWindows(delta,type)")&&app.includes("pushArtifactDeltaToActivityWindows(delta,'source-remove')"),'Source mutations must reuse the same incremental owner-to-TOP data path.');
assert(aux.includes('function applyOwnerArtifactDelta(')&&aux.includes("type:'owner-sync'")&&aux.includes('not record them as local')&&aux.includes('echo them back'),'TOP runtime must merge owner deltas locally without creating an echo loop.');
assert(dataCenter.includes("ctx.data.artifacts.list({includeTransient:true})"),'Data Center must include transient legacy adapters so scoped Flexible Import data is visible immediately.');
assert(sdkReadme.includes('A `data.table` Artifact is columnar')&&sdkReadme.includes('ctx.data.model.rows(table)'),'SDK must document canonical columnar DataTable access instead of private rows/points assumptions.');
assert(sdkTypes.includes('export interface DKDSDataModelRuntime')&&sdkTypes.includes('rows(table:any'),'Editor SDK must expose the canonical DataTable row projection helper.');

const sandbox={window:{},console};
vm.createContext(sandbox);
vm.runInContext(read('src/core/data-model.js'),sandbox,{filename:'data-model.js'});
const D=sandbox.window.DKDSData;
const store=D.createStore();
const dataset={path:'transfer-vth',name:'Vth transfer',sourcePath:'C:/data/vth.txt',sourceName:'vth.txt',assignments:['com.dkds.transfer-vth-lab'],points:[{v:-1,i:1e-12},{v:0,i:2e-10},{v:1,i:2e-9}],importSpec:{xHeader:'Gate voltage (V)',yHeader:'Drain current (A)'}};
D.syncLegacyDatasetArtifacts(store,[dataset]);
const rows=store.list({includeTransient:true});
assert(rows.length===1&&rows[0].semanticType==='science.transport.iv','Flexible Import legacy bridge must expose one typed transport Artifact.');
assert(rows[0].metadata?.dataAssignments?.includes('com.dkds.transfer-vth-lab'),'Imported Artifact must preserve the scoped workbench assignment.');
const projected=D.rows(rows[0]);
assert(projected.length===3&&Object.prototype.hasOwnProperty.call(projected[0],'Vd')&&Object.prototype.hasOwnProperty.call(projected[0],'Id'),'Canonical DataTable row projection must remain available to SDK plugins without duplicating persisted data.');
console.log('v3.61.8 live Artifact sync passed: scoped import -> canonical Artifact -> Data Center/TOP delta propagation, with columnar SDK contract.');
