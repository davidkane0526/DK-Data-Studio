'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(value,message){if(!value)throw new Error(message);}

(async()=>{
  const pkg=json('package.json'),manifest=json('src/plugins/data-center/plugin.json'),sdk=json('sdk/contract.json');
  assert(pkg.version==='3.61.21','Application version must be 3.61.20.');
  assert(manifest.version==='1.13.6','Data Center version must advance to 1.13.6.');
  assert(sdk.pluginApiVersion==='1.15.0','Core history/tag/toolbar work must not require a Plugin API bump.');

  const dataContext={window:{},console,structuredClone:global.structuredClone,crypto:global.crypto};dataContext.window=dataContext;
  vm.runInNewContext(read('src/core/data-model.js'),dataContext,{filename:'data-model.js'});
  const D=dataContext.DKDSData;
  assert(JSON.stringify(D.dataTagsFromText('vg=-40V · ig(0.0)'))===JSON.stringify(['vg','ig']),'Transport labels must infer Vg/Ig deterministically.');
  assert(D.dataTagsFromText('grid').length===0,'Tag inference must not misclassify substrings such as grid -> Id.');
  assert(D.dataTagsFromText('ID').length===0,'Generic uppercase ID columns must not be guessed as drain current.');
  const tags=new Set(D.artifactDataTags({name:'vg=-40V · id(0.0)',columns:[{key:'Vd',name:'Vd',role:'x'},{key:'Id',name:'Drain Current',role:'y'}]}));
  assert(tags.has('vd')&&tags.has('id')&&tags.has('vg'),'Artifact tags must combine object labels and column semantics.');
  assert(D.dataTagLabel('didv')==='dI/dV'&&D.dataTagLabel('ig')==='Ig','Canonical tag labels must remain human-readable.');

  const historyContext={window:{},console};historyContext.window=historyContext;
  vm.runInNewContext(read('src/core/project-history.js'),historyContext,{filename:'project-history.js'});
  const history=historyContext.DKDSProjectHistory.create({limit:4});let value=2;
  history.record({label:'set 2',undo:()=>{value=1;},redo:()=>{value=2;}});
  assert(history.canUndo()&&!history.canRedo(),'Recorded project edit must expose undo state.');
  await history.undo();assert(value===1&&history.canRedo(),'Project history undo must execute the inverse and expose redo.');
  await history.redo();assert(value===2&&history.canUndo(),'Project history redo must replay the edit.');

  const app=read('src/app.js'),windowRuntime=read('src/plugin-window/runtime.js'),dc=read('src/plugins/data-center/feature-runtime.js'),dcView=read('src/plugins/data-center/shared-views.js'),ui=read('src/core/ui-infrastructure.js'),index=read('src/index.html'),automation=read('src/core/automation-test-runtime.js');
  assert(index.includes('core/project-history.js'),'Main shell must load the Core project-history runtime.');
  assert(app.includes("'core.project-history'")&&app.includes('recordProjectHistory({label:`数据用途')&&app.includes('history-source-remove-undo'),'Data-source management must record reversible edits in Core history.');
  assert(app.includes("e.key.toLowerCase()==='y'")&&app.includes('e.shiftKey)void systemRedo()'),'Main shell must support Ctrl/Cmd+Y and Ctrl/Cmd+Shift+Z redo.');
  assert(windowRuntime.includes("'core.project-history','undo'")&&windowRuntime.includes("'core.project-history','redo'"),'Dedicated TOP windows must fall back to the same Core project history.');
  assert(dc.includes("proxy?.('core.project-history')")&&dc.includes('commitArtifactMutation'),'Data Center non-source artifact edits must use Core history rather than a private undo stack.');
  assert(!dcView.includes('dcTagChips')&&!app.includes('importColumnTagFilter'),'Legacy semantic tag pills must not remain coupled to Data Center / Import UX; semantic helpers stay available only as internal metadata utilities.');
  assert(ui.includes('navigationToolObstacles()')&&ui.includes('avoidNavigationToolCollisions()')&&ui.includes("'.main-legend-bar'")&&ui.includes("'.respar-main-legend'")&&ui.includes('installNavigationObstacleObserver()'),'Core D3 navigation chrome must detect changing legend overlays and reroute around them.');
  assert(automation.includes("const VERSION='1.23.0'")&&automation.includes("'project.history'"),'Windows automation must expose the unified project-history contract.');
  console.log('v3.61.20 semantic tags + unified project history + legend-aware D3 toolbar checks passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
