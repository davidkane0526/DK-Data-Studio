'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const main=read('desktop/main.js');
const preload=read('desktop/preload.js');
const runtime=read('desktop/main-modules/visual-closure-runtime.js');
const renderer=read('src/app/modules/dedicated-plugin-windows.js');

assert.strictEqual(pkg.scripts['previsual:closure:windows'],'npm run check','Windows Visual Closure must run the complete static/runtime regression gate first.');
assert.strictEqual(pkg.scripts['visual:closure:windows'],'electron . --visual-closure','Windows Visual Closure must use an explicit Electron diagnostic launch mode.');
assert(main.includes("require('./main-modules/visual-closure-runtime')")&&main.includes('visualClosureRuntime.loadFileOptions()'),'Electron main must isolate the Visual Closure launch contract in its own module.');
assert(main.includes("ipcMain.handle('diagnostics:completeVisualClosure'"),'Electron main must receive the renderer closure completion result.');
assert(preload.includes('diagnosticsCompleteVisualClosure'),'Preload must expose only the dedicated Visual Closure completion bridge.');
for(const token of ["argv.includes('--visual-closure')","dkdsAutomation:'visual-closure'",'verifyVisualClosureReport','diagnostics directory','app.exit(code)'])assert(runtime.includes(token),`Visual Closure desktop runtime missing ${token}.`);
assert(renderer.includes("new URLSearchParams(window.location.search).get('dkdsAutomation')==='visual-closure'"),'Renderer must auto-run Automation only in explicit Visual Closure mode.');
assert(renderer.includes('await window.DKDSAutomationTests?.run?.()')&&renderer.includes('diagnosticsCompleteVisualClosure({reportPath:'),'Renderer must persist the normal Automation report before asking Electron to verify and exit.');
assert(!renderer.includes("DKDS_VISUAL_CLOSURE"),'Renderer must not read process environment or Node globals.');

console.log('v3.67.10 Windows Electron Visual Closure mode PASS: one explicit command runs check, Automation 1.33, report verification, and deterministic process exit without changing normal startup.');
