'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(v,m){if(!v)throw new Error(m);}

const pkg=json('package.json');
assert(pkg.version==='3.61.16','Application version must be 3.61.16.');

const runtime=read('src/plugin-window/runtime.js');
assert(runtime.includes('liveSnapshot!==null?{schema:2,artifacts:liveSnapshot}'),'An empty live snapshot must be distinguishable from no live snapshot.');
assert(runtime.includes('if (artifactStore && window.DKDSData?.syncLegacyDatasetArtifacts && Array.isArray(project.datasets))'),'Dedicated windows must always reconcile self-contained legacy datasets after restoring any live snapshot.');
assert(!runtime.includes('if (!liveSnapshot && artifactStore && window.DKDSData?.syncLegacyDatasetArtifacts'),'Legacy dataset hydration must not be skipped merely because a live snapshot array exists.');
assert(runtime.includes('const liveArtifactsChanged =')&&runtime.includes("type:'owner-live-replace'"),'Reused live-hydration windows must refresh on Artifact digest changes even when the serialized project is unchanged.');

const app=read('src/app.js');
assert(app.includes('pluginWindowSpec')&&app.includes('pluginWindowSpec?.artifactHydration'),'Window manifest hydration must be a generic fallback when an Activity contribution is not yet mounted.');
const dcManifest=json('src/plugins/data-center/plugin.json');
assert(dcManifest.window?.artifactHydration==='live','Data Center machine manifest must request live Artifact hydration.');

const context={window:{},console,Date,Math,JSON,Map,Set,WeakMap,structuredClone:global.structuredClone,crypto:global.crypto};
context.globalThis=context;context.window.window=context.window;vm.createContext(context);vm.runInContext(read('src/core/data-model.js'),context,{filename:'data-model.js'});
const D=context.window.DKDSData;
const legacyDatasets=[{name:'VG=0',path:'legacy://VG=0',sourcePath:'legacy://VG=0.csv',vg:0,points:[{v:0,i:1e-9,index:0},{v:1,i:2e-9,index:1}]}];
const emptyLive=D.restoreStore({schema:2,artifacts:[]});
D.syncLegacyDatasetArtifacts(emptyLive,legacyDatasets);
const rows=emptyLive.list({includeTransient:true});
assert(rows.length===1&&rows[0].kind==='data.table'&&rows[0].transient===true,'Empty live snapshot + legacy project datasets must still hydrate one transient DataTable.');
const persisted=D.createTable({id:'persisted',name:'persisted',columns:[{key:'x',values:[1]},{key:'y',values:[2]}]});
const mixed=D.restoreStore({schema:2,artifacts:[persisted]});D.syncLegacyDatasetArtifacts(mixed,legacyDatasets);
assert(mixed.list({includeTransient:true}).length===2,'Live canonical Artifacts and legacy transient adapters must merge rather than replace each other.');

const views=read('src/plugins/data-center/shared-views.js');
const feature=read('src/plugins/data-center/feature-runtime.js');
assert(views.includes('class="dc-section-copy"')&&views.includes('class="dc-preview-actions"'),'Data Center must distinguish copy blocks from action blocks structurally.');
assert(!feature.includes('.dc-section-head>div,.dc-tool-title>div'),'Generic direct-child styling must not force Data Center action groups into a column.');
assert(feature.includes('.dc-preview-actions{display:flex!important;flex-direction:row!important'),'Preview tabs and Edit must remain one horizontal action group.');

const schema=json('sdk/plugin-manifest.schema.json');
assert(schema.properties.window.properties.artifactHydration.enum.includes('live'),'SDK machine manifest must expose window.artifactHydration.');
const types=read('sdk/plugin-api.d.ts');
assert(types.includes("artifactHydration?:'project'|'live'"),'SDK TypeScript contract must expose window.artifactHydration.');

console.log('v3.61.12 Data Center live hydration + action-group layout checks passed.');
