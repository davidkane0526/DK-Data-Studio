const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'3.61.85','Tool window/layout release must be v3.61.32');

const modern=read('src/ui-modern.css');
assert(/#pluginToolsMenu\s*\{[\s\S]*?width\s*:\s*max-content/i.test(modern),'Tools menu must size to its content');
assert(/#pluginToolsMenu\s*>\s*\.tool-workspace-menu-item\s*\{[\s\S]*?justify-content\s*:\s*flex-start/i.test(modern),'Tools menu items must keep icon and label together');

const infra=read('src/core/ui-infrastructure.js');
assert(infra.includes("navigationMode||'auto'"),'PluginWorkspace must expose auto navigation mode');
assert(infra.includes('redundantSinglePrimary'),'Single-primary workspace navigation must be recognized as redundant');
assert(/mode!==['"]always['"]&&redundantSinglePrimary/.test(infra),'Single-primary navigation must auto-hide unless explicitly requested');

const pluginWindow=read('src/plugin-window/style.css');
assert(/body\.plugin-window-host\{[^}]*padding:0/.test(pluginWindow),'Dedicated plugin host must not reserve a second status-bar padding');
assert(/body\.plugin-window-host #app\{height:100vh;min-height:0\}/.test(pluginWindow),'Dedicated plugin app should own the full viewport; AnalysisPage reserves the status bar once');
assert(!/body\.plugin-window-host\{[^}]*padding-bottom\s*:\s*28px/.test(pluginWindow),'Legacy duplicate 28px body reservation must stay removed');
assert(/\.analysis-page\{[\s\S]*?bottom:28px!important/.test(pluginWindow),'AnalysisPage must remain the single viewport reservation above the fixed status bar');

const api=read('sdk/plugin-api.d.ts');
assert(api.includes("navigation?:'auto'|'always'|'hidden'"),'SDK must document PluginWorkspace navigation policy');
const template=read('sdk/templates/tool-plugin/plugin.js');
assert(!template.includes("label:'工具'"),'Single-page Tool template must not teach a redundant Tool navigation label');

console.log('v3.61.29 tool window/layout regression OK');
