'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(json('package.json').version,'3.68.61'));
assert(json('mobile/app.json').expo.android.versionCode>=88);

// AI settings statuses are compact semantic chips, not edge-pinned bare text.
const ai=read('src/plugins/connectivity-center/plugin.js');
const aiCss=read('src/plugins/connectivity-center/plugin.css');
assert(ai.includes('id="dkaiAgentState" class="dkai-statusline dkds-chip quiet"'),'AI untested state must be a themed quiet chip.');
assert(ai.includes('id="dkaiMcpState" class="dkai-mcp-state dkai-statusline dkds-chip quiet"'),'MCP state must use the same semantic chip contract.');
assert(aiCss.includes('margin-right:2px')&&aiCss.includes('padding:3px 8px')&&aiCss.includes('max-width:min(46%,260px)'),'AI state chip must keep breathing room and bounded text.');

// Important plugin commands explicitly request the primary theme variant.
for(const file of ['src/plugins/ter-analysis/feature-runtime.js','src/plugins/pulse-analysis/feature-runtime.js','src/plugins/data-center/feature-runtime.js']){
  const src=read(file);assert(src.includes("className:'primary',variant:'primary'"),`${file} must declare an explicit theme-owned primary command variant.`);
}
const coreTheme=read('src/core/theme/runtime.js');
const thin=read('src/plugins/thin-glass-theme/plugin.js');
const aurora=read('src/plugins/aurora-pop-theme/plugin.js');
for(const [name,src] of [['core',coreTheme],['thin',thin],['aurora',aurora]]){
  assert(src.includes('variants:{primary:{surface:'),`${name} theme must explicitly own primary command fill.`);
}

// Split-driven layout changes must invalidate Core ScientificCurve surfaces.
const scope=read('src/core/ui/modules/scope/plugin-scope.js');
const layout=read('src/core/ui/modules/series/layout.js');
assert(scope.includes('this.scientificCurves=new Set()'),'PluginScope must track Core scientific curve surfaces.');
assert(scope.includes("surface.requestRender?.('scope-resize')")||layout.includes("surface.requestRender?.('scope-resize')"),'Scientific curves must render after Core layout resize scheduling.');
assert(layout.includes('for(const surface of this.scope.scientificCurves||[])'),'ResizeScheduler must include ScientificCurve surfaces, fixing Vth split-height updates without manual refresh.');

// Portable handle geometry stays unchanged, but all visible paint comes from theme-owned floatingChrome appearance.
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
const paint=read('src/styles/presentation/plugin-chrome.css');
const shell=read('src/styles/presentation/shell.css');
assert(structure.includes('width:18px;height:18px')&&structure.includes('width:15px;height:15px'),'Accepted 18/15 handle geometry must remain unchanged.');
assert(paint.includes('--dkui-component-floating-chrome-indicator')&&paint.includes('--dkui-component-floating-chrome-border-active')&&paint.includes('--dkui-component-floating-chrome-border-hover'),'Handle idle/active colors must come from theme floatingChrome slots.');
assert(!shell.includes('--dkui-portable-corner-'),'Shell-level fixed/derived handle color ownership must stay removed.');
assert(coreTheme.includes('floatingChrome:{')&&thin.includes('floatingChrome:{')&&aurora.includes('floatingChrome:{'),'Default, Thin Glass and Aurora themes must each provide floatingChrome appearance.');

// Theme parameter access belongs in the header and disappears for parameterless themes.
const status=read('src/plugins/status-monitor/plugin.js');
const settingsButton=status.indexOf('id="dkdsThemeSettingsBtn"');
const headActions=status.indexOf('dkds-theme-panel-head-actions');
const modeRow=status.indexOf('dkds-theme-mode-row');
assert(settingsButton>headActions&&settingsButton<modeRow,'Theme settings gear must live in the titlebar action cluster, not the appearance row.');
assert(status.includes('class="dkds-icon-button dkds-theme-plugin-settings hidden"')&&status.includes('aria-label="主题参数">⚙</button>'),'Theme settings must use the canonical titlebar gear action.');
assert(status.includes("themeSettingsBtn.classList.toggle('hidden',!(window.DKDSTheme?.settings?.(currentProfile)||[]).length)"),'Theme settings gear must hide when the active theme has no parameters.');

console.log('v3.68.61 theme/AI/Vth closure PASS.');
