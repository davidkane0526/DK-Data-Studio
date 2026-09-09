'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {createNativeSaveIntentController,isConcreteNativePath}=require('../desktop/preload-modules/native-save-intent');

function control({id='',textContent='',nativeSave='',action='',aria='',title='',exportMenu=false,tagName='BUTTON'}={}){
  const el={
    id,tagName,textContent,className:'',
    dataset:{},
    getAttribute(name){if(name==='aria-label')return aria;if(name==='title')return title;return null;},
    closest(selector){
      if(selector==='[data-plugin-menu="export"]')return exportMenu?{}:null;
      if(selector==='[data-dkds-native-save]')return nativeSave?el:null;
      return null;
    }
  };
  if(nativeSave)el.dataset.dkdsNativeSave=nativeSave;
  if(action)el.dataset.actionId=action;
  return el;
}
function click(target){return {type:'click',isTrusted:true,target};}
function key(keyValue,mods={}){return {type:'keydown',isTrusted:true,key:keyValue,ctrlKey:!!mods.ctrlKey,metaKey:!!mods.metaKey};}

(function run(){
  let time=1000;const blocked=[];
  const intent=createNativeSaveIntentController({now:()=>time,report:row=>blocked.push(row)});

  // Ordinary controls and plots can never mint a native save intent.
  assert.strictEqual(intent.captureEvent(click(control({id:'inspectBtn',textContent:'检查'}))),false);
  assert.strictEqual(intent.consume('export',{source:'test.ordinary-button'}),null);
  assert.strictEqual(intent.captureEvent(click(control({id:'plotSurface',textContent:'主图',tagName:'DIV'}))),false);
  assert.strictEqual(intent.consume('export',{source:'test.plot-click'}),null);
  assert.strictEqual(blocked.length,2);

  // Explicit export controls mint a one-shot export intent only.
  const explicitExport=control({id:'exportCsv',textContent:'导出 CSV',nativeSave:'export'});
  assert.strictEqual(intent.captureEvent(click(explicitExport)),true);
  const exportIntent=intent.consume('export',{source:'plugin:test:csv'});
  assert.ok(exportIntent?.authorized);assert.strictEqual(exportIntent.kind,'export');
  assert.strictEqual(intent.consume('export',{source:'test.second-export'}),null,'One trusted activation must authorize at most one native save request.');

  // Menu ancestry and export-looking text are not filesystem authority.
  assert.strictEqual(intent.captureEvent(click(control({id:'menuItem42',textContent:'导出 CSV',exportMenu:true}))),false);
  assert.strictEqual(intent.consume('export',{source:'core.menu.export-heuristic'}),null);
  assert.strictEqual(intent.captureEvent(click(control({id:'csvDownload',textContent:'下载 CSV',action:'export-csv'}))),false);
  assert.strictEqual(intent.consume('export',{source:'core.button-text-heuristic'}),null);

  // Project save and export are distinct capabilities.
  assert.strictEqual(intent.captureEvent(click(control({id:'saveProjectBtn',textContent:'保存',nativeSave:'project'}))),true);
  assert.strictEqual(intent.consume('export',{source:'wrong-kind'}),null,'Project save activation must not authorize an export dialog.');
  assert.strictEqual(intent.captureEvent(click(control({id:'saveProjectBtn',textContent:'保存项目',nativeSave:'project'}))),true);
  assert.ok(intent.consume('project',{source:'core.project.save'}));
  assert.strictEqual(intent.captureEvent(key('s',{ctrlKey:true})),true);
  assert.ok(intent.consume('project',{source:'shortcut'}));

  // A later ordinary click invalidates an earlier export intent before handlers can misuse it.
  intent.capture('export',{source:'test',control:'old-export'});
  assert.strictEqual(intent.captureEvent(click(control({id:'parametersBtn',textContent:'参数'}))),false);
  assert.strictEqual(intent.consume('export',{source:'stale-export'}),null);

  // Intents expire and filesystem paths are never confused with protocol URIs.
  intent.capture('export',{source:'test-expiry'});time+=61000;
  assert.strictEqual(intent.consume('export',{source:'expired'}),null);
  assert.strictEqual(isConcreteNativePath('C:\\data\\project.dkds.json'),true);
  assert.strictEqual(isConcreteNativePath('\\\\server\\share\\project.dkds.json'),true);
  assert.strictEqual(isConcreteNativePath('/home/user/project.dkds.json'),true);
  assert.strictEqual(isConcreteNativePath('native-document://abc'),false);
  assert.strictEqual(isConcreteNativePath('native://abc'),false);
  assert.strictEqual(isConcreteNativePath('webfs://abc'),false);

  const saveIntentSource=read('desktop/preload-modules/native-save-intent.js');
  assert.ok(saveIntentSource.includes("const SAVE_CONTROL_SELECTOR='[data-dkds-native-save]'"),'Native save capture must inspect only explicit owner controls.');
  assert.ok(!saveIntentSource.includes("button,[role=\"button\"]"),'The old document-wide generic button authorization listener must never return.');
  assert.ok(!/EXPORT_WORDS|PROJECT_SAVE_WORDS|GENERIC_SAVE_WORDS/.test(saveIntentSource),'Native save authority must not be inferred from translated text/id/class heuristics.');

  const preload=read('desktop/preload.js');
  assert.ok(preload.includes("installNativeSaveIntentCapture(nativeSaveIntent)"),'Preload must capture trusted save activations at the host boundary.');
  assert.ok(preload.includes("withSaveIntent('export',payload)"),'Text/base64 exports must consume explicit export intent.');
  assert.ok(preload.includes("withSaveIntent('project',clean)"),'Project paths that need a Save As dialog must consume explicit project intent.');
  assert.ok(preload.includes("delete clean.__dkdsNativeSaveIntent"),'Renderer payloads must not be able to forge the preload-owned save-intent token.');

  const main=read('desktop/main.js');
  const nativeSaveRuntime=read('desktop/main-modules/native-save-runtime.js');
  assert.ok(main.includes('createNativeSaveRuntime({session,nativeDialogBroker})'),'Desktop composition must delegate save-intent/download ownership to one native-save runtime.');
  assert.ok(nativeSaveRuntime.includes("target.on('will-download'"),'Electron native-save runtime must own and block renderer-originated Chromium downloads.');
  assert.ok(nativeSaveRuntime.includes('event.preventDefault()'),'Renderer downloads must not open a second native save UI path.');
  assert.ok(main.includes("if(!nativeSaveRuntime.authorized(payload,'export'))"),'Native export IPC must reject requests without explicit save intent.');
  assert.ok(main.includes("if(!nativeSaveRuntime.authorized(payload,'project'))"),'Native Save As IPC must reject requests without explicit project-save intent.');
  assert.ok(nativeSaveRuntime.includes('nativeDialogBroker.recordRendererDownloadBlocked'),'Blocked renderer downloads must be traceable.');
  assert.ok(nativeSaveRuntime.includes('nativeDialogBroker.recordIntentBlocked'),'Blocked native save intents must be traceable.');

  const pulse=read('src/plugins/pulse-sampler-tool/plugin.js');
  assert.ok(pulse.includes('ctx.io.saveText('),'Pulse Sampler must use Plugin API I/O for CSV exports.');
  assert.ok(!/\.download\s*=|setAttribute\(\s*['"]download['"]|URL\.createObjectURL\s*\(/.test(pulse),'First-party Pulse Sampler must not own a browser download path.');
  for(const entry of fs.readdirSync(path.join(root,'src/plugins'),{withFileTypes:true}).filter(row=>row.isDirectory())){
    for(const file of fs.readdirSync(path.join(root,'src/plugins',entry.name)).filter(name=>name.endsWith('.js'))){
      const source=read(path.join('src/plugins',entry.name,file));
      assert.ok(!/\.download\s*=|setAttribute\(\s*['"]download['"]/.test(source),`First-party plugin ${entry.name}/${file} must not create renderer download anchors; use ctx.io.`);
    }
  }

  const history=read('src/app/modules/project-tabs-history.js');
  assert.ok(!history.includes('window.electronAPI.saveProject(')&&history.includes('scheduleProjectDirtyCheck'),'Background dirty tracking must never write a project file on any host.');

  console.log('v3.68.0 explicit native save intent + renderer download ownership PASS');
})();
