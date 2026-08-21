'use strict';
const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(value,message){if(!value)throw new Error(message);}

assert(json('package.json').version==='3.61.9','Application version must be v3.61.9.');
assert(json('sdk/contract.json').pluginApiVersion==='1.15.0','Standalone SDK must publish Plugin API 1.15.');
assert(json('sdk/plugin-manifest.schema.json').properties.pluginType.enum.includes('tool'),'SDK manifest schema must expose the tool plugin category.');
assert(json('docs/plugin-manifest.schema.json').properties.pluginType.enum.includes('tool'),'Application manifest schema must accept tool plugins.');

const plotly=read('src/core/scientific-plot-runtime.js');
assert(plotly.includes("addEventListener?.('dblclick'")&&plotly.includes("'yaxis.type':next")&&plotly.includes('displayAxisState={y:null}'),'Plotly ScientificPlot must own Y-axis double-click display-scale switching.');
assert(plotly.includes("next==='log'?'linear':'log'")||plotly.includes("current==='log'?'linear':'log'"),'Plotly display scale must toggle linear/log only.');
const d3surface=read('src/core/ui-infrastructure.js');
assert(d3surface.includes("this.displayYAxisType==='log'?'linear':'log'")&&d3surface.includes('d3.scaleLog()')&&d3surface.includes(".on('dblclick.dkdsyaxis',toggleY)"),'ScientificCurveSurface must provide the same Core-owned Y-axis display toggle.');
assert(d3surface.includes('yDisplayable(value)'),'Log display must hide non-positive geometry without changing source samples.');

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
assert(index.includes('id="dataCenterSystemBtn"'),'Data Management must have a system-commandbar entry.');
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

console.log('v3.61.9 system/tools/display-scale contracts passed.');
