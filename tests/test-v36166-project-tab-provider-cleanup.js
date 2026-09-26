const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));


const structure=fs.readFileSync(path.join(root,'src','styles','structure','shell-navigation.css'),'utf8');
const schema=fs.readFileSync(path.join(root,'src','styles','structure','schema-and-plugin-ui.css'),'utf8');
const modern=fs.readFileSync(path.join(root,'src','styles','presentation','shell.css'),'utf8');
const appearance=fs.readFileSync(path.join(root,'src','styles','theme','component-appearance.css'),'utf8');
const tabsRuntime=fs.readFileSync(path.join(root,'src','app','modules','project-tabs-history.js'),'utf8');
assert(structure.includes('.project-tab-close{'),'Project tab close geometry must have an explicit Structure owner.');
assert(schema.includes('.project-tab-close,.dkds-panel-close-button'),'Project tab close must be excluded from the generic 30px button fallback because it owns its compact hit box.');
assert(structure.includes('--dkds-project-tab-close-size:20px'),'Shared project-tab close must retain the accepted 20 px canonical size slot.');
for(const needle of ['width:var(--dkds-project-tab-close-size)','height:var(--dkds-project-tab-close-size)','min-width:var(--dkds-project-tab-close-size)','min-height:var(--dkds-project-tab-close-size)']) assert(structure.includes(needle),`Project tab close slot consumption missing: ${needle}`);
assert(structure.includes('html[data-dkds-host="desktop"] .project-tab-close{')&&structure.includes('--dkds-project-tab-close-size:16px;'),'Desktop host must consume the 20% reduced 16 px project-tab close slot without creating a second rendered-geometry owner.');
assert(appearance.includes('[data-dkds-component-identity="toolbarAction"].project-tab-close{border-radius:5px}'),'Project tab close compact integrated identity must be owned by Component Appearance, not Structure.');
assert(!modern.includes('body.dkds-modern-ui .project-tab-close{')&&!modern.includes('.project-tab-close:hover:not(:disabled)'),'Project tab close paint/state must not return to Presentation.');
assert(tabsRuntime.includes('class="project-tab-close quiet"'),'Project tab close must declare the canonical quiet ToolbarAction variant.');
assert(appearance.includes('[data-dkds-component-identity="toolbarAction"][data-dkds-component-variant="quiet"]')&&appearance.includes('color-mix(in srgb,var(--dkui-control-hover) 62%,transparent)'),'Project tab close hover must resolve through the neutral semantic quiet ToolbarAction appearance.');

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
