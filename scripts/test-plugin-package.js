const fs=require('fs');
const os=require('os');
const path=require('path');
const {execFileSync}=require('child_process');
const {normalizePluginPackage}=require('../plugin-package');

function assert(c,m){if(!c)throw new Error(m);}

const good=normalizePluginPackage({
  schema:1,
  manifest:{id:'com.example.strong-detector',name:'Strong Detector',version:'1.0.0',apiVersion:'1.2.0',entry:'plugin.js',styles:['style.css']},
  files:{
    'plugin.js':"DKDSPlugins.define({id:'com.example.strong-detector',name:'Strong Detector',version:'1.0.0'},async()=>({}));",
    'style.css':'.strong-detector{}'
  }
});
assert(good.manifest.source==='external','external package must be normalized as external source');
assert(good.manifest.scripts.includes('plugin.js'),'entry must be included in package scripts');
assert(good.manifest.styles[0]==='style.css','package styles must be preserved');

let rejected=false;
try{normalizePluginPackage({schema:1,manifest:{id:'builtin.bad',name:'Bad',version:'1',entry:'plugin.js'},files:{'plugin.js':''}});}catch{rejected=true;}
assert(rejected,'external packages must not claim builtin.* namespace');
rejected=false;
try{normalizePluginPackage({schema:1,manifest:{id:'com.bad',name:'Bad',version:'1',entry:'../bad.js'},files:{'../bad.js':''}});}catch{rejected=true;}
assert(rejected,'package paths must reject traversal');

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-plugin-package-'));
const dir=path.join(tmp,'plugin');fs.mkdirSync(dir);
fs.writeFileSync(path.join(dir,'plugin.json'),JSON.stringify({id:'com.example.test-package',name:'Test package',version:'0.1.0',apiVersion:'1.2.0',entry:'plugin.js'}));
fs.writeFileSync(path.join(dir,'plugin.js'),"DKDSPlugins.define({id:'com.example.test-package',name:'Test package',version:'0.1.0'},async()=>({}));");
const out=path.join(tmp,'test.dkplugin');
execFileSync(process.execPath,[path.join(__dirname,'package-plugin.js'),dir,out],{stdio:'pipe'});
const packed=normalizePluginPackage(JSON.parse(fs.readFileSync(out,'utf8')));
assert(packed.manifest.id==='com.example.test-package'&&packed.files['plugin.js'],'packaging helper must produce installable .dkplugin');
fs.rmSync(tmp,{recursive:true,force:true});

const main=fs.readFileSync(path.join(__dirname,'..','main.js'),'utf8');
const preload=fs.readFileSync(path.join(__dirname,'..','preload.js'),'utf8');
const kernel=fs.readFileSync(path.join(__dirname,'..','src/core/plugin-kernel.js'),'utf8');
const manager=fs.readFileSync(path.join(__dirname,'..','src/core/plugin-manager-ui.js'),'utf8');
assert(main.includes("ipcMain.handle('plugins:installPackage'")&&main.includes("ipcMain.handle('plugins:uninstall'"),'desktop main process must own plugin installation/uninstallation IPC');
assert(preload.includes('pluginInstallPackage')&&preload.includes('pluginExternalList')&&preload.includes('pluginRestorePackage'),'preload must expose external-plugin IPC and rollback without Node access in renderer');
assert(kernel.includes('loadExternalPackage')&&kernel.includes('uninstallExternalPlugin')&&kernel.includes('pluginRestorePackage'),'plugin kernel must dynamically load/unload installed packages and roll back failed updates');
assert(manager.includes('pluginManagerInstallBtn')&&manager.includes('plugin-uninstall-btn'),'plugin manager UI must expose install/uninstall actions');
console.log('External .dkplugin package / installation contracts passed.');
