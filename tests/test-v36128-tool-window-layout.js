const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));


const modern=readCoreCss(root);
assert(/#pluginToolsMenu\s*\{[\s\S]*?width\s*:\s*max-content/i.test(modern),'Tools menu must size to its content');
assert(/#pluginToolsMenu\s*>\s*\.tool-workspace-menu-item\s*\{[\s\S]*?justify-content\s*:\s*flex-start/i.test(modern),'Tools menu items must keep icon and label together');

const infra=read('src/generated/runtime/ui-infrastructure.js');
assert(infra.includes("navigationMode||'auto'"),'PluginWorkspace must expose auto navigation mode');
assert(infra.includes('showPrimaryNavigation'),'Current workspace navigation must treat PRIMARY as a return route');
assert(!infra.includes('redundantSinglePrimary'),'Legacy redundantSinglePrimary compatibility logic must stay removed');
assert(/mode===['"]always['"]\|\|subRows\.length>0/.test(infra),'PRIMARY navigation must only be explicit or required as a SUB return route');

const pluginWindow=read('src/plugin-window/style.css');
assert(/body\.plugin-window-host\{[^}]*padding:0/.test(pluginWindow),'Dedicated plugin host must not reserve a second status-bar padding');
assert(/grid-template-rows:52px var\(--dkds-plugin-window-shell-gap\) minmax\(0,1fr\)/.test(pluginWindow),'Dedicated plugin windows must reserve the Core self-drawn titlebar as a real layout track');
assert(/body\.plugin-window-host #app\{grid-area:main;/.test(pluginWindow),'Dedicated plugin app must occupy the main grid track below Core chrome');
assert(!/body\.plugin-window-host\{[^}]*padding-bottom\s*:\s*28px/.test(pluginWindow),'Legacy duplicate 28px body reservation must stay removed');
assert(!/body\.plugin-window-host #app\{height:100vh/.test(pluginWindow),'Legacy full-viewport plugin app geometry must stay removed');
const pluginWindowHtml=read('src/plugin-window/index.html');
assert(pluginWindowHtml.includes('pluginWindowTitlebar')&&pluginWindowHtml.includes('pluginWindowActionDivider'),'Dedicated plugin window must expose one Core-owned title/action row');
assert(pluginWindowHtml.includes('statusBarPersistent')&&pluginWindowHtml.includes('statusBarPersistentSeparator'),'Dedicated plugin status bar must split persistent and updating status');

const api=read('sdk/plugin-api.d.ts');
assert(api.includes("navigation?:'auto'|'always'|'hidden'"),'SDK must document PluginWorkspace navigation policy');
const template=read('sdk/templates/tool-plugin/plugin.js');
assert(!template.includes("label:'工具'"),'Single-page Tool template must not teach a redundant Tool navigation label');

console.log('current tool window/layout contract regression OK');
