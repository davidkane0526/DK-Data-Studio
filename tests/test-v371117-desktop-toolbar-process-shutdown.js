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

  const {createShutdownRuntime}=require('../desktop/main-modules/shutdown-runtime');
  const calls=[];
  let quitCount=0,lanResolve,mcpResolve,rejected=false;
  const pending=new Map([['pending',{
    timer:setTimeout(()=>{},1000),
    reject:()=>{rejected=true;}
  }]]);
  pending.get('pending').timer.unref?.();

  const runtime=createShutdownRuntime({
    app:{quit(){quitCount+=1;calls.push('quit');}},
    setAppQuitting:value=>calls.push(`quitting:${value}`),
    closeAllAuxiliaryWindows:()=>calls.push('aux'),
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
  assert.strictEqual(quitCount,0,'Electron must not quit before asynchronous services drain.');

  lanResolve();
  await Promise.resolve();
  assert.strictEqual(quitCount,0,'Electron must still wait while another service is draining.');
  mcpResolve();
  await shutdown;
  await new Promise(resolve=>setImmediate(resolve));

  assert(runtime.isReadyForQuit(),'Shutdown coordinator must publish a final ready state.');
  assert.strictEqual(quitCount,1,'Electron quit must be requested exactly once after all services drain.');
  assert(calls.indexOf('lan-done')<calls.indexOf('quit')&&calls.indexOf('mcp-done')<calls.indexOf('quit'),
    'Service completion must happen before Electron quit.');
  assert(calls.filter(v=>v==='aux').length>=2,'Auxiliary windows must be asserted closed before and after service drain.');

  console.log('v3.71.117 Desktop plugin-manager single-row + coordinated process shutdown PASS');
}

main().catch(error=>{console.error(error);process.exitCode=1;});
