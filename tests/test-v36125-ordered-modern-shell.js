'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));


const html=read('src/index.html');
const pluginHtml=read('src/plugin-window/index.html');
const css=readCoreCss(root);
const theme=read('src/core/theme/runtime.js');
const charts=read('src/core/scientific/chart-runtime.js');
const status=read('src/plugins/status-monitor/plugin.js');
const main=read('desktop/main.js');
const web=read('src/web-bridge.js');
const manager=read('src/core/plugins/manager-ui.js');
const kernel=read('src/generated/runtime/plugin-kernel.js');
const presenters=read('src/core/ui/modules/presentation/presenters.js');
const desktopShell=read('src/core/ui/modules/presentation/desktop-shell.js');
const activityShell=read('src/core/plugins/kernel/modules/activity/shell.js');
const preload=read('desktop/preload.js');

assert(html.includes('core/theme/runtime.js'),'main shell must initialize the explicit appearance runtime before app startup');
assert(pluginHtml.includes('../core/theme/runtime.js'),'dedicated plugin windows must use the same appearance runtime');
assert(preload.includes('appearanceGetTheme')&&preload.includes('appearanceSetTheme')&&main.includes("system:getAppearanceTheme")&&main.includes("system:setAppearanceTheme"),'desktop windows must synchronize explicit appearance through the Electron host');
assert(theme.includes("STORAGE_KEY='dkds.appearance.v1'")&&theme.includes('dkds:theme-changed')&&theme.includes("addEventListener?.('storage'"),'appearance selection must persist and synchronize across windows');
assert(charts.includes('window.DKDSTheme?.current?.()')&&charts.includes('refreshRenderedTheme'),'Chart Runtime must follow the application-selected theme and refresh live D3 scientific canvases');

assert(css.includes('body.dkds-modern-ui .topbar{position:relative;z-index:1400')&&/\.analysis-page\s*\{[^}]*z-index\s*:\s*500/.test(css),'top command shell must stay above fixed analysis workbenches');
assert(/\.command-menu\s*\{[^}]*z-index\s*:\s*1650/.test(css),'top dropdown menus must stay above workbench content');
assert(!css.includes('.js-plotly-plot .plotly .modebar'),'visual system must not style Plotly-generated modebar internals');
assert(css.includes('--dkui-canvas:#eef4fb')&&css.includes('--dkui-border:#d8e5f4')&&css.includes('rgba(91,119,159,.065)'),'light material must follow the supplied cool soft-depth reference without heavy skeuomorphism');
assert(css.includes('[data-dkds-component-identity="toolbarAction"]:is(.active,[aria-pressed="true"])')&&css.includes('--dkds-ca-action-surface-active')&&css.includes('--dkds-ca-action-text-active'),'host-owned selected controls must derive state paint from canonical Component Appearance slots.');
assert(css.includes('[data-dkds-component-identity="toolbarAction"][data-dkds-component-variant="primary"]')&&css.includes('--dkui-component-toolbar-action-variant-primary-text,#fff'),'semantic primary commands must keep readable foreground colors through the canonical primary variant.');
assert(css.includes('.plugin-toolbar-btn')&&css.includes('white-space:nowrap'),'command labels must remain atomic and rely on existing overflow/reflow behavior instead of wrapping into collisions');

assert(status.includes("id:'theme'")&&status.includes('dkdsThemePanel')&&status.includes('window.DKDSTheme?.setProfile?.')&&status.includes('window.DKDSTheme?.set?.'),'status bar must expose the integrated Theme picker instead of a standalone light/dark toggle');
assert(status.includes("id:'dkdsMemoryBreakdownPanel'")&&status.includes('scheduleMemoryHide')&&status.includes('status.components')&&status.includes('ctx.ui.dom.timeout'),'memory status must open an auto-hiding per-component breakdown panel through Core-owned DOM/scheduler lifecycle');
assert(main.includes('const components=metrics.map')&&main.includes('pluginId:renderer?.pluginId'),'desktop runtime status must expose per-process/plugin-window memory components');
assert(web.includes("id:'web:renderer'")&&web.includes('components:[{'),'web runtime status must expose a compatible component-memory row');

assert(html.includes('pluginManagerTypeFilter'),'Plugin Manager must expose a first-class plugin type filter');
assert(manager.includes('plugin-type-badge type-${escapeHtml(typeMeta.id)}'),'Plugin Manager cards must show the plugin type as a first-class tag');
assert(manager.includes("tool:{label:'工具'")||manager.includes("tool: {label:'工具'"),'Plugin Manager must retain a dedicated Tool category');
assert(activityShell.includes('state.host?.renderActivityNavigation'),'Activity/Tools chrome must be rebuilt through the host Presentation renderer.');
assert(presenters.includes("workspace.pluginType==='tool'")&&presenters.includes("workspace.role==='top'"),'Desktop Presenter must retain the TOP-equivalent Tool Workspace classification.');
assert(desktopShell.includes('snapshot.navigation.tools')&&desktopShell.includes('activityId:item.activityId'),'Desktop Presentation Shell must render Tool openers and route them through shared activity navigation.');
console.log('ordered modern shell, appearance, memory and Tool runtime checks passed.');
