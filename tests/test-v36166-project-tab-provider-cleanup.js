const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.strictEqual(pkg.version,'3.61.88');

const modern=fs.readFileSync(path.join(root,'src','styles','presentation','control-status.css'),'utf8');
assert(modern.includes('body.dkds-modern-ui .project-tab-close{'),'Project tab close must have an explicit Core icon-action rule.');
for(const needle of [
  'width:24px',
  'height:24px',
  'min-width:24px',
  'min-height:24px',
  'border-radius:50%',
  'background:transparent',
  'box-shadow:none'
]) assert(modern.includes(needle),`Project tab close rule missing: ${needle}`);
assert(modern.includes('.project-tab-close:hover:not(:disabled)'), 'Project tab close must own its hover state.');
assert(modern.includes('color-mix(in srgb,var(--dkui-text'), 'Project tab close hover must use a neutral semantic tint.');

const manager=require(path.join(root,'desktop','plugin-window-manager.js'));
const vth=manager.resolveBuiltinPluginWindow(root,'transfer-vth-lab');
assert(vth,'Vth dedicated TOP window spec is missing.');
assert.strictEqual(vth.algorithmProvider,true,'Vth TOP must preserve its algorithmProvider identity in the window spec.');
assert(vth.selfAlgorithmProvider,'Vth TOP must expose self Algorithm Provider metadata without re-loading its own plugin entry.');
assert.strictEqual(vth.selfAlgorithmProvider.pluginId,'com.dkds.transfer-vth-lab');
assert(vth.selfAlgorithmProvider.algorithmCategories.includes('transfer-curve'));
assert(!(vth.algorithmProviders||[]).some(row=>row.pluginId==='com.dkds.transfer-vth-lab'),'Self provider must not be injected as a second plugin script.');

const runtime=fs.readFileSync(path.join(root,'src','plugin-window','runtime.js'),'utf8');
assert(runtime.includes('if(spec.selfAlgorithmProvider){'),'Dedicated renderer must validate/report the target plugin own Algorithm Provider.');
assert(runtime.includes('startupProfile.algorithmProviders.unshift'),'Self Algorithm Provider must be included in startup profiling.');

const main=fs.readFileSync(path.join(root,'desktop','main.js'),'utf8');
assert(!main.includes('ProjectExitForensics'),'Temporary exit forensics must be removed from the production main process.');
assert(!main.includes('temporaryExitForensics'),'Temporary exit-forensics diagnostics must no longer be exposed.');
assert(!fs.existsSync(path.join(root,'desktop','project-exit-forensics.js')),'Temporary project-exit-forensics.js must be removed.');
assert(!fs.existsSync(path.join(root,'desktop','project-exit-watchdog.js')),'Temporary project-exit-watchdog.js must be removed.');
assert(main.includes("projectFileSafety?.prepareForQuit('app-before-quit')"),'Permanent project-file safety must remain after temporary monitoring is removed.');

console.log('v3.61.66 project-tab + local-provider + temporary-monitor cleanup regression passed.');
