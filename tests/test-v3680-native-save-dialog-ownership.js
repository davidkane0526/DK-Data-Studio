'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const {createNativeDialogBroker}=require('../desktop/main-modules/native-dialog-broker');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

async function run(){
  const windows=new Map();
  const BrowserWindow={fromWebContents:sender=>windows.get(sender?.id)||null};
  const warnings=[];
  const broker=createNativeDialogBroker({BrowserWindow,logger:{warn:value=>warnings.push(String(value))}});
  const sender={id:41};windows.set(41,{id:7,isDestroyed:()=>false});
  const event={sender};
  let releaseFirst;
  let firstRuns=0,secondRuns=0;
  const first=broker.run(event,{kind:'saveText',source:'test.first',defaultName:'a.csv'},async parent=>{
    firstRuns++;assert.strictEqual(parent.id,7);
    return new Promise(resolve=>{releaseFirst=resolve;});
  },{blockedValue:false});
  await Promise.resolve();
  const second=await broker.run(event,{kind:'saveText',source:'test.second',defaultName:'b.csv'},async()=>{secondRuns++;return true;},{blockedValue:false});
  assert.strictEqual(second,false,'A second native save request from the same window must be rejected while one dialog is active.');
  const otherSender={id:52};windows.set(52,{id:8,isDestroyed:()=>false});
  const crossWindow=await broker.run({sender:otherSender},{kind:'saveBase64',source:'test.other-window',defaultName:'c.png'},async()=>true,{blockedValue:false});
  assert.strictEqual(crossWindow,false,'Native Save As ownership must be application-wide; another renderer may not stack a second system dialog.');
  assert.strictEqual(firstRuns,1);assert.strictEqual(secondRuns,0,'Blocked requests must not queue another native dialog behind the active one.');
  let state=broker.diagnostics();
  assert.strictEqual(state.active,1);assert.strictEqual(state.requested,3);assert.strictEqual(state.shown,1);assert.strictEqual(state.blocked,2);
  assert.strictEqual(state.lastBlocked.source,'test.other-window');assert.ok(warnings.some(row=>row.includes('blocked concurrent saveText request')));
  releaseFirst(true);assert.strictEqual(await first,true);
  state=broker.diagnostics();assert.strictEqual(state.active,0);assert.strictEqual(state.completed,1);

  const third=await broker.run(event,{kind:'saveProject',source:'test.third'},async()=>null,{blockedValue:null});
  assert.strictEqual(third,null);state=broker.diagnostics();assert.strictEqual(state.cancelled,1,'Canceled native dialogs must remain observable without leaking ownership.');

  const main=read('desktop/main.js');
  assert.ok(main.includes("createNativeDialogBroker({BrowserWindow,logger:console})"),'Desktop host must own one native-dialog broker.');
  for(const channel of ['files:saveText','files:saveBase64','files:saveProject']){
    const index=main.indexOf(`ipcMain.handle('${channel}'`);assert.ok(index>=0,`${channel} handler missing.`);
    assert.ok(main.slice(index,index+1900).includes('nativeDialogBroker.run('),`${channel} must route modal saves through NativeDialogBroker.`);
  }
  assert.ok(main.includes('dialog.showSaveDialog(parent,options)'),'Native save dialogs must be parented to the originating BrowserWindow.');
  assert.ok(main.includes('nativeDialogs:nativeDialogBroker.diagnostics()'),'Runtime diagnostics must expose native dialog pressure.');

  const plot=read('src/core/ui/modules/plot-view/chart.js');
  assert.ok(plot.includes('invokeExportAction(id,payload,handler)'),'PlotView exports must validate their explicit menu activation.');
  assert.ok(plot.includes("menu?.contains?.(button)"),'PlotView must reject export intents that did not originate in its current export menu.');
  assert.ok(plot.includes("source:`core.plot-view.${this.id}.${ext}`"),'PlotView save intents must be traceable to a unique source.');
  assert.ok(plot.includes("invokeExportAction('csv',payload")&&plot.includes("invokeExportAction('png',payload"),'Every standard file export must use the guarded activation path.');
  console.log('v3.68.0 native save dialog ownership PASS');
}
run().catch(error=>{console.error(error);process.exit(1);});
