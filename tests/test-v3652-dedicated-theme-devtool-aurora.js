'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const topHtml=read('src/plugin-window/index.html');
const semantic=read('src/core/theme/semantic-registry.js');
const integrated=read('src/styles/theme/integrated-command-chrome.css');
const component=read('src/styles/theme/component-appearance.css');
const statusRuntime=read('src/core/plugins/kernel/modules/project/status.js');
const debug=read('src/core/theme/debug-runtime.js');
const devtools=read('src/core/plugins/devtools.js');
const coverage=read('src/core/theme/coverage-runtime.js');
const automation=read('src/diagnostics/automation-test-runtime.js');
const auroraManifest=json('src/plugins/aurora-pop-theme/plugin.json');
const aurora=read('src/plugins/aurora-pop-theme/plugin.js');

assert(/^3\.(?:6[5-9]|[7-9]\d)\./.test(pkg.version)||Number(pkg.version.split('.')[0])>3,'v3.65.2 dedicated-theme regression requires app 3.65.2 or newer');
const contractPos=topHtml.indexOf('../../sdk/theme-contract.js');
const semanticPos=topHtml.indexOf('../core/theme/semantic-registry.js');
const rendererPos=topHtml.indexOf('../core/theme/material-renderer.js');
assert(!topHtml.includes('semver-compat'),'Dedicated TOP must not load a Theme semver compatibility bridge.');
assert(contractPos>0&&semanticPos>contractPos&&rendererPos>semanticPos,'Dedicated TOP must load Theme Contract → Semantic Registry → Material Renderer in canonical order');
assert(!/toolbarAction[^\n]+statusbar-command-cluster button/.test(semantic),'status-bar commands must not consume toolbarAction hover appearance');
assert(statusRuntime.includes("button.className='plugin-status-item quiet'")&&component.includes('[data-dkds-component-identity="toolbarAction"][data-dkds-component-variant="quiet"]'),'status-bar commands must consume the canonical quiet ToolbarAction contract.');
assert(!integrated.includes('.plugin-status-item'),'Theme-specific integrated-command CSS must not repaint status-bar command hover/focus states.');
assert(!debug.includes('Ctrl+Alt+T toggle')&&!debug.includes("event.ctrlKey&&event.altKey"),'Theme Inspector must no longer hide behind Ctrl+Alt+T');
assert(devtools.includes("['theme','Theme']")&&devtools.includes("data-act=\"theme-inspector\"")&&devtools.includes('window.DKDSThemeDebug'),'Plugin DevTools must own the Theme Inspector entry point');
assert(coverage.includes("const VERSION='4.0.0'")&&coverage.includes('disabledExempt++')&&coverage.includes('minimum=4.5'),'Theme contrast gate must test actionable controls while reporting disabled controls as exempt');
assert(automation.includes("window.DKDSTheme?.supports?.('contract.appearance.component-contexts')===true"),'Automation must validate the current semantic component-context capability instead of depending on the retired resolver-shape probe.');
assert(/^2\.(?:[0-9]|[1-9]\d)\./.test(auroraManifest.version),'Built-in Aurora Pop must remain on the 2.x reference line.');
assert.equal(auroraManifest.pluginType,'theme');
assert.deepEqual(auroraManifest.capabilities,['ui.theme']);
assert.equal(auroraManifest.apiVersion,'1.19.0');assert(!Object.prototype.hasOwnProperty.call(auroraManifest,'compatibility'),'Aurora must target only the exact current Theme/Plugin contract.');
assert(!fs.existsSync(path.join(root,'src/plugins/aurora-pop-theme/plugin.css')),'Aurora Pop must stay token-only and must not inject theme CSS');
for(const token of ["accent:'#7650E8'","accentHover:'#7E5AE8'","disabledText:'#8490A7'"])assert(aurora.includes(token),`Built-in Aurora Pop 2.x missing ${token}`);

function hexLum(hex){const h=hex.slice(1),rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255),f=v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);return .2126*f(rgb[0])+.7152*f(rgb[1])+.0722*f(rgb[2]);}
function contrast(a,b){const x=hexLum(a),y=hexLum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
assert(contrast('#7650E8','#FFFFFF')>=4.5,'Aurora Pop dark primary accent must keep white text at WCAG AA contrast');
console.log('v3.65.2 Dedicated TOP Theme bootstrap, DevTool Theme Inspector, quiet status chrome and built-in Aurora Pop 2.x contracts passed.');
