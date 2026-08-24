'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));

assert.equal(json('package.json').version,'3.61.51','ordered modern shell release must be v3.61.27');
const html=read('src/index.html');
const pluginHtml=read('src/plugin-window/index.html');
const css=read('src/ui-modern.css');
const theme=read('src/core/theme-runtime.js');
const charts=read('src/core/chart-runtime.js');
const status=read('src/plugins/status-monitor/plugin.js');
const main=read('main.js');
const web=read('src/web-bridge.js');
const manager=read('src/core/plugin-manager-ui.js');
const kernel=read('src/core/plugin-kernel.js');
const preload=read('preload.js');

assert(html.includes('core/theme-runtime.js'),'main shell must initialize the explicit appearance runtime before app startup');
assert(pluginHtml.includes('../core/theme-runtime.js'),'dedicated plugin windows must use the same appearance runtime');
assert(preload.includes('appearanceGetTheme')&&preload.includes('appearanceSetTheme')&&main.includes("system:getAppearanceTheme")&&main.includes("system:setAppearanceTheme"),'desktop windows must synchronize explicit appearance through the Electron host');
assert(theme.includes("STORAGE_KEY='dkds.appearance.v1'")&&theme.includes('dkds:theme-changed')&&theme.includes("addEventListener?.('storage'"),'appearance selection must persist and synchronize across windows');
assert(charts.includes('window.DKDSTheme?.current?.()')&&charts.includes('refreshRenderedTheme'),'Chart Runtime must follow the application-selected theme and refresh live D3 scientific canvases');

assert(css.includes('body.dkds-modern-ui .topbar{position:relative;z-index:1400')&&css.includes('body.dkds-modern-ui .analysis-page{z-index:500}'),'top command shell must stay above fixed analysis workbenches');
assert(css.includes('body.dkds-modern-ui .command-menu{z-index:1650}'),'top dropdown menus must stay above workbench content');
assert(!css.includes('.js-plotly-plot .plotly .modebar'),'visual system must not style Plotly-generated modebar internals');
assert(css.includes('--dkui-canvas:#eef4fb')&&css.includes('--dkui-border:#d8e5f4')&&css.includes('rgba(91,119,159,.065)'),'light material must follow the supplied cool soft-depth reference without heavy skeuomorphism');
assert(css.includes('button[aria-pressed="true"]')&&css.includes('-webkit-text-fill-color:#164f9f'),'host-owned selected controls must pair selected surfaces with readable text');
assert(css.includes('.toolbar-btn.strong')&&css.includes('button.primary')&&css.includes('color:#fff!important'),'semantic primary commands must keep readable foreground colors over accent surfaces');
assert(css.includes('.plugin-toolbar-btn')&&css.includes('white-space:nowrap'),'command labels must remain atomic and rely on existing overflow/reflow behavior instead of wrapping into collisions');

assert(status.includes("id:'appearance'")&&status.includes('window.DKDSTheme?.toggle?.()'),'status bar must expose a light/dark toggle');
assert(status.includes("id:'dkdsMemoryBreakdownPanel'")&&status.includes('scheduleMemoryHide')&&status.includes('status.components')&&status.includes('ctx.ui.dom.timeout'),'memory status must open an auto-hiding per-component breakdown panel through Core-owned DOM/scheduler lifecycle');
assert(main.includes('const components=metrics.map')&&main.includes('pluginId:renderer?.pluginId'),'desktop runtime status must expose per-process/plugin-window memory components');
assert(web.includes("id:'web:renderer'")&&web.includes('components:[{'),'web runtime status must expose a compatible component-memory row');

assert(html.includes('pluginManagerTypeFilter'),'Plugin Manager must expose a first-class plugin type filter');
assert(manager.includes('plugin-type-badge type-${escapeHtml(typeMeta.id)}'),'Plugin Manager cards must show the plugin type as a first-class tag');
assert(manager.includes("tool:{label:'工具'")||manager.includes("tool: {label:'工具'"),'Plugin Manager must retain a dedicated Tool category');
assert(kernel.includes('function renderToolMenu(rows=activityRows())'),'Tools menu must be rebuilt deterministically from active activity contributions');
assert(kernel.includes("pluginTypeForManifest(definition?.manifest||{})==='tool'&&spec.role==='top'"),'Tool plugins must use the TOP-equivalent workspace contract');
assert(kernel.includes("toolButton.dataset.activityId=spec.id")&&kernel.includes("host?.openActivityWindow?.(spec.id)"),'top Tools menu must open the installed Tool activity window');
console.log('ordered modern shell, appearance, memory and Tool runtime checks passed under v3.61.29.');
