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

  console.log('v3.71.118 Desktop plugin-manager single-row + deterministic process shutdown PASS');
}

main().catch(error=>{console.error(error);process.exitCode=1;});
