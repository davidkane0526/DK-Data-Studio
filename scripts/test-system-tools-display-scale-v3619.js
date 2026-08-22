'use strict';
const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(value,message){if(!value)throw new Error(message);}

assert(json('package.json').version==='3.61.13','Application version must be v3.61.13.');
assert(json('sdk/contract.json').pluginApiVersion==='1.15.0','Standalone SDK must publish Plugin API 1.15.');
assert(json('sdk/plugin-manifest.schema.json').properties.pluginType.enum.includes('tool'),'SDK manifest schema must expose the tool plugin category.');
assert(json('docs/plugin-manifest.schema.json').properties.pluginType.enum.includes('tool'),'Application manifest schema must accept tool plugins.');

const chartRuntime=read('src/core/chart-runtime.js');
assert(chartRuntime.includes('displayScaleStates')&&chartRuntime.includes('toggleYAxisDisplay')&&chartRuntime.includes("el.addEventListener?.('dblclick',state.handler,true)"),'Base chart runtime must own Plotly Y-axis/left-label double-click display-scale switching for every managed Plotly chart.');
assert(chartRuntime.includes('Math.abs(n)')&&chartRuntime.includes("next.y=trace.y.map(absNumber)"),'Plotly logarithmic display must use |Y| display values while leaving source trace arrays untouched.');
assert(chartRuntime.includes("trace.type")||chartRuntime.includes('Array.isArray(trace.y)'),'Display-scale projection must be trace-generic so scalar fields/heatmaps and ordinary XY charts share the same Core path.');
const plotly=read('src/core/scientific-plot-runtime.js');
assert(plotly.includes('this.chart?.toggleYAxisDisplay?.(this.target)'),'ScientificPlot must delegate scale switching to the base chart runtime instead of owning a resonance-specific implementation.');
const d3surface=read('src/core/ui-infrastructure.js');
assert(d3surface.includes("this.displayYAxisType==='log'?'linear':'log'")&&d3surface.includes('d3.scaleLog()')&&d3surface.includes('dkds-scientific-y-axis-hit'),'ScientificCurveSurface must provide the same Core-owned Y-axis/left-label display toggle.');
assert(d3surface.includes("Math.abs(n)")&&d3surface.includes('yDisplayValue(value)'),'D3 logarithmic display must use |Y| without mutating the source samples.');

const kernel=read('src/core/plugin-kernel.js');
assert(kernel.includes("tool:'⌁'")&&kernel.includes("defaultMenu=pluginTypeForManifest(definition?.manifest||{})==='tool'?'tools':'export'"),'Core must provide tool defaults and route tool contributions to the Tools menu.');
assert(kernel.includes('isSystemLockedDefinition')&&kernel.includes('系统与基座插件是应用运行所必需的，不能停用'),'Core must enforce non-disableable built-in system/foundation plugins.');
assert(kernel.includes("String(row.value?.navigation||'')!=='system'"),'System activities must be separable from ordinary plugin activity navigation.');

const manager=read('src/core/plugin-manager-ui.js');
assert(manager.includes("tool:{label:'工具'")&&manager.includes("'tool'"),'Plugin Manager must render a Tools category.');
assert(manager.includes('plugin-export-btn')&&manager.includes('DKDSPlugins.external.export'),'Plugin Manager must expose plugin package export.');
assert(manager.includes("plugin.systemLocked?'系统功能由基座管理，不能停用'")&&manager.includes("busy||plugin.isSuper||plugin.systemLocked"),'System lock must be represented by the existing disabled enable switch.');
assert(manager.includes('plugin.systemLocked')&&manager.includes("<span class=\"plugin-role-badge system\">系统</span>"),'System plugins must be visibly identified rather than presented as ordinary TOP/SUPER plugins.');

const index=read('src/index.html');
assert(index.includes('id="toolsMenuBtn"')&&index.includes('data-plugin-menu="tools"'),'Top command bar must own the Tools dropdown.');
assert(index.includes('class="system-core-tools-group"')&&index.includes('id="dataCenterSystemBtn"'),'Data Management and Tools must share one system-command visual group.');
const dc=json('src/plugins/data-center/plugin.json');
assert(dc.pluginType==='foundation'&&dc.systemCritical===true,'Data Center must be classified as a required system/foundation plugin.');
assert(read('src/plugins/data-center/feature-runtime.js').includes("navigation:'system'"),'Data Center must stay out of the ordinary plugin activity strip.');

const main=read('main.js'),preload=read('preload.js');
assert(main.includes("ipcMain.handle('plugins:exportPackage'")&&preload.includes('pluginExportPackage'),'Desktop host must support exporting installed plugin packages.');

const sdkReadme=read('sdk/README.md'),toolGuide=read('sdk/TOOL_PLUGINS.md');
assert(sdkReadme.includes('Algorithm plugins')&&sdkReadme.includes('ctx.analysis.algorithms.register'),'SDK must document first-class algorithm plugins.');
assert(toolGuide.includes('pluginType: "tool"')||toolGuide.includes('pluginType: `tool`')||toolGuide.includes('"pluginType": "tool"'),'SDK must ship a dedicated tool-plugin guide.');
execFileSync(process.execPath,[path.join(root,'sdk/tools/dkds-plugin.js'),'validate',path.join(root,'sdk/templates/tool-plugin')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'sdk/tools/dkds-plugin.js'),'validate',path.join(root,'sdk/templates/algorithm-provider')],{stdio:'pipe'});

console.log('v3.61.12 system/tools/universal-display-scale contracts passed.');
