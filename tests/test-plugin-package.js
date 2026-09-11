const fs=require('fs');
const os=require('os');
const path=require('path');
const {execFileSync}=require('child_process');
const {normalizePluginPackage}=require('../desktop/plugin-package');

function assert(c,m){if(!c)throw new Error(m);}

const good=normalizePluginPackage({
  schema:1,
  manifest:{id:'com.example.strong-detector',name:'Strong Detector',version:'1.0.0',apiVersion:'1.19.0',entry:'plugin.js',pluginType:'extension',styles:['style.css'],platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}}},
  files:{
    'plugin.js':"DKDSPlugins.define({id:'com.example.strong-detector',name:'Strong Detector',version:'1.0.0'},async()=>({}));",
    'style.css':'.strong-detector{}'
  }
});
assert(!Object.prototype.hasOwnProperty.call(good.manifest,'source'),'Package manifest must contain only current manifest contract fields; install source belongs to the host store.');
assert(good.manifest.scripts.includes('plugin.js'),'entry must be included in package scripts');
assert(good.manifest.styles[0]==='style.css','package styles must be preserved');
assert(good.manifest.platformPresentation?.desktop?.mode==='shared'&&good.manifest.platformPresentation?.mobile?.mode==='adaptive','UI packages must preserve the explicit current platform-presentation contract');
let missingPresentationRejected=false;
try{normalizePluginPackage({schema:1,manifest:{id:'com.example.missing-presentation',name:'Missing Presentation',version:'1.0.0',apiVersion:'1.19.0',entry:'plugin.js',pluginType:'extension',styles:['style.css']},files:{'plugin.js':"DKDSPlugins.define({id:'com.example.missing-presentation',name:'Missing Presentation',version:'1.0.0'},async()=>({}));",'style.css':'.missing{}'}});}catch(error){missingPresentationRejected=/platformPresentation/.test(String(error?.message||error));}
assert(missingPresentationRejected,'current UI packages must be rejected when platformPresentation is omitted');

let rejected=false;
try{normalizePluginPackage({schema:1,manifest:{id:'builtin.bad',name:'Bad',version:'1',entry:'plugin.js'},files:{'plugin.js':''}});}catch{rejected=true;}
assert(rejected,'external packages must not claim builtin.* namespace');
rejected=false;
try{normalizePluginPackage({schema:1,manifest:{id:'com.bad',name:'Bad',version:'1',entry:'../bad.js'},files:{'../bad.js':''}});}catch{rejected=true;}
assert(rejected,'package paths must reject traversal');

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-plugin-package-'));
const dir=path.join(tmp,'plugin');fs.mkdirSync(dir);
fs.writeFileSync(path.join(dir,'plugin.json'),JSON.stringify({id:'com.example.test-package',name:'Test package',version:'0.1.0',apiVersion:'1.19.0',entry:'plugin.js',pluginType:'extension'}));
fs.writeFileSync(path.join(dir,'plugin.js'),"DKDSPlugins.define({id:'com.example.test-package',name:'Test package',version:'0.1.0'},async()=>({}));");
const out=path.join(tmp,'test.dkplugin');
execFileSync(process.execPath,[path.join(__dirname,'..','scripts','package-plugin.js'),dir,out],{stdio:'pipe'});
const packed=normalizePluginPackage(JSON.parse(fs.readFileSync(out,'utf8')));
assert(packed.manifest.id==='com.example.test-package'&&packed.files['plugin.js'],'packaging helper must produce installable .dkplugin');
// Built-in plugins remain protected for normal external installation, but the
// trusted LAN update packager can explicitly create an override package from
// the application-owned src/plugins tree.
const builtinOut=path.join(tmp,'ter-update.dkplugin');
execFileSync(process.execPath,[path.join(__dirname,'..','scripts','package-plugin.js'),'--allow-builtin',path.join(__dirname,'..','src','plugins','ter-analysis'),builtinOut],{stdio:'pipe'});
const builtinPacked=normalizePluginPackage(JSON.parse(fs.readFileSync(builtinOut,'utf8')),{allowBuiltinId:true});
assert(builtinPacked.manifest.id==='builtin.ter-analysis','trusted update packaging must support built-in plugin ids only with --allow-builtin.');

fs.rmSync(tmp,{recursive:true,force:true});

const main=fs.readFileSync(path.join(__dirname,'..','desktop/main.js'),'utf8');
const preload=fs.readFileSync(path.join(__dirname,'..','desktop/preload.js'),'utf8');
const kernel=fs.readFileSync(path.join(__dirname,'..','src/generated/runtime/plugin-kernel.js'),'utf8');
const manager=fs.readFileSync(path.join(__dirname,'..','src/core/plugins/manager-ui.js'),'utf8');
assert(main.includes("ipcMain.handle('plugins:installPackage'")&&main.includes("ipcMain.handle('plugins:uninstall'"),'desktop main process must own plugin installation/uninstallation IPC');
assert(preload.includes('pluginInstallPackage')&&preload.includes('pluginExternalList')&&preload.includes('pluginRestorePackage')&&preload.includes('pluginOverrideList')&&preload.includes('pluginExportPackage'),'preload must expose external-plugin IPC, transactional restore, and trusted built-in override discovery without Node access in renderer');
assert(kernel.includes('loadExternalPackage')&&kernel.includes('loadOverridePackage')&&kernel.includes('uninstallExternalPlugin')&&kernel.includes('pluginRestorePackage'),'plugin kernel must load LAN built-in overrides before packaged built-ins while preserving failed-update transaction recovery.');
assert(kernel.includes('definition.packageSource')&&!kernel.includes('definition.manifest.source'),'Package provenance must live on the host definition, never inside the current Plugin Manifest contract.');
const generatedIndex=fs.readFileSync(path.join(__dirname,'..','src/generated/plugin-index.js'),'utf8');
const indexContext={window:{}};require('vm').runInNewContext(generatedIndex,indexContext);for(const row of indexContext.window.DKDS_BUILTIN_PLUGINS||[]){assert(row.source==='builtin','Generated built-in row must retain host provenance outside manifest.');assert(!Object.prototype.hasOwnProperty.call(row.manifest,'source'),'Generated built-in manifest must remain current-contract clean.');}
assert(manager.includes('pluginManagerInstallBtn')&&manager.includes('plugin-uninstall-btn')&&manager.includes('plugin-export-btn'),'plugin manager UI must expose install/uninstall/export actions');
assert(main.includes("ipcMain.handle('plugins:exportPackage'"),'main process must own plugin export packaging and save-dialog IPC.');
assert(main.includes("ipcMain.handle('plugins:listOverrides'")&&main.includes('installLanPluginPackage'),'main process must own trusted LAN plugin override storage and installation.');
console.log('External / trusted-LAN .dkplugin package contracts passed.');
