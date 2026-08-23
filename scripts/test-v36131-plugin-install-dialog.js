const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const pkg=json('package.json');
const sdk=json('sdk/contract.json');
const main=read('main.js');
const preload=read('preload.js');
const kernel=read('src/core/plugin-kernel.js');
const manager=read('src/core/plugin-manager-ui.js');
const ui=read('src/core/ui-infrastructure.js');
const css=read('src/style.css')+'\n'+read('src/ui-modern.css');
const coreContract=read('src/core/plugin-contract-runtime.js');
const apiTypes=read('sdk/plugin-api.d.ts');
const sdkTool=read('sdk/tools/dkds-plugin.js');
const manifestSchema=json('sdk/plugin-manifest.schema.json');
const Catalog=require(path.join(root,'algorithm-package-catalog.js'));

assert.equal(pkg.version,'3.61.34','v3.61.32 source version must be synchronized.');
assert.equal(sdk.pluginApiVersion,'1.17.0','Plugin SDK contract must remain API 1.16.0.');
assert(main.includes("const PluginSdkContract = require('./sdk/contract.json');"),'Electron installer must consume the published SDK contract.');
assert(main.includes("const PLUGIN_API_VERSION=String(PluginSdkContract.pluginApiVersion||'').trim();"),'Electron installer must derive its current Plugin API from sdk/contract.json.');
assert(!main.includes("PLUGIN_API_VERSION='1.15.0'"),'Stale installer Plugin API 1.15 constant must not return.');
assert(pkg.build.files.includes('sdk/contract.json'),'Packaged application must include the SDK compatibility contract used by main.js.');

const compatibility=Catalog.compatibility({
  id:'com.dkds.tools.pulse-sampler',version:'1.0.4',apiVersion:'1.16.0',pluginType:'tool',
  compatibility:{app:'>=3.61.29 <4.0.0',pluginApi:'^1.16.0'}
},{appVersion:pkg.version,pluginApiVersion:sdk.pluginApiVersion,installedVersions:new Map()});
assert.equal(compatibility.compatible,true,'A Plugin API ^1.16.0 package targeting app >=3.61.29 must install on v3.61.31.');

for(const token of ["ipcMain.handle('plugins:selectPackage'","ipcMain.handle('plugins:cancelInstall'","ipcMain.handle('plugins:installPackage'"])
  assert(main.includes(token),`Two-stage plugin install IPC missing ${token}`);
assert(!main.includes('dialog.showMessageBox('),'Plugin install/update confirmation must not use Electron native message boxes.');
assert(preload.includes('pluginSelectPackage:')&&preload.includes('pluginCancelInstall:')&&preload.includes("pluginInstallPackage: token"),'Preload must expose the two-stage install transaction.');
assert(kernel.includes('window.DKDSUI?.dialogs')&&kernel.includes("dialogs.confirm({")&&kernel.includes('pluginInstallRendererError'),'Plugin install must use the Core renderer-owned confirmation dialog and structured errors.');
assert(manager.includes('showPluginInstallFailure')&&manager.includes('dialogs?.alert'),'Blocking install failures must open a Core modal instead of status-only notification.');
assert(!manager.includes('window.confirm(')&&!manager.includes('window.prompt('),'Plugin Manager must use DKDS-owned dialogs instead of browser-native confirm/prompt UI.');
assert(ui.includes('class DialogService')&&ui.includes("dialogs:{show:spec=>dialogService.show(spec)")&&ui.includes('prompt:spec=>dialogService.prompt(spec)'),'Core UI Infrastructure must own reusable alert/confirm/prompt dialogs.');
for(const cls of ['.dkds-dialog-overlay','.dkds-dialog{','.dkds-dialog-meta','.dkds-dialog-action.primary'])assert(css.includes(cls),`Core dialog visual contract missing ${cls}`);
assert(coreContract.includes("'ui.dialogs':api=>!!api?.ui?.dialogs")&&kernel.includes('dialogs: window.DKDSUI?.dialogs || null'),'Plugin Context must expose the Core Dialog Runtime as ui.dialogs.');
assert(manifestSchema.properties.requiresCore.items.enum.includes('ui.dialogs'),'SDK manifest schema must allow declaring ui.dialogs.');
assert(apiTypes.includes('export interface DKDSDialogRuntime')&&apiTypes.includes('dialogs:DKDSDialogRuntime'),'SDK types must describe the Core Dialog Runtime.');
assert(sdkTool.includes('native browser dialog (use ctx.ui.dialogs)'),'SDK validator must reject plugin-owned browser-native dialogs.');
console.log('v3.61.31 plugin compatibility + Core modal regression passed.');
