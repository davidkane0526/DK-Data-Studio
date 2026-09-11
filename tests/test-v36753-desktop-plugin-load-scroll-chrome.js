'use strict';
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number);const b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.67.53'),'v3.67.53+ source required.');

// Desktop Resonance loader: the declared support script must exist, index
// generation must validate declared JS assets, and Electron gets a safe
// host-source fallback if Chromium file/resource loading fails.
assert(fs.existsSync(path.join(root,'src/plugins/resonance-workbench/feature-selection-runtime.js')),'Resonance feature-selection runtime must be present in the clean source.');
const resonance=json('src/plugins/resonance-workbench/plugin.json');
assert((resonance.scripts||[]).includes('feature-selection-runtime.js'));
assert((resonance.window?.scripts||[]).includes('feature-selection-runtime.js'));
const generator=read('scripts/generate-plugin-index.js');
assert(generator.includes('Built-in plugin script missing: ${name}/${file}'));
assert(generator.includes('Built-in plugin platform script missing: ${name}/${file}'));
const preload=read('desktop/preload.js');
const main=read('desktop/main.js');
const runtime=read('src/core/plugins/kernel/modules/package-runtime.js');
assert(preload.includes("pluginReadBuiltinScript: src => ipcRenderer.invoke('plugins:readBuiltinScript'"));
assert(main.includes("ipcMain.handle('plugins:readBuiltinScript'"));
assert(main.includes("/^plugins\\/[A-Za-z0-9._-]+\\/[A-Za-z0-9._-]+\\.js$/.test(src)"));
assert(runtime.includes('window.electronAPI?.pluginReadBuiltinScript'));
assert(runtime.includes('loadInlinePluginScript(payload.text,`builtin/${builtinPath}`)'));

// Desktop scientific floating tools are owned by one platform-level geometry
// contract. Exact dimensions may evolve in later patches; this historical test
// only protects the ownership split from the independent Mobile 25 x 24 target.
const touch=read('src/styles/platform/touch.css');
const mobile=read('src/styles/platform/native-client-shell.css');
assert(touch.includes('html[data-dkds-host="desktop"] .dkds-scientific-nav-tools'));
assert(touch.includes('--dkds-scientific-nav-item-width:'));
assert(touch.includes('--dkds-scientific-nav-item-height:'));
assert(mobile.includes('html[data-dkds-host="mobile"].react-native-client .dkds-scientific-nav-tools')&&mobile.includes('--dkds-scientific-nav-item-width:')&&mobile.includes('--dkds-scientific-nav-item-height:'),'Native Mobile must retain independently owned scientific-control geometry.');

// Compact scientific titlebars have an inset action inside the title strip.
// Later patches may refine exact action geometry, but one canonical radius must
// remain owned by Component Appearance rather than plugin CSS.
const workspace=read('src/styles/structure/plugin-workspace.css');
const appearance=read('src/styles/theme/component-appearance.css');
const chromeGeometry=read('src/styles/structure/desktop-chrome-geometry.css');
assert(workspace.includes('--dkds-header-action-height:22px;')&&workspace.includes('height:28px;'),'Compact scientific titlebars must retain a 22 px action slot inside the 28 px title strip.');
assert(chromeGeometry.includes('align-items:center')&&chromeGeometry.includes('height:var(--dkds-header-action-height,26px);'),'Canonical Desktop Chrome Geometry must center the slot-driven action hit region.');
assert(appearance.includes('--dkds-titlebar-action-radius:6px'));

// NOTE: the former v3.67.53 scroll "gate" only searched for a CSS selector and
// therefore produced a false positive when an inline runtime containment rule
// overrode it. It is intentionally removed here. v3.67.54+ owns scroll-chain
// verification with runtime/platform behavior tests rather than token presence.

for(const rel of ['src/styles/platform/touch.css','src/styles/structure/plugin-workspace.css','src/styles/theme/component-appearance.css'])assert(!read(rel).includes('!important'),`${rel} must remain free of !important.`);
console.log('v3.67.53 Desktop plugin-load and shared scientific chrome ownership contract PASS.');
