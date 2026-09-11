'use strict';

const fs=require('fs');
const path=require('path');

const REQUIRED_RUNNER=[1,33,0];
const REQUIRED_APP='3.67.10';
const REQUIRED_CASES=['ui.hard-visual-invariants','ui.visual-geometry-closure','ui.theme-runtime-performance','ui.theme-coverage'];

function versionTuple(value){
  const match=String(value||'').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match?match.slice(1).map(Number):null;
}
function versionAtLeast(actual,minimum=REQUIRED_RUNNER){
  const tuple=versionTuple(actual);if(!tuple)return false;
  for(let i=0;i<3;i++){if(tuple[i]>minimum[i])return true;if(tuple[i]<minimum[i])return false;}
  return true;
}
function resultMap(report){return new Map((Array.isArray(report?.results)?report.results:[]).map(row=>[String(row?.id||''),row]));}
function numberZero(value){return Number(value||0)===0;}

function verifyVisualClosureReport(report){
  const errors=[];const notes=[];
  const fail=(message)=>errors.push(message);
  if(!report||typeof report!=='object')return {ok:false,errors:['Report is not a JSON object.'],notes};
  if(report.kind!=='dkds.automation-test-report')fail(`Unexpected report kind: ${String(report.kind||'missing')}`);
  if(!versionAtLeast(report.runnerVersion))fail(`Automation runner must be >= ${REQUIRED_RUNNER.join('.')}; got ${String(report.runnerVersion||'missing')}.`);
  if(String(report.appVersion||'')!==REQUIRED_APP)fail(`Visual Closure report appVersion must be ${REQUIRED_APP}; got ${String(report.appVersion||'missing')}.`);

  const runtime=String(report?.environment?.runtime||report?.desktopEnvironment?.runtime||'');
  if(runtime!=='desktop')fail(`Visual Closure requires a Windows/Electron desktop report; runtime=${runtime||'missing'}.`);
  const platform=String(report?.desktopEnvironment?.platform||report?.environment?.platform||'');
  if(platform&&platform!=='win32')fail(`Visual Closure requires Windows Electron; platform=${platform}.`);

  const rows=resultMap(report);
  for(const id of REQUIRED_CASES){const row=rows.get(id);if(!row)fail(`Missing required automation case: ${id}.`);else if(row.status!=='pass')fail(`${id} must PASS; status=${String(row.status||'missing')}${row.detail?` (${row.detail})`:''}.`);}

  const failedRows=[...rows.values()].filter(row=>row?.status==='fail');
  if(failedRows.length)fail(`Automation report contains ${failedRows.length} failed case(s): ${failedRows.slice(0,8).map(row=>row.id).join(', ')}.`);
  if(Number(report?.counts?.fail||0)!==0)fail(`Report counts.fail must be 0; got ${Number(report?.counts?.fail||0)}.`);

  const visual=rows.get('ui.visual-geometry-closure')?.data||{};
  for(const [key,expected] of [['dockTransparent',true]])if(visual[key]!==expected)fail(`Visual geometry closure did not confirm ${key}=${expected}.`);
  if(Number(visual.topbarActions||0)<3)fail('Visual geometry closure did not measure at least three visible topbar actions.');
  if(Number(visual.shellGroups||0)<3)fail('Visual geometry closure did not measure all three topbar visual groups.');
  if(Number(visual.presentationCommands||0)<3)fail('Visual geometry closure did not measure the Desktop Presenter command set.');
  if(Number(visual.groupedContextChecked||0)<1)fail('Visual closure did not exercise grouped Component Context resolution.');
  if(Number(visual.standaloneContextChecked||0)<1)fail('Visual closure did not exercise standalone Component Context resolution.');
  if(Number(visual.materialRoleCompositionChecked||0)<1)fail('Visual closure did not exercise Component × Material Role composition.');
  if(visual.workspaceModalChecked!==true)fail('Visual closure did not confirm elevated + workspace-modal Import Workbench composition.');

  const perf=rows.get('ui.theme-runtime-performance')?.data||{};
  if(Number(perf?.delta?.materialFlushes||0)>4)fail(`Theme Runtime material idle flush budget exceeded: ${Number(perf?.delta?.materialFlushes||0)}.`);
  if(Number(perf?.delta?.appearanceFlushes||0)>4)fail(`Theme Runtime appearance idle flush budget exceeded: ${Number(perf?.delta?.appearanceFlushes||0)}.`);
  if(Number(perf?.delta?.semanticFlushes||0)>4)fail(`Theme Runtime semantic idle flush budget exceeded: ${Number(perf?.delta?.semanticFlushes||0)}.`);
  if(Number(perf?.delta?.materialAssignCalls||0)>8)fail(`Theme Runtime material idle scan budget exceeded: ${Number(perf?.delta?.materialAssignCalls||0)}.`);
  if(Number(perf?.delta?.appearanceAssignCalls||0)>8)fail(`Theme Runtime appearance idle scan budget exceeded: ${Number(perf?.delta?.appearanceAssignCalls||0)}.`);
  if(Number(perf?.delta?.semanticAssignCalls||0)>8)fail(`Theme Runtime semantic idle scan budget exceeded: ${Number(perf?.delta?.semanticAssignCalls||0)}.`);

  const theme=rows.get('ui.theme-coverage')?.data||{};
  const summary=theme.summary||{};
  for(const key of ['partial','unmanaged','brokenMaterial','occludedMaterial','authoredUnused'])if(!numberZero(summary[key]))fail(`Theme Coverage ${key} must be 0; got ${Number(summary[key]||0)}.`);
  if(summary.rendererOk!==true)fail(`Theme Coverage rendererOk must be true; got ${String(summary.rendererOk)}.`);
  if(summary.appearanceOk!==true)fail(`Theme Coverage appearanceOk must be true; got ${String(summary.appearanceOk)}.`);
  const contrastModes=Array.isArray(theme.contrastModes)?theme.contrastModes:[];
  if(contrastModes.length<2)fail('Theme Coverage must include both light and dark contrast validation.');
  for(const row of contrastModes){const issues=Array.isArray(row?.issues)?row.issues:[];if(row?.ok!==true||issues.length)fail(`Theme contrast ${String(row?.mode||'unknown')} must pass with 0 issues; got ok=${String(row?.ok)} issues=${issues.length}.`);}

  const packageMode=rows.get('runtime.package-mode');
  if(packageMode?.status==='skip')notes.push('Report is from Electron source/development mode; packaged NSIS/portable resource layout is not covered by this report.');
  if(!visual.workspaceGridChecked)notes.push('Workspace grid geometry was not exercised in this run because the required visible four-region workspace was not present.');
  if(!(visual.scientificNavigation?.curve&&visual.scientificNavigation?.chart))notes.push('Both ScientificCurve and ChartRuntime navigation bars were not simultaneously visible; cross-runtime geometry parity was only partially exercised.');

  return {ok:errors.length===0,errors,notes,runnerVersion:report.runnerVersion||'',appVersion:report.appVersion||'',runtime,platform,counts:report.counts||{}};
}

function main(argv=process.argv.slice(2)){
  const reportPath=argv[0];
  if(!reportPath){console.error('Usage: node scripts/verify-visual-closure-report.js <dkds-automation-report.json>');process.exitCode=2;return;}
  const absolute=path.resolve(process.cwd(),reportPath);
  let report;
  try{report=JSON.parse(fs.readFileSync(absolute,'utf8'));}catch(err){console.error(`Visual Closure report read failed: ${err.message}`);process.exitCode=2;return;}
  const verdict=verifyVisualClosureReport(report);
  console.log(`Visual Closure report: ${verdict.ok?'PASS':'FAIL'}`);
  console.log(`  runner=${verdict.runnerVersion||'missing'} app=${verdict.appVersion||'missing'} runtime=${verdict.runtime||'missing'} platform=${verdict.platform||'unknown'}`);
  console.log(`  cases=${Number(verdict.counts?.total||0)} pass=${Number(verdict.counts?.pass||0)} fail=${Number(verdict.counts?.fail||0)} skip=${Number(verdict.counts?.skip||0)}`);
  for(const note of verdict.notes)console.log(`  NOTE: ${note}`);
  for(const error of verdict.errors)console.error(`  ERROR: ${error}`);
  if(!verdict.ok)process.exitCode=1;
}

if(require.main===module)main();
module.exports={REQUIRED_RUNNER,REQUIRED_APP,REQUIRED_CASES,versionAtLeast,verifyVisualClosureReport};
