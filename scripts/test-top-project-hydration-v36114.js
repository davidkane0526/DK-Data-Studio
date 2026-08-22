'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

assert(json('package.json').version==='3.61.22','Application version must be 3.61.18.');

const runtime=read('src/plugin-window/runtime.js');
const prime=runtime.indexOf("measureSync('artifact-store-prime'");
const create=runtime.indexOf("measure('window-runtime-create'");
const activate=runtime.indexOf("measure('plugins-activate'");
assert(prime>=0&&create>=0&&activate>=0&&prime<create&&prime<activate,'Artifact Store must be primed before dedicated window runtime creation and plugin activation.');
assert(runtime.includes("if (bootstrap?.prewarm === true)")&&runtime.includes("restoreStore({schema:2,artifacts:[]})"),'Runtime-only prewarm must expose an empty Artifact Store instead of hydrating project data.');
assert(runtime.includes('artifactStorePrimedForBootstrap')&&runtime.includes("reason==='initial' && artifactStorePrimedForBootstrap"),'Cold-open project hydration must reuse the already-primed real Store instead of replacing it after plugin activation.');
assert(runtime.includes('DKDSPluginWindowDiagnostics')&&runtime.includes('renderedArtifactRows'),'Dedicated renderer diagnostics must report hydrated Artifact and rendered-row counts without exporting scientific values.');

const main=read('main.js');
assert(main.includes('const project=payload?.project')&&main.includes('payload?.artifactSnapshot'),'Electron diagnostic TOP smoke must accept the actual owner project and Artifact snapshot.');
assert(main.includes('const useConfiguredPrewarm=spec.prewarm===true'),'Diagnostic TOP smoke must follow each plugin\'s real prewarm policy instead of prewarming every plugin unconditionally.');
assert(main.includes('diagnosticRendererProjectSnapshot')&&main.includes('rendererData'),'Electron diagnostic TOP smoke must inspect the renderer\'s actual hydrated state.');

const app=read('src/app.js');
assert(app.includes('function currentProjectWindowSmokePayload()')&&app.includes('artifactSnapshot=snapshotArtifactRows()'),'Main renderer must expose the current project to the isolated automation smoke path.');

const automation=read('src/core/automation-test-runtime.js');
assert(automation.includes("'project.data-center-live','Current project → Data Center live hydration'"),'Automation Center must exercise the currently open project through a real Data Center TOP window.');
for(const token of ['projectDatasetCount','artifactCount','dataTableCount','totalTableRows','renderedArtifactRows'])assert(automation.includes(token),`Current-project Data Center smoke missing assertion: ${token}`);
assert(automation.includes("setColumnVisible('Name',false")&&automation.includes("visibleTableText().includes('Name\\tValue\\tNote')"),'TableSurface runtime smoke must address the columns that actually exist in its synthetic table.');
assert(automation.includes('chartRuntime.version===window.DKDSCharts?.VERSION')&&automation.includes('chart.version===window.DKDSCharts?.VERSION'),'Automation must validate the installed Chart Runtime version rather than stale 1.4.0 constants.');

console.log('v3.61.14 TOP project hydration + real Data Center diagnostics checks passed.');
