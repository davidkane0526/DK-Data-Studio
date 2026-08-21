'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'src','app.js'),'utf8');

assert(app.includes('function formatImportNumber(value,digits=6){'),
  'Import workbench must own a domain-neutral numeric formatter.');
assert(!app.includes('gateFmt('),
  'Import workbench must not depend on the removed Gate-analysis formatter.');
assert(app.includes('Number.isFinite(v)?`<td>${formatImportNumber(v,6)}</td>`'),
  'Import preview table must render through the import formatter.');

const addStart=app.indexOf('async function addImportFiles(){');
const addEnd=app.indexOf('\n  function openImportWorkbench(options={})',addStart);
assert(addStart>=0&&addEnd>addStart,'addImportFiles source not found.');
const add=app.slice(addStart,addEnd);
const firstRender=add.indexOf('renderImportWorkbench();');
const readLoop=add.indexOf('for(const meta of metas){',add.indexOf('if(!importDraft.activePath)'));
assert(firstRender>=0&&readLoop>firstRender,
  'Selected-file count must render before sequential file parsing starts.');

const renderStart=app.indexOf('function renderImportWorkbench(){');
const renderEnd=app.indexOf('\n  async function updateImportSetting',renderStart);
assert(renderStart>=0&&renderEnd>renderStart,'renderImportWorkbench source not found.');
const render=app.slice(renderStart,renderEnd);
assert(render.indexOf('renderImportGlobalSummary();')<render.indexOf('renderImportEditor();'),
  'Selection summary must update before preview/editor rendering.');

const summaryStart=app.indexOf('function renderImportGlobalSummary(){');
const summaryEnd=app.indexOf('\n  function renderImportWorkbench()',summaryStart);
assert(summaryStart>=0&&summaryEnd>summaryStart,'renderImportGlobalSummary source not found.');
const summary=app.slice(summaryStart,summaryEnd);
assert(summary.includes('importDraft.files.filter(f=>f.checked)'),
  'Import summary must derive selected count from the same draft used by the file list.');
assert(summary.includes('`${checked.length}/${importDraft.files.length} 个文件已勾选'),
  'Import summary must display selected/total file counts.');
assert(summary.includes("$('#importCommitBtn').disabled=!checked.length"),
  'Import button enablement must track selected files.');

const automation=fs.readFileSync(path.join(root,'src','core','automation-test-runtime.js'),'utf8');
assert(app.includes('runImportWorkbenchSmoke:runImportWorkbenchAutomationSmoke'),
  'Host must expose the import workbench smoke to the built-in automation center.');
assert(automation.includes("'ui.import-workbench','Import workbench selection & preview'"),
  'Built-in automation must execute the import workbench UI smoke.');

console.log('v3.58.1 Import Workbench regression OK: preview formatter is host-neutral and selected/total summary renders before parsing/editor work.');
