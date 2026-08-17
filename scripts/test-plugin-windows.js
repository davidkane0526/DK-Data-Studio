const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function fail(message){console.error(`PLUGIN WINDOW ERROR: ${message}`);process.exitCode=2;}
function assert(ok,message){if(!ok)fail(message);}

const shellHtml=read('src/plugin-window/index.html');
const shellRuntime=read('src/plugin-window/runtime.js');
const main=read('main.js');
const manager=read('plugin-window-manager.js');

assert(!shellHtml.includes('../app.js'),'Dedicated plugin window must not load the full src/app.js renderer.');
assert(!shellHtml.includes('plugin-index'),'Dedicated plugin window must not load the full generated plugin index.');
assert(shellHtml.includes('../core/plugin-kernel.js'),'Dedicated shell must load the plugin kernel.');
assert(shellRuntime.includes('loadTargetPlugin'),'Dedicated shell runtime must load only the target plugin.');
assert(main.includes("src', 'plugin-window', 'index.html"),'main.js must route dedicated activities to src/plugin-window/index.html.');
assert(main.includes('resolveBuiltinPluginWindow'),'main.js must resolve plugin-owned window manifests.');
assert(manager.includes('manifest?.window'),'plugin-window-manager must read manifest.window.');

const expected={
  'data-center':['data-center',''],
  'ter-analysis':['ter','window-runtime.js'],
  'pulse-analysis':['pulse','window-runtime.js']
};
for(const [folder,[activity,runtime]] of Object.entries(expected)){
  const manifest=JSON.parse(read(`src/plugins/${folder}/plugin.json`));
  assert(manifest.window?.activity===activity,`${folder}: window.activity must be ${activity}`);
  if(runtime){
    assert(manifest.window?.runtime===runtime,`${folder}: window.runtime must be ${runtime}`);
    assert(fs.existsSync(path.join(root,'src','plugins',folder,runtime)),`${folder}: runtime file missing`);
  }
  assert(Number(manifest.window?.width)>=900,`${folder}: dedicated window width is missing`);
}

for(const rel of [
  'src/plugin-window/runtime.js',
  'src/plugins/pulse-analysis/window-runtime.js',
  'src/plugins/ter-analysis/window-runtime.js',
  'plugin-window-manager.js',
  'main.js'
]){
  try{new vm.Script(read(rel),{filename:rel});}
  catch(err){fail(`${rel}: JavaScript syntax error: ${err.message}`);}
}

assert(fs.existsSync(path.join(root,'tools','windows','package-clean-project.ps1')),'clean project packaging tool is missing.');
assert(read('package.json').includes('plugin-window-manager.js'),'electron-builder files must include plugin-window-manager.js.');

if(process.exitCode)process.exit(process.exitCode);
console.log('Plugin window architecture OK: Data Center / TER / Pulse use dedicated lightweight renderers.');
