'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

async function main(){
  const css=read('src/styles/structure/schema-and-plugin-ui.css');
  assert(
    css.includes('grid-template-columns:minmax(0,1fr) auto auto auto auto auto;'),
    'Desktop Plugin Manager toolbar must expose six single-row slots: search, status, type and three actions.'
  );
  assert(
    /\.plugin-manager-toolbar-card>button\{[\s\S]*?white-space:nowrap;/.test(css),
    'Desktop Plugin Manager toolbar actions must not wrap their labels.'
  );

  const desktopMain=read('desktop/main.js');
  assert(
    desktopMain.includes("const { createShutdownRuntime } = require('./main-modules/shutdown-runtime');") &&
    desktopMain.includes("shutdownRuntime.requestQuit('primary-window-close')") &&
    desktopMain.includes("app.on('before-quit', event => shutdownRuntime.beforeQuit(event));"),
    'Desktop lifetime must be owned by the shared shutdown coordinator.'
  );
  assert(
    !desktopMain.includes("try { lanWebServer?.stop(false); }") &&
    !desktopMain.includes("try { mcpServer?.stop?.(); }"),
    'before-quit must not fire-and-forget asynchronous server shutdown.'
  );

  assert(
    desktopMain.includes("if(win===primaryWindow){shutdownRuntime.requestQuit('primary-window-command');return true;}"),
    'The renderer titlebar close command for the primary window must enter the application shutdown coordinator directly instead of round-tripping through BrowserWindow.close().'
  );

  const lan=read('desktop/lan-web-server.js');
  const mcp=read('services/mcp-server.js');
  assert(
    lan.includes('server.closeIdleConnections?.();') && lan.includes('server.closeAllConnections?.();'),
    'LAN Web shutdown must close keep-alive and active HTTP connections.'
  );
  assert(
    mcp.includes('server.closeIdleConnections?.();') && mcp.includes('server.closeAllConnections?.();'),
    'MCP shutdown must close keep-alive and active HTTP connections.'
  );

  const smb=read('services/smb-service.js');
  assert(
    smb.includes('const activeSmbChildren = new Set();') &&
    smb.includes('function spawnSmbChild(') &&
    smb.includes('for (const child of [...activeSmbChildren])') &&
    smb.includes('if (!child.killed) child.kill()'),
    'SMB child processes must be application-owned and terminated during shutdown.'
  );


  const shutdownSource=read('desktop/main-modules/shutdown-runtime.js');
  const auxiliarySource=read('desktop/main-modules/auxiliary-window-runtime.js');
  const updaterSource=read('desktop/update-client.js');
  const discoverySource=read('desktop/lan-discovery-service.js');
  const workflowSource=read('.github/workflows/build-windows.yml');
  const packagedShutdownScript=read('tools/windows/test-packaged-shutdown.ps1');
  assert(
    shutdownSource.includes("if(typeof app?.exit==='function')app.exit(0)") &&
    !shutdownSource.includes("queueMicrotask(()=>app?.quit?.())"),
    'After owned resources drain, Desktop shutdown must commit through app.exit(0), not re-enter the cancellable window-close chain.'
  );
  assert(
    auxiliarySource.includes('async function drainAllAuxiliaryWindows') &&
    auxiliarySource.includes('const closed=await Promise.all(waits);'),
    'Desktop shutdown must wait for every auxiliary BrowserWindow to actually close.'
  );
  assert(
    updaterSource.includes('async stop()') &&
    updaterSource.includes('this.closeWebSocket(true);') &&
    updaterSource.includes("socket.once('close',done);"),
    'LAN updater shutdown must await UDP close and terminate its WebSocket transport.'
  );
  assert(
    discoverySource.includes('await Promise.all([closeSocket(ssdp),closeSocket(mdns)]);'),
    'LAN discovery shutdown must await both SSDP and mDNS sockets.'
  );

  assert(
    shutdownSource.includes('drainTimeoutMs=1800') &&
    shutdownSource.includes('Shutdown drain deadline exceeded') &&
    shutdownSource.includes("safeCall('auxiliary-windows-final',drainAuxiliaryWindows,Math.min(750,drainTimeoutMs))"),
    'Desktop shutdown must have a bounded drain deadline so one stuck resource can never keep the process alive forever.'
  );
  assert(
    updaterSource.includes('this.shuttingDown = true;') &&
    updaterSource.includes('if(this.shuttingDown||!this.networkActive)return;') &&
    updaterSource.includes('if(this.shuttingDown||!this.networkActive)return false;'),
    'LAN updater must not resurrect network transports after shutdown begins.'
  );
  assert(
    discoverySource.includes('this.lifecycleEpoch=0;') &&
    discoverySource.includes('async startSsdp(epoch=this.lifecycleEpoch)') &&
    discoverySource.includes('async startMdns(epoch=this.lifecycleEpoch)') &&
    discoverySource.includes('this.lifecycleEpoch+=1;'),
    'LAN discovery must invalidate in-flight restart generations during shutdown.'
  );

  assert(
    desktopMain.includes("process.argv.includes('--dkds-window-command-close-smoke')") &&
    desktopMain.includes("window.electronAPI.closeCurrentWindow()"),
    'Windows CI must drive the exact renderer closeCurrentWindow titlebar path after the packaged main window finishes loading.'
  );
  assert(
    workflowSource.includes('Verify packaged Desktop process tree exits') &&
    workflowSource.includes('test-packaged-shutdown.ps1') &&
    workflowSource.includes('-CommandCloseSmoke') &&
    packagedShutdownScript.includes('CloseMainWindow()') &&
    packagedShutdownScript.includes('CommandCloseSmoke') &&
    packagedShutdownScript.includes('Residual process tree after normal main-window close:'),
    'Windows CI must exercise the packaged EXE normal-close path and fail on any residual process tree.'
  );

  const {createShutdownRuntime}=require('../desktop/main-modules/shutdown-runtime');
  const calls=[];
  let exitCount=0,lanResolve,mcpResolve,rejected=false;
  const pending=new Map([['pending',{
    timer:setTimeout(()=>{},1000),
    reject:()=>{rejected=true;}
  }]]);
  pending.get('pending').timer.unref?.();

  const runtime=createShutdownRuntime({
    app:{exit(code){assert.strictEqual(code,0);exitCount+=1;calls.push('exit');}},
    setAppQuitting:value=>calls.push(`quitting:${value}`),
    drainAuxiliaryWindows:async()=>{calls.push('aux-start');await Promise.resolve();calls.push('aux-done');},
    prepareProjectSafety:reason=>calls.push(`safety:${reason}`),
    stopLanUpdater:()=>calls.push('updater'),
    stopLanWebServer:()=>new Promise(resolve=>{calls.push('lan-start');lanResolve=()=>{calls.push('lan-done');resolve();};}),
    stopMcpServer:()=>new Promise(resolve=>{calls.push('mcp-start');mcpResolve=()=>{calls.push('mcp-done');resolve();};}),
    shutdownSmbSessions:()=>calls.push('smb'),
    pendingRequestMaps:[pending],
    logger:{error(){}}
  });

  const shutdown=runtime.requestQuit('test-close');
  await Promise.resolve();
  assert(runtime.isShuttingDown(),'Shutdown coordinator must enter one shared in-flight lifecycle.');
  assert.strictEqual(pending.size,0,'Pending host requests must be cleared during shutdown.');
  assert(rejected,'Pending host requests must be rejected during shutdown.');
  assert.strictEqual(exitCount,0,'Electron must not exit before asynchronous services drain.');

  lanResolve();
  await Promise.resolve();
  assert.strictEqual(exitCount,0,'Electron must still wait while another service is draining.');
  mcpResolve();
  await shutdown;
  await new Promise(resolve=>setImmediate(resolve));

  assert(runtime.isReadyForQuit(),'Shutdown coordinator must publish a final ready state.');
  assert.strictEqual(exitCount,1,'Electron exit must be committed exactly once after all services drain.');
  assert(calls.indexOf('lan-done')<calls.indexOf('exit')&&calls.indexOf('mcp-done')<calls.indexOf('exit'),
    'Service completion must happen before Electron exit.');
  assert(calls.filter(v=>v==='aux-done').length>=2,'Auxiliary windows must be fully drained before and after service shutdown.');

  let deadlineExitCount=0;
  const deadlineRuntime=createShutdownRuntime({
    app:{exit(){deadlineExitCount+=1;}},
    drainAuxiliaryWindows:()=>new Promise(()=>{}),
    stopLanUpdater:()=>new Promise(()=>{}),
    stopLanWebServer:()=>new Promise(()=>{}),
    stopMcpServer:()=>new Promise(()=>{}),
    drainTimeoutMs:20,
    logger:{error(){}}
  });
  const started=Date.now();
  await deadlineRuntime.requestQuit('deadline-regression');
  await new Promise(resolve=>setImmediate(resolve));
  assert.strictEqual(deadlineExitCount,1,'A permanently stuck shutdown resource must not prevent the final Electron exit.');
  assert(Date.now()-started<250,'Bounded shutdown must not inherit the lifetime of a never-resolving resource.');

  console.log('v3.71.120 Desktop renderer-titlebar + packaged process-tree shutdown PASS');
}

main().catch(error=>{console.error(error);process.exitCode=1;});
