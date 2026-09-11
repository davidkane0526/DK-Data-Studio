'use strict';

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const os=require('os');

function createAuxiliaryWindowRuntime({app,BrowserWindow,appRoot,resolveConfiguredPluginWindow,listConfiguredPluginWindows,nativeWindowBackground,commonWindowPreferences,isAppQuitting}){
  const APP_ROOT=appRoot;
  const auxiliaryWindows=new Map();
  const auxiliaryBootstrap=new Map();
  const auxiliaryReady=new Set();
  const auxiliaryFailures=new Map();
  const auxiliaryPendingShow=new Set();
  const auxiliaryStartupProfiles=new Map();
  const forcedAuxiliaryClose=new WeakSet();
  const pendingAuxiliaryRoleSnapshots=new Map();
  let auxiliaryRoleSnapshotSeq=0;

function auxiliaryWindowKey(ownerWebContentsId, projectTabId, activityId, {reuse=true} = {}) {
  // Reusable TOP/Tool windows are renderer singletons per owner + activity. Project
  // state is explicitly rehydrated through the bootstrap contract when a different
  // project opens the same activity. This prevents project-tab prewarm duplicates.
  return `${ownerWebContentsId}::${reuse !== false ? '__reusable__' : (projectTabId || 'project')}::${activityId}`;
}

function removeAuxiliaryWindowReferences(win) {
  if (!win) return;
  for (const [key, candidate] of auxiliaryWindows) {
    if (candidate === win) auxiliaryWindows.delete(key);
  }
}

function projectSnapshotDigest(project) {
  try {
    return crypto.createHash('sha1').update(JSON.stringify(project || null)).digest('hex');
  } catch {
    return '';
  }
}

function makeAuxiliaryBootstrap(ownerWebContentsId, payload, pluginWindow) {
  const project = payload.project || null;
  const artifactSnapshot = Array.isArray(payload.artifactSnapshot) ? payload.artifactSnapshot : null;
  return {
    activityId:String(payload.activityId || '').trim(),
    projectTabId:String(payload.projectTabId || '').trim(),
    project,
    projectDigest:projectSnapshotDigest(project),
    artifactSnapshot,
    artifactDigest:projectSnapshotDigest(artifactSnapshot),
    projectPath:payload.projectPath || null,
    title:payload.title || '',
    ownerWebContentsId,
    prewarm:payload.prewarm === true,
    capabilitySnapshot:payload.capabilitySnapshot || null,
    capabilityRevision:Number(payload.capabilityRevision)||0,
    diagnosticRun:payload.diagnosticRun===true,
    pluginWindow:pluginWindow ? {...pluginWindow} : null
  };
}

function routeArtifactDelta(event,payload={}) {
  const auxiliary=auxiliaryBootstrap.get(event?.sender?.id)||null;
  const projectTabId=String(payload?.projectTabId||auxiliary?.projectTabId||'').trim();
  const delta=payload?.artifactDelta&&typeof payload.artifactDelta==='object'?payload.artifactDelta:null;
  if(auxiliary){
    const owner=BrowserWindow.getAllWindows().find(win=>win.webContents?.id===auxiliary.ownerWebContentsId);
    if(!owner||owner.isDestroyed()||!projectTabId||!delta)return false;
    owner.webContents.send('windows:activityProjectSnapshot',{
      projectTabId,activityId:String(auxiliary.activityId||payload?.activityId||''),
      pluginId:String(auxiliary.pluginWindow?.pluginId||''),persistence:auxiliary.pluginWindow?.persistence||'project',
      project:null,pluginState:null,artifactDelta:delta,final:false,artifactOnly:true
    });
    return true;
  }
  const owner=BrowserWindow.fromWebContents(event?.sender);
  const ownerId=owner?.webContents?.id;
  const excludeActivityId=String(payload?.excludeActivityId||'').trim();
  if(!ownerId||!projectTabId||!delta)return false;
  for(const win of auxiliaryWindows.values()){
    if(!win||win.isDestroyed())continue;
    const row=auxiliaryBootstrap.get(win.webContents.id);
    if(row?.ownerWebContentsId!==ownerId||String(row?.projectTabId||'')!==projectTabId)continue;
    if(excludeActivityId&&String(row?.activityId||'')===excludeActivityId)continue;
    if(row?.prewarm===true)continue;
    try{win.webContents.send('windows:ownerArtifactDelta',{
      projectTabId,reason:String(payload?.reason||'owner-artifact-change'),artifactDelta:delta
    });}catch{}
  }
  return true;
}

function hideDedicatedAuxiliaryWindow(win) {
  if (!win || win.isDestroyed()) return false;
  try { win.webContents.send('windows:activityWillHide'); } catch {}
  win.hide();
  return true;
}

function closeAuxiliaryWindowForReal(win) {
  if (!win || win.isDestroyed()) return;
  // Once Core has committed to a real close, the window must leave the reuse
  // registry synchronously. BrowserWindow.close() completes asynchronously on
  // Windows; leaving the entry mapped until the `closed` event lets an
  // immediately following open reuse a renderer that is already closing.
  removeAuxiliaryWindowReferences(win);
  forcedAuxiliaryClose.add(win);
  win.close();
}

function waitForAuxiliaryWindowClosed(win, timeoutMs=1800) {
  if (!win || win.isDestroyed()) return Promise.resolve(true);
  return new Promise(resolve=>{
    let settled=false;
    const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
    const timer=setTimeout(()=>finish(!!win.isDestroyed()),Math.max(250,Number(timeoutMs)||1800));
    win.once('closed',()=>finish(true));
  });
}

function markAuxiliaryWindowReady(win,payload={}) {
  if(!win||win.isDestroyed())return;
  const id=win.webContents.id;
  const profile=auxiliaryStartupProfiles.get(id)||{};
  profile.readyAtMs=Date.now();
  profile.main=profile.main||{};
  profile.main.createToReadyMs=Math.max(0,profile.readyAtMs-Number(profile.createdAtMs||profile.readyAtMs));
  if(payload?.startupProfile&&typeof payload.startupProfile==='object')profile.renderer=payload.startupProfile;
  auxiliaryStartupProfiles.set(id,profile);
  auxiliaryFailures.delete(id);
  auxiliaryReady.add(id);
  if(!auxiliaryPendingShow.has(id))return;
  auxiliaryPendingShow.delete(id);
  try { win.webContents.send('windows:activityWillShow'); } catch {}
  win.show();
  win.focus();
}

function markAuxiliaryWindowFailed(win,payload={}) {
  if(!win||win.isDestroyed())return;
  const id=win.webContents.id;
  const bootstrap=auxiliaryBootstrap.get(id)||{};
  const profile=auxiliaryStartupProfiles.get(id)||{};
  if(payload?.startupProfile&&typeof payload.startupProfile==='object')profile.renderer=payload.startupProfile;
  profile.failedAtMs=Date.now();auxiliaryStartupProfiles.set(id,profile);
  const failure={
    activityId:String(bootstrap.activityId||payload.activityId||''),
    projectTabId:String(bootstrap.projectTabId||payload.projectTabId||''),
    pluginId:String(bootstrap.pluginWindow?.pluginId||payload.pluginId||''),
    error:String(payload.error||payload.message||'插件独立窗口启动失败。'),
    startupProfile:profile
  };
  auxiliaryReady.delete(id);
  auxiliaryFailures.set(id,failure);

  // A user-requested window must never fail invisibly behind `show:false`.
  // Prewarmed failures stay hidden until the user actually opens the TOP.
  if(auxiliaryPendingShow.has(id)){
    auxiliaryPendingShow.delete(id);
    try{win.show();win.focus();}catch{}
  }

  const owner=BrowserWindow.getAllWindows().find(candidate=>!candidate.isDestroyed()&&candidate.webContents.id===bootstrap.ownerWebContentsId);
  if(!bootstrap.diagnosticRun)try{owner?.webContents?.send?.('windows:activityFailed',failure);}catch{}
}

const diagnosticDelay=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));
async function diagnosticRendererLifecycleSnapshot(win){
  if(!win||win.isDestroyed())return null;
  try{return await win.webContents.executeJavaScript('window.DKDSUI?.lifecycleSnapshot?.() || null',true);}
  catch{return null;}
}
async function diagnosticRendererProjectSnapshot(win){
  if(!win||win.isDestroyed())return null;
  try{return await win.webContents.executeJavaScript('window.DKDSPluginWindowDiagnostics?.snapshot?.() || null',true);}
  catch{return null;}
}
function lifecycleSnapshotSuspended(snapshot,expected){
  const rows=Array.isArray(snapshot?.rows)?snapshot.rows:[];
  if(!rows.length)return true;
  return rows.every(row=>row?.resize?.suspended===expected&&(!row?.plots||Number(row.plots.suspended||0)===(expected?Number(row.plots.views||0):0))&&(!row?.interactions||Number(row.interactions.suspended||0)===(expected?Number(row.interactions.runtimes||0):0)));
}
async function waitForRendererLifecycleContract(win,expected,timeoutMs=2500){
  const started=Date.now();let snapshot=null;
  while(Date.now()-started<Math.max(250,Number(timeoutMs)||2500)){
    snapshot=await diagnosticRendererLifecycleSnapshot(win);
    if(lifecycleSnapshotSuspended(snapshot,expected))return {ok:true,snapshot,elapsedMs:Date.now()-started};
    await diagnosticDelay(40);
  }
  snapshot=await diagnosticRendererLifecycleSnapshot(win);
  return {ok:lifecycleSnapshotSuspended(snapshot,expected),snapshot,elapsedMs:Date.now()-started};
}

function waitForAuxiliaryDiagnosticOutcome(win,timeoutMs=15000){
  if(!win||win.isDestroyed())return Promise.resolve({ok:false,error:'Diagnostic TOP window was not created.'});
  const webContentsId=win.webContents.id;
  const started=Date.now();
  return new Promise(resolve=>{
    const tick=()=>{
      const failure=auxiliaryFailures.get(webContentsId);
      if(failure)return resolve({ok:false,error:String(failure.error||'TOP renderer failed.'),durationMs:Date.now()-started});
      if(!win||win.isDestroyed())return resolve({ok:false,error:'Diagnostic TOP window closed before ready.',durationMs:Date.now()-started});
      if(auxiliaryReady.has(webContentsId))return resolve({ok:true,durationMs:Date.now()-started});
      if(Date.now()-started>=timeoutMs)return resolve({ok:false,error:`TOP renderer did not reach ready within ${timeoutMs} ms.`,durationMs:Date.now()-started,timeout:true});
      setTimeout(tick,50);
    };
    tick();
  });
}

async function runDiagnosticActivitySmoke(ownerWindow,payload={}){
  const activityId=String(payload?.activityId||'').trim();
  if(!ownerWindow||ownerWindow.isDestroyed())throw new Error('Main application window is unavailable.');
  if(!activityId)throw new Error('Diagnostic activity id is required.');
  const spec=resolveConfiguredPluginWindow(activityId);
  if(!spec)return {ok:false,activityId,error:'No independent TOP window is configured for this activity.'};
  const projectTabId=`__dkds_automation__${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const project=payload?.project&&typeof payload.project==='object'
    ? structuredClone(payload.project)
    : {version:app.getVersion(),datasets:[],plugins:{},dataModel:{schema:2,artifacts:[]}};
  const artifactSnapshot=Array.isArray(payload?.artifactSnapshot)?structuredClone(payload.artifactSnapshot):null;
  const useConfiguredPrewarm=spec.prewarm===true;
  const basePayload={activityId,projectTabId,project,artifactSnapshot,projectPath:null,title:'自动化测试',diagnosticRun:true,capabilitySnapshot:payload?.capabilitySnapshot||null,capabilityRevision:Number(payload?.capabilityRevision)||0};
  const created=createOrFocusAuxiliaryWindow(ownerWindow,{...basePayload,prewarm:useConfiguredPrewarm});
  const key=auxiliaryWindowKey(ownerWindow.webContents.id,projectTabId,activityId,{reuse:spec?.reuse!==false});
  const win=auxiliaryWindows.get(key);
  const rendererProcessId=(()=>{try{return Number(win?.webContents?.getOSProcessId?.())||0;}catch{return 0;}})();
  const timeoutMs=Math.max(4000,Math.min(30000,Number(payload?.timeoutMs)||15000));
  let outcome=await waitForAuxiliaryDiagnosticOutcome(win,timeoutMs);
  let promotion=null;
  if(outcome.ok&&useConfiguredPrewarm&&win&&!win.isDestroyed()){
    promotion=createOrFocusAuxiliaryWindow(ownerWindow,{...basePayload,prewarm:false});
    const hydrated=await waitForAuxiliaryDiagnosticOutcome(win,timeoutMs);
    outcome=hydrated.ok?{...hydrated,prewarmReady:true}:{...hydrated,prewarmReady:true};
  }
  let lifecycle={tested:false,ok:false};
  let rendererData=null;
  if(outcome.ok&&win&&!win.isDestroyed()){
    try{
      if(!win.isVisible()){try{win.webContents.send('windows:activityWillShow');win.show();}catch{}}
      await diagnosticDelay(Array.isArray(artifactSnapshot)&&artifactSnapshot.length?260:80);
      rendererData=await diagnosticRendererProjectSnapshot(win);
      const expectedPluginId=String(spec?.pluginId||'');
      const expectedActivityId=String(activityId||'');
      if(rendererData){
        if(rendererData.projectHydrated!==true||rendererData.activityOpened!==true)throw new Error(`${expectedPluginId||expectedActivityId}: renderer reached ready without hydrated/open lifecycle.`);
        if(String(rendererData.activeActivityId||'')!==expectedActivityId)throw new Error(`${expectedPluginId||expectedActivityId}: active activity mismatch (${rendererData.activeActivityId||'none'}).`);
        if(!String(rendererData.visiblePageId||''))throw new Error(`${expectedPluginId||expectedActivityId}: renderer reached ready without a visible page.`);
        if(expectedPluginId&&String(rendererData.visiblePagePluginId||'')!==expectedPluginId)throw new Error(`${expectedPluginId}: visible page is owned by ${rendererData.visiblePagePluginId||'unknown'}.`);
        if(String(spec?.packageManifest?.workspace?.role||'').toLowerCase()==='top'&&rendererData.topWorkspaceRegistered!==true)throw new Error(`${expectedPluginId}: TOP Workspace was not registered.`);
        const chrome=rendererData.windowChrome||null,pageRect=chrome?.pageRect||null,bodyRect=chrome?.pageBodyRect||null,rootRect=chrome?.workbenchRootRect||null;
        if(!pageRect||pageRect.width<160||pageRect.height<120)throw new Error(`${expectedPluginId||expectedActivityId}: visible page has invalid geometry ${JSON.stringify(pageRect)}.`);
        if(!bodyRect||bodyRect.width<160||bodyRect.height<100)throw new Error(`${expectedPluginId||expectedActivityId}: visible page body collapsed ${JSON.stringify(bodyRect)}.`);
        if(rootRect&&(rootRect.width<160||rootRect.height<100))throw new Error(`${expectedPluginId||expectedActivityId}: workbench root collapsed ${JSON.stringify(rootRect)}.`);
        if(chrome?.controlsBound!==true||chrome?.ipcReady!==true)throw new Error(`${expectedPluginId||expectedActivityId}: self-drawn window controls are not bound to Core IPC.`);
        if(Number.isFinite(Number(chrome?.commandbarRightGap))&&Number(chrome.commandbarRightGap)>12)throw new Error(`${expectedPluginId||expectedActivityId}: self-drawn command bar is not right-anchored (gap=${chrome.commandbarRightGap}).`);
        if(Number.isFinite(Number(chrome?.actionToCommandGap))&&Number(chrome.actionToCommandGap)>20)throw new Error(`${expectedPluginId||expectedActivityId}: dedicated action cluster drifted away from window controls (gap=${chrome.actionToCommandGap}).`);
        const titlebar=chrome?.titlebarPresentation||null;
        if(!titlebar)throw new Error(`${expectedPluginId||expectedActivityId}: dedicated titlebar presentation diagnostics are missing.`);
        if(Number(titlebar.renderedPluginCount)!==Number(titlebar.expectedPluginCount))throw new Error(`${expectedPluginId||expectedActivityId}: dedicated titlebar lost plugin actions (${titlebar.renderedPluginCount}/${titlebar.expectedPluginCount}).`);
        if(Number(titlebar.renderedSurfaceCount)!==Number(titlebar.expectedSurfaceCount))throw new Error(`${expectedPluginId||expectedActivityId}: dedicated titlebar lost Core workspace actions (${titlebar.renderedSurfaceCount}/${titlebar.expectedSurfaceCount}).`);
        if(titlebar.importExpected===true&&titlebar.importRendered!==true)throw new Error(`${expectedPluginId||expectedActivityId}: dedicated titlebar lost the Core import action.`);
      }
      const hidden=hideDedicatedAuxiliaryWindow(win);
      const hiddenWait=await waitForRendererLifecycleContract(win,true,2500);
      const hiddenSnapshot=hiddenWait.snapshot;
      const reopened=createOrFocusAuxiliaryWindow(ownerWindow,{...basePayload,prewarm:false});
      await waitForAuxiliaryDiagnosticOutcome(win,timeoutMs);
      const visibleWait=await waitForRendererLifecycleContract(win,false,2500);
      const visibleSnapshot=visibleWait.snapshot;
      rendererData=await diagnosticRendererProjectSnapshot(win)||rendererData;
      lifecycle={tested:true,hidden:!!hidden,reused:reopened?.reused===true,alive:!win.isDestroyed(),visible:!win.isDestroyed()&&win.isVisible(),hiddenContract:hiddenWait.ok===true,visibleContract:visibleWait.ok===true,hiddenWaitMs:hiddenWait.elapsedMs,visibleWaitMs:visibleWait.elapsedMs,hiddenSnapshot,visibleSnapshot};
      lifecycle.ok=lifecycle.hidden&&lifecycle.reused&&lifecycle.alive&&lifecycle.visible&&lifecycle.hiddenContract&&lifecycle.visibleContract;
      if(!lifecycle.ok)lifecycle.error=`Dedicated TOP lifecycle failed: hidden=${lifecycle.hidden} reused=${lifecycle.reused} alive=${lifecycle.alive} visible=${lifecycle.visible} hiddenContract=${lifecycle.hiddenContract} visibleContract=${lifecycle.visibleContract} hiddenWaitMs=${lifecycle.hiddenWaitMs} visibleWaitMs=${lifecycle.visibleWaitMs}`;
    }catch(err){lifecycle={tested:true,ok:false,error:String(err?.message||err)};}
  }
  const startupProfile=win&&!win.isDestroyed()?structuredClone(auxiliaryStartupProfiles.get(win.webContents.id)||null):null;
  const finalOk=outcome.ok===true&&(!lifecycle.tested||lifecycle.ok===true);
  const finalError=finalOk?'':String(lifecycle.error||outcome.error||'Dedicated Tool/TOP lifecycle validation failed.');
  const details={...outcome,ok:finalOk,error:finalError,activityId,pluginId:spec.pluginId,mode:spec.mode||'dedicated',version:spec.version||'',rendererProcessId,dependencies:[...(spec.dependencies||[])],scripts:[...(spec.scripts||[])],persistence:spec.persistence||'',configuredPrewarm:useConfiguredPrewarm,created,promotion,startupProfile,lifecycle,rendererData};
  closeAuxiliaryWindowForReal(win);
  // Diagnostics intentionally runs TOPs back-to-back. Do not let the next
  // smoke test overlap the previous renderer's asynchronous BrowserWindow
  // teardown and accidentally observe/reuse a half-closed process.
  await waitForAuxiliaryWindowClosed(win,1800);
  return details;
}

function diagnosticsDirectory(){
  const dir=path.join(app.getPath('userData'),'diagnostics');
  fs.mkdirSync(dir,{recursive:true});
  return dir;
}

function diagnosticEnvironment(){
  const metrics=app.getAppMetrics();
  const memory=metrics.reduce((sum,row)=>{const m=row?.memory||{};sum.workingSetBytes+=(Number(m.workingSetSize)||0)*1024;sum.privateBytes+=(Number(m.privateBytes)||0)*1024;return sum;},{workingSetBytes:0,privateBytes:0});
  return {runtime:'desktop',appVersion:app.getVersion(),platform:process.platform,arch:process.arch,osRelease:os.release(),isPackaged:app.isPackaged,locale:app.getLocale?.()||'',processVersions:{electron:process.versions.electron||'',chrome:process.versions.chrome||'',node:process.versions.node||''},processCount:metrics.length,memory,windowCount:BrowserWindow.getAllWindows().filter(win=>!win.isDestroyed()).length,configuredTopWindows:listConfiguredPluginWindows().map(row=>({pluginId:row.pluginId,activity:row.activity,mode:row.mode||'dedicated',version:row.version,prewarm:row.prewarm,reuse:row.reuse,persistence:row.persistence}))};
}

function requestAuxiliaryRoleSnapshot(win, reason='host-role-change', timeoutMs=1800) {
  if (!win || win.isDestroyed()) return Promise.resolve(null);
  const webContentsId=win.webContents.id;
  if(!auxiliaryReady.has(webContentsId)||auxiliaryFailures.has(webContentsId))return Promise.resolve(null);
  const bootstrap=auxiliaryBootstrap.get(webContentsId)||null;
  if(!bootstrap)return Promise.resolve(null);
  const requestId=`role-${process.pid}-${Date.now()}-${++auxiliaryRoleSnapshotSeq}`;
  return new Promise(resolve=>{
    const timer=setTimeout(()=>{
      pendingAuxiliaryRoleSnapshots.delete(requestId);
      resolve(null);
    },Math.max(250,Number(timeoutMs)||1800));
    pendingAuxiliaryRoleSnapshots.set(requestId,{resolve,timer,webContentsId,bootstrap});
    try{win.webContents.send('windows:activityRoleSnapshotRequest',{requestId,reason});}
    catch{
      clearTimeout(timer);
      pendingAuxiliaryRoleSnapshots.delete(requestId);
      resolve(null);
    }
  });
}

function wrapAuxiliaryRoleSnapshot(bootstrap,snapshot={}) {
  return {
    projectTabId:String(bootstrap?.projectTabId||''),
    activityId:String(bootstrap?.activityId||''),
    pluginId:String(bootstrap?.pluginWindow?.pluginId||''),
    persistence:bootstrap?.pluginWindow?.persistence||'project',
    project:snapshot?.project||null,
    pluginState:snapshot?.pluginState??null,
    artifactDelta:snapshot?.artifactDelta||null,
    final:true
  };
}

function createOrFocusAuxiliaryWindow(ownerWindow, payload = {}) {
  const startupRequestedAtMs=Date.now();
  const activityId = String(payload.activityId || '').trim();
  const projectTabId = String(payload.projectTabId || '').trim();
  if (!activityId || !projectTabId) throw new Error('Missing auxiliary activity/project id.');

  const ownerWebContentsId = ownerWindow?.webContents?.id;
  if (!ownerWebContentsId) throw new Error('Main window is no longer available.');

  const resolveStartedAtMs=Date.now();
  const pluginWindow = resolveConfiguredPluginWindow(activityId);
  const resolveSpecMs=Date.now()-resolveStartedAtMs;
  const key = auxiliaryWindowKey(ownerWebContentsId, projectTabId, activityId, {reuse:pluginWindow?.reuse !== false});
  let previous = auxiliaryWindows.get(key);
  if (previous && !previous.isDestroyed()) {
    const previousSpec=auxiliaryBootstrap.get(previous.webContents.id)?.pluginWindow||null;
    const definitionChanged=!!pluginWindow&&!!previousSpec&&(
      previousSpec.pluginId!==pluginWindow.pluginId
      ||previousSpec.source!==pluginWindow.source
      ||previousSpec.revision!==pluginWindow.revision
    );
    if(definitionChanged){
      removeAuxiliaryWindowReferences(previous);
      closeAuxiliaryWindowForReal(previous);
      previous=null;
    }
  }
  if (previous && !previous.isDestroyed()) {
    const cachedBootstrap = auxiliaryBootstrap.get(previous.webContents.id) || null;
    // Prewarm is only allowed to create/warm an empty renderer. Never downgrade an
    // already hydrated reusable window back into prewarm mode after it is hidden;
    // doing so used to make a later reopen look like a second first-open lifecycle.
    if (payload.prewarm === true && cachedBootstrap?.prewarm !== true) {
      return {reused:true,dedicated:!!pluginWindow,prewarmSkipped:true,ready:auxiliaryReady.has(previous.webContents.id)};
    }
    const nextBootstrap = makeAuxiliaryBootstrap(ownerWebContentsId, payload, pluginWindow);
    const projectChanged = !cachedBootstrap || cachedBootstrap.projectDigest !== nextBootstrap.projectDigest
      || cachedBootstrap.projectPath !== nextBootstrap.projectPath
      || cachedBootstrap.artifactDigest !== nextBootstrap.artifactDigest
      || cachedBootstrap.prewarm !== nextBootstrap.prewarm
      || cachedBootstrap.capabilityRevision !== nextBootstrap.capabilityRevision;
    const promoteFromPrewarm = cachedBootstrap?.prewarm === true && nextBootstrap.prewarm !== true;
    auxiliaryBootstrap.set(previous.webContents.id, nextBootstrap);

    // Runtime-only prewarm marks the hidden renderer ready after Core/plugin/chart
    // code is loaded, but before domain project state or the activity is mounted.
    // First user open must therefore wait for a second, hydrated readiness signal.
    // Never show the prewarmed DOM early just because the runtime shell is warm.
    if (promoteFromPrewarm) {
      auxiliaryReady.delete(previous.webContents.id);
      auxiliaryFailures.delete(previous.webContents.id);
      auxiliaryPendingShow.add(previous.webContents.id);
    }

    // A cached plugin renderer keeps its runtime and chart libraries. Only push
    // bootstrap replacement when project/capability/prewarm state changed.
    if (projectChanged) previous.webContents.send('windows:activityBootstrapChanged');

    if (payload.prewarm === true) {
      return { reused:true, dedicated:!!pluginWindow, synchronized:projectChanged, ready:auxiliaryReady.has(previous.webContents.id) };
    }

    if (previous.isMinimized()) previous.restore();
    if (promoteFromPrewarm) {
      return { reused:true, dedicated:!!pluginWindow, synchronized:projectChanged, warming:true, prewarmed:true };
    }
    if (pluginWindow && !auxiliaryReady.has(previous.webContents.id)) {
      const failure=auxiliaryFailures.get(previous.webContents.id);
      if(failure){
        try { previous.webContents.send('windows:activityWillShow'); } catch {}
        previous.show();
        previous.focus();
        return { reused:true, dedicated:true, synchronized:projectChanged, failed:true, error:failure.error };
      }
      auxiliaryPendingShow.add(previous.webContents.id);
      return { reused:true, dedicated:true, synchronized:projectChanged, warming:true };
    }

    try { previous.webContents.send('windows:activityWillShow'); } catch {}
    previous.show();
    previous.focus();
    return { reused:true, dedicated:!!pluginWindow, synchronized:projectChanged, ready:true };
  }

  const browserWindowStartedAtMs=Date.now();
  const win = new BrowserWindow({
    show: pluginWindow ? false : payload.prewarm !== true,
    width: pluginWindow?.width || 1480,
    height: pluginWindow?.height || 940,
    minWidth: pluginWindow?.minWidth || 920,
    minHeight: pluginWindow?.minHeight || 650,
    backgroundColor: nativeWindowBackground(),
    icon: path.join(APP_ROOT, 'assets', 'dkds-icon.png'),
    autoHideMenuBar: true,
    frame: false,
    title: `DK Data Studio · ${pluginWindow?.title || payload.title || activityId}`,
    webPreferences: {
      ...commonWindowPreferences(),
      // A hidden dedicated TOP may be intentionally warming its declared Core,
      // SDK and chart runtimes. Chromium background throttling must not postpone
      // that generic warmup until the user finally opens the window.
      backgroundThrottling:false
    }
  });
  win.setMenuBarVisibility(false);
  win.on('maximize',()=>{try{win.webContents.send('windows:maximizedChanged',true);}catch{}});
  win.on('unmaximize',()=>{try{win.webContents.send('windows:maximizedChanged',false);}catch{}});
  const browserWindowCreateMs=Date.now()-browserWindowStartedAtMs;
  auxiliaryWindows.set(key, win);
  const auxiliaryWebContentsId = win.webContents.id;
  const startupProfile={version:'1.0.0',createdAtMs:startupRequestedAtMs,activityId,pluginId:String(pluginWindow?.pluginId||''),main:{resolveSpecMs,browserWindowCreateMs,navigationMs:null,createToReadyMs:null}};
  auxiliaryStartupProfiles.set(auxiliaryWebContentsId,startupProfile);
  auxiliaryBootstrap.set(
    auxiliaryWebContentsId,
    makeAuxiliaryBootstrap(ownerWebContentsId, payload, pluginWindow)
  );
  if (pluginWindow?.reuse !== false) {
    win.on('close', event => {
      if (isAppQuitting() || forcedAuxiliaryClose.has(win)) return;
      event.preventDefault();
      hideDedicatedAuxiliaryWindow(win);
    });
  }
  win.on('closed', () => {
    removeAuxiliaryWindowReferences(win);
    auxiliaryBootstrap.delete(auxiliaryWebContentsId);
    auxiliaryReady.delete(auxiliaryWebContentsId);
    auxiliaryFailures.delete(auxiliaryWebContentsId);
    auxiliaryPendingShow.delete(auxiliaryWebContentsId);
    auxiliaryStartupProfiles.delete(auxiliaryWebContentsId);
    for(const [requestId,pending] of pendingAuxiliaryRoleSnapshots){
      if(pending.webContentsId!==auxiliaryWebContentsId)continue;
      clearTimeout(pending.timer);
      pendingAuxiliaryRoleSnapshots.delete(requestId);
      pending.resolve(null);
    }
  });
  ownerWindow.once('closed', () => closeAuxiliaryWindowForReal(win));
  win.webContents.on('render-process-gone', (_event, details={}) => {
    if(isAppQuitting()||forcedAuxiliaryClose.has(win)||win.isDestroyed())return;
    const reason=String(details?.reason||'unknown');
    const bootstrap=auxiliaryBootstrap.get(auxiliaryWebContentsId)||{};
    const owner=BrowserWindow.getAllWindows().find(candidate=>!candidate.isDestroyed()&&candidate.webContents.id===bootstrap.ownerWebContentsId);
    const failure={
      activityId:String(bootstrap.activityId||''),
      projectTabId:String(bootstrap.projectTabId||''),
      pluginId:String(bootstrap.pluginWindow?.pluginId||''),
      error:`插件独立窗口异常退出（${reason}），再次打开时将自动重建。`
    };
    if(!bootstrap.diagnosticRun)try{owner?.webContents?.send?.('windows:activityFailed',failure);}catch{}
    auxiliaryReady.delete(auxiliaryWebContentsId);
    if(bootstrap.diagnosticRun)auxiliaryFailures.set(auxiliaryWebContentsId,failure);
    else auxiliaryFailures.delete(auxiliaryWebContentsId);
    auxiliaryPendingShow.delete(auxiliaryWebContentsId);
    closeAuxiliaryWindowForReal(win);
  });

  const navigationStartedAtMs=Date.now();
  win.webContents.once('did-finish-load',()=>{
    const profile=auxiliaryStartupProfiles.get(auxiliaryWebContentsId);
    if(profile){profile.main=profile.main||{};profile.main.navigationMs=Date.now()-navigationStartedAtMs;}
  });
  if (!pluginWindow) throw new Error(`Activity ${activityId} has no plugin-owned window contract.`);
  if (payload.prewarm !== true) auxiliaryPendingShow.add(auxiliaryWebContentsId);
  win.loadFile(path.join(APP_ROOT, 'src', 'plugin-window', 'index.html'));
  return { reused:false, dedicated:!!pluginWindow, warming:!!pluginWindow, prewarmed:payload.prewarm === true };
}


  return Object.freeze({
    auxiliaryWindows,auxiliaryBootstrap,auxiliaryReady,auxiliaryFailures,auxiliaryPendingShow,auxiliaryStartupProfiles,pendingAuxiliaryRoleSnapshots,
    auxiliaryWindowKey,removeAuxiliaryWindowReferences,projectSnapshotDigest,makeAuxiliaryBootstrap,hideDedicatedAuxiliaryWindow,closeAuxiliaryWindowForReal,waitForAuxiliaryWindowClosed,
    markAuxiliaryWindowReady,markAuxiliaryWindowFailed,diagnosticRendererLifecycleSnapshot,diagnosticRendererProjectSnapshot,waitForRendererLifecycleContract,waitForAuxiliaryDiagnosticOutcome,
    runDiagnosticActivitySmoke,diagnosticsDirectory,diagnosticEnvironment,requestAuxiliaryRoleSnapshot,wrapAuxiliaryRoleSnapshot,routeArtifactDelta,createOrFocusAuxiliaryWindow
  });
}

module.exports={createAuxiliaryWindowRuntime};
