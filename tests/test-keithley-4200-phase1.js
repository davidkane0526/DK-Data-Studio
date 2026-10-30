#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const manifest=json('src/plugins/keithley-4200/plugin.json');
const plugin=read('src/plugins/keithley-4200/plugin.js');
const presentation=read('src/plugins/keithley-4200/unit-presentation.js');
const model=read('src/plugins/keithley-4200/measurement-model.js');
const preload=read('desktop/preload.js');
const main=read('desktop/main.js');
const desktopTcp=read('desktop/main-modules/tcp-runtime.js');
const web=read('src/web-bridge.js');
const host=read('src/app/modules/dedicated-plugin-windows.js');
const protocol=read('mobile/src/host/protocol.ts');
const router=read('mobile/src/host/useNativeRequestRouter.ts');
const native=read('mobile/plugins/withDkdsAndroidNativeHost.js');

assert.equal(manifest.id,'com.dkds.keithley-4200');
assert.equal(manifest.apiVersion,'1.19.0');
assert(manifest.requiresCore.includes('services')&&manifest.requiresCore.includes('ui.unit-templates'));
assert(plugin.includes("ctx.services.require('tcp')"),'4200 plugin must consume the generic TCP service.');
assert(plugin.includes("encodeBase64('*IDN?\\0')"),'Phase 1 must send the verified NUL-terminated ID query.');
assert(!/forcev|forcei|measi|measv|output\s*on/i.test(plugin),'Phase 1 plugin must not contain source/measure/output command paths.');
assert(presentation.includes('units.page.create')&&presentation.includes('units.workspace.create')&&presentation.includes('units.field.create')&&presentation.includes('units.scientificPlot.create'),'4200 UI must be Unit-first.');
assert(plugin.includes('commandTail')&&!plugin.includes('retry'),'4200 commands must be serialized without blind retry.');
assert(manifest.scripts.includes('measurement-model.js')&&manifest.scripts.includes('unit-presentation.js'),'4200 must load model and UI before entry.');
assert(plugin.includes("ctx.modules.require('measurement-model')")&&plugin.includes("ctx.modules.require('unit-presentation')"),'4200 requires the dedicated model and UI.');
assert(plugin.includes("encodeBase64('*IDN?\\0')"),'KXCI identity query must remain exact.');
assert(model.includes('executable:false')&&model.includes('hardwareVerified:false'),'Plans must remain non-executable and unverified.');
assert(plugin.includes('Model.createDataset(p,null)')&&model.includes("source:'simulation'"),'Simulation must never masquerade as instrument data.');
assert(presentation.includes('SIMULATION')&&plugin.includes('stopSimulation'),'Simulation must be identifiable and stoppable.');
assert(plugin.includes('ctx.io.saveText')&&plugin.includes('exportCsv')&&plugin.includes('exportJson')&&plugin.includes('exportSvg'),'CSV JSON SVG exports required.');
assert(native.includes('NetworkCapabilities.TRANSPORT_WIFI')&&native.includes('NetworkCapabilities.TRANSPORT_ETHERNET'),'Android network binding must support Wi-Fi and Ethernet.');
assert(router.includes("String(payload.networkMode||'auto')"),'Android routing must pass network-mode selection.');

for(const token of ["tcpOpen: payload => ipcRenderer.invoke('tcp:open'","tcpExchange: payload => ipcRenderer.invoke('tcp:exchange'","tcpClose: payload => ipcRenderer.invoke('tcp:close'"])assert(preload.includes(token),'Desktop preload missing '+token);
for(const token of ["ipcMain.handle('tcp:open'","ipcMain.handle('tcp:exchange'","ipcMain.handle('tcp:close'"])assert(main.includes(token),'Desktop main missing '+token);
assert(desktopTcp.includes("require('net')")&&desktopTcp.includes('late-response contamination'),'Desktop TCP runtime must use raw sockets and fail closed on empty read timeout.');
assert(host.includes('tcp:Object.freeze'),'Core host must publish a generic tcp service.');
for(const token of ["nativeCall('tcpOpen'","nativeCall('tcpExchange'","nativeCall('tcpClose'"])assert(web.includes(token),'Web/mobile bridge missing '+token);
for(const token of ['tcpOpen?:','tcpExchange?:','tcpClose?:'])assert(protocol.includes(token),'Native facade missing '+token);
for(const token of ["req.type === 'tcpOpen'","req.type === 'tcpExchange'","req.type === 'tcpClose'"])assert(router.includes(token),'Native request router missing '+token);
for(const token of ['ConnectivityManager','socketFactory?.createSocket()','interfaceName','android.permission.ACCESS_NETWORK_STATE','@ReactMethod fun tcpOpen','@ReactMethod fun tcpExchange','@ReactMethod fun tcpClose','val requestBytes=Base64.decode','write(requestBytes)'])assert(native.includes(token),'Android TCP Host missing '+token);

console.log('Keithley 4200 Phase 1 architecture/safety contract PASS');
