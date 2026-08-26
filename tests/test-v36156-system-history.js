'use strict';
const fs=require('fs');const path=require('path');const vm=require('vm');
const root=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));const assert=(v,m)=>{if(!v)throw new Error(m);};
(async()=>{
  const pkg=json('package.json');assert(pkg.version==='3.61.84','current-version assertion is synchronized by set-version');
  const context={window:{},console,setTimeout,clearTimeout};context.window=context;
  vm.runInNewContext(read('src/core/project-history.js'),context,{filename:'project-history.js'});
  const history=context.DKDSProjectHistory.create({limit:3});let value=0;
  history.record({label:'A',scope:'project',source:'test',undo:()=>{value=0;},redo:()=>{value=1;}});value=1;
  history.record({label:'B',undo:async()=>{await Promise.resolve();value=1;},redo:async()=>{await Promise.resolve();value=2;}});value=2;
  let state=history.snapshot();assert(state.version==='2.0.0'&&state.canUndo&&!state.canRedo&&state.undoLabel==='B','History v2 must expose deterministic current state.');
  await history.undo();assert(value===1&&history.canRedo(),'Async undo must move the entry only after successful completion.');
  state=history.snapshot();assert(state.redoEntry?.label==='B'&&state.redoEntry?.updatedAt>=state.redoEntry?.createdAt,'Redo entry must retain timing metadata for system ordering.');
  await history.redo();assert(value===2&&history.canUndo(),'Async redo must restore the entry.');
  history.record({label:'reject',undo:()=>false,redo:()=>true});const before=history.snapshot().past.length;assert(await history.undo()===false&&history.snapshot().past.length===before,'Rejected undo must never corrupt the stack.');

  const kernel=read('src/core/plugin-kernel.js');
  assert(kernel.includes("typeof result.then==='function'")&&kernel.includes('Promise.resolve(result).then(value=>value!==false)'),'Edit Contract must preserve asynchronous false instead of treating Promise<false> as handled.');
  assert(kernel.includes('editActionAvailable')&&kernel.includes('editHistoryState')&&kernel.includes('can:action=>editActionAvailable(action)')&&kernel.includes('history:()=>editHistoryState()'),'Edit Contract must expose availability and local history state.');
  assert(kernel.includes('notifyEditHistory')&&kernel.includes('changed: detail => notifyEditHistory(pluginId,detail)'),'Edit providers must be able to publish local history changes through Core.');

  const index=read('src/index.html');assert(index.includes('id="undoBtn"')&&index.includes('id="redoBtn"'),'Desktop Edit menu must expose both Undo and Redo.');
  const app=read('src/app.js');
  assert(app.includes('systemHistorySnapshotSync')&&app.includes('runSystemHistory')&&app.includes("historyCandidate(project,direction,'project')")&&app.includes("historyCandidate(workspace,direction,'workspace')"),'Main shell must coordinate project and workspace history.');
  assert(app.includes('撤销/重做按真实操作时间排序')&&app.includes("[${item.scopeLabel}]")&&app.includes('下一步撤销'),'History dialog must describe the real combined history rather than project-only state.');
  assert(app.includes('history:systemHistorySnapshotSync()')&&app.includes('historyState:()=>systemHistorySnapshotSync()')&&app.includes('historySnapshot:()=>systemHistorySnapshotSync()'),'Mobile and Kernel history state must expose the same system coordinator state.');
  assert(app.includes("dkds:history-changed")&&read('src/core/mobile-host-runtime.js').includes("window.addEventListener('dkds:history-changed',publish)"),'History changes must proactively refresh the native mobile shell.');

  const windowRuntime=read('src/plugin-window/runtime.js');
  assert(windowRuntime.includes('runWindowHistory')&&windowRuntime.includes("candidate(project,'project')")&&windowRuntime.includes("candidate(local,'workspace')"),'Dedicated TOP windows must use the same chronological history policy.');

  const resonance=read('src/plugins/resonance-workbench/feature-runtime.js'),views=read('src/plugins/resonance-workbench/view-components.js');
  assert(resonance.includes('redoStack')&&resonance.includes('redoLastAction')&&resonance.includes('historyState()'),'Resonance must provide real undo+redo state instead of an undo-only private stack.');
  assert(resonance.includes("historyChanged({reason:'record'")&&resonance.includes("historyChanged({reason:'undo'")&&resonance.includes("historyChanged({reason:'redo'"),'Workspace history mutations must publish state changes.');
  assert(views.includes("'builtin.resonance.redo'")&&views.includes('canUndo:()=>R.historyState?.().canUndo===true')&&views.includes('historyState:()=>R.historyState?.()||null'),'Resonance Edit Contract must expose undo/redo availability and state.');
  assert(!views.includes("['Ctrl+Z','builtin.resonance.undo']"),'Plugin keyboard behavior must not bypass the system chronological history coordinator.');
  console.log('v3.61.56 system history coordinator checks passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
