'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const read=rel=>fs.readFileSync(path.join(__dirname,'..',rel),'utf8');

const html=read('src/plugin-window/index.html');
const css=read('src/plugin-window/style.css');
const runtime=read('src/plugin-window/runtime.js');
const chrome=read('src/plugin-window/chrome.js');

// The Core-owned titlebar and window controls are permanent host chrome. A plugin
// startup failure may replace the workspace surface, never the window chrome.
for(const id of ['pluginWindowTitlebar','pluginWindowTitle','pluginWindowMinimizeBtn','pluginWindowMaximizeBtn','pluginWindowCloseBtn','pluginWindowError','statusBar']){
  assert(html.includes(`id="${id}"`),`missing dedicated-window host chrome node: ${id}`);
}
assert(html.indexOf('pluginWindowTitlebar')<html.indexOf('pluginWindowError'),'error surface must remain a sibling below the permanent Core titlebar.');
assert(html.includes('DK Data Studio · 插件窗口'),'dedicated window must retain a useful fallback title before plugin activation succeeds.');

// Error UI must occupy only the workspace tracks. The old fixed inset started at
// viewport y=0 and therefore painted over the title/minimize/maximize/close row.
assert(/\.plugin-window-error\{[^}]*grid-column:1\s*\/\s*-1;[^}]*grid-row:3\s*\/\s*6;[^}]*position:relative;[^}]*inset:auto;/s.test(css),
  'startup error surface must be constrained to the dedicated-window workspace grid tracks.');
assert(!/\.plugin-window-error\{[^}]*position:fixed;[^}]*inset:0\s+0\s+28px\s+0;/s.test(css),
  'startup error surface must never return to a viewport-fixed overlay that covers Core chrome.');
assert(/\.plugin-window-titlebar\{[^}]*grid-area:title[^}]*z-index:1300/s.test(css),'Core titlebar must keep its explicit host-owned grid track.');
assert(/\.plugin-window-status\{[^}]*grid-area:status[^}]*position:relative/s.test(css),'status bar must remain outside the startup-error workspace overlay.');

// Configure title as soon as bootstrap is known, before waiting for plugin/runtime
// activation. This keeps the plugin name/version visible even when later startup fails.
const configure=runtime.indexOf('DKDSPluginWindowChrome?.configure?.(bootstrap);');
const chromeReady=runtime.indexOf("measure('window-chrome-ready'");
const loadTarget=runtime.indexOf('await loadTargetPlugin();');
assert(configure>=0&&chromeReady>configure&&loadTarget>chromeReady,'dedicated title must be configured before runtime readiness/plugin activation can fail.');

// Startup error handling may expose the error surface and status only; it must not
// replace body/titlebar DOM or disable Core window controls.
const showStart=runtime.indexOf('function showStartupError(err)');
const showEnd=runtime.indexOf('\n  function loadScript',showStart);
const showBlock=runtime.slice(showStart,showEnd);
assert(showBlock.includes("document.body.dataset.dkdsPluginStartup='error'"),'startup failure must expose a host-visible error state.');
for(const forbidden of ['document.body.innerHTML','document.documentElement.innerHTML','replaceChildren(','pluginWindowTitlebar.classList.add(\'hidden\')','pluginWindowCommandbar.classList.add(\'hidden\')']){
  assert(!showBlock.includes(forbidden),`startup error handler must not destroy/hide Core chrome: ${forbidden}`);
}

// Window-control IPC binding is initialized by chrome.js itself, independently of
// plugin activation/runtime success.
const bind=chrome.indexOf('const controlsReady=bindWindowControls()');
const configureFn=chrome.indexOf('function configure(bootstrap={})');
assert(bind>=0&&configureFn>bind,'window controls must bind independently before plugin-specific title/action configuration.');
for(const ipc of ['minimizeCurrentWindow','toggleMaximizeCurrentWindow','closeCurrentWindow'])assert(chrome.includes(ipc),`missing dedicated window control IPC: ${ipc}`);

console.log('v3.70.3 dedicated plugin-window failure chrome survival PASS');
