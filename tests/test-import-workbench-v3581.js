'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'src','generated','runtime','app.js'),'utf8');
const importWorkbench=fs.readFileSync(path.join(root,'src','app','modules','import-workbench.js'),'utf8');

assert(app.includes('function formatImportNumber(value,digits=6){'),
  'Import workbench must own a domain-neutral numeric formatter.');
assert(!app.includes('gateFmt('),
  'Import workbench must not depend on the removed Gate-analysis formatter.');
assert(app.includes('Number.isFinite(v)?`<td>${formatImportNumber(v,6)}</td>`'),
  'Import preview table must render through the import formatter.');

const stageStart=importWorkbench.indexOf('async function stageImportMetas(metas=[]){');
const stageEnd=importWorkbench.indexOf('async function addImportFiles(){',stageStart);
assert(stageStart>=0&&stageEnd>stageStart,'stageImportMetas source not found.');
const stage=importWorkbench.slice(stageStart,stageEnd);
const firstRender=stage.indexOf('renderImportWorkbench();');
const readLoop=stage.indexOf('for(const meta of metas){',stage.indexOf('if(!state.importDraft.activePath)'));
assert(firstRender>=0&&readLoop>firstRender,
  'Selected-file count must render before sequential file parsing starts, including auto-classified mobile/provider imports.');

const renderStart=importWorkbench.indexOf('function renderImportWorkbench(){');
const renderEnd=importWorkbench.indexOf('async function updateImportSetting',renderStart);
assert(renderStart>=0&&renderEnd>renderStart,'renderImportWorkbench source not found.');
const render=importWorkbench.slice(renderStart,renderEnd);
assert(render.indexOf('renderImportGlobalSummary();')<render.indexOf('renderImportEditor();'),
  'Selection summary must update before preview/editor rendering.');

const summaryStart=importWorkbench.indexOf('function renderImportGlobalSummary(){');
const summaryEnd=importWorkbench.indexOf('function renderImportWorkbench()',summaryStart);
assert(summaryStart>=0&&summaryEnd>summaryStart,'renderImportGlobalSummary source not found.');
const summary=importWorkbench.slice(summaryStart,summaryEnd);
assert(summary.includes('state.importDraft.files.filter(f=>f.checked)'),
  'Import summary must derive selected count from the same draft used by the file list.');
assert(summary.includes('`${checked.length}/${state.importDraft.files.length} 个文件已勾选'),
  'Import summary must display selected/total file counts.');
assert(summary.includes("$('#importCommitBtn').disabled=!checked.length"),
  'Import button enablement must track selected files.');

const automation=fs.readFileSync(path.join(root,'src','core','diagnostics','automation-test-runtime.js'),'utf8');
assert(app.includes('runImportWorkbenchSmoke:runImportWorkbenchAutomationSmoke'),
  'Host must expose the import workbench smoke to the built-in automation center.');
assert(automation.includes("'ui.import-workbench','Import workbench selection & preview'"),
  'Built-in automation must execute the import workbench UI smoke.');

console.log('v3.58.1 Import Workbench regression OK: preview formatter is host-neutral and selected/total summary renders before parsing/editor work.');
