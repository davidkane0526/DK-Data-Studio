const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok){console.error(`FAIL: ${msg}`);process.exitCode=1;}};
const style=readCoreCss(root);
const modern=readCoreCss(root);
const dataCenter=read('src/plugins/data-center/feature-runtime.js');
const dataCenterViews=read('src/plugins/data-center/shared-views.js');
const pluginWindow=read('src/plugin-window/style.css');
const pulseStyle=read('src/plugins/pulse-analysis/plugin.css');

assert(modern.includes('.left-panel section')&&modern.includes('.dkds-analysis-nav-btn'),'semantic first-party surface closure is missing.');
assert(modern.includes('button:not(.primary):not(.strong):not(.danger):not(.dkds-split-caret)'),'First-party button surface normalization is missing.');
assert(modern.includes('border-color:var(--control-border)'),'Interactive fields must use controlBorder rather than structural divider.');
assert(modern.includes('.left-panel section')&&modern.includes('border:0'),'Sidebar sections must not use structural outline separators.');
assert(!/dkds-analysis-(?:left|right|bottom)-resizer[^}]*background:#dfe5ee/s.test(style),'Analysis splitters must not paint a hard-coded light divider while idle.');
assert(!/dkds-plugin-canvas-(?:left|right|bottom)-resizer[^}]*background:#dfe5ee/s.test(style),'Plugin canvas splitters must not paint a hard-coded light divider while idle.');
assert(style.includes('--plugin-workspace-panel-border:var(--divider-subtle,transparent)'),'PluginWorkspace panel border must come from Theme Contract.');
assert(style.includes('.dkds-plugin-workspace{--dkds-analysis-left-width:var(--plugin-workspace-sidebar-width);')&&style.includes('.dkds-plugin-workspace {background:transparent'),'PluginWorkspace geometry and transparent presentation must remain separately owned so MaterialSurface roles can sample the real backdrop.');
assert(style.includes('.dkds-plugin-canvas-center{')&&modern.includes('.dkds-plugin-canvas-center')&&modern.includes('background-color:transparent'),'PluginWorkspace material-bearing canvas must be Core-role managed without an opaque wrapper blocking backdrop sampling.');
assert(/\.pulse-card\{/.test(pulseStyle)&&!/\.pulse-card\{[^}]*border\s*:/.test(pulseStyle),'Pulse plugin must own its card geometry without private structural border paint.');
assert(/\.pulse-card-heading\{/.test(pulseStyle)&&!/\.pulse-card-heading\{[^}]*border-bottom\s*:/.test(pulseStyle),'Pulse plugin heading must rely on the Core surface-header contract instead of private divider paint.');
assert(dataCenterViews.includes('dc-card dc-artifact-pane dkds-surface')&&dataCenterViews.includes('dc-card dc-source-preview dkds-surface'),'Data Center cards must consume the Core surface primitive instead of owning outlined box paint.');
assert(dataCenterViews.includes('dc-section-head dkds-surface-header')&&dataCenterViews.includes('dc-tool-title dkds-surface-header'),'Data Center headings must consume the Core surface-header primitive instead of private divider/background paint.');
assert(!pluginWindow.includes('border-left:1px solid var(--line,#e3e7ee)'),'Dedicated window right dock must not restore legacy divider line.');
assert(!pluginWindow.includes('border-top:1px solid var(--line,#e3e7ee)'),'Dedicated window bottom dock must not restore legacy divider line.');

const pluginFiles=[];
for(const dirent of fs.readdirSync(path.join(root,'src/plugins'),{withFileTypes:true})){
  if(!dirent.isDirectory()||dirent.name.startsWith('_')) continue;
  const folder=path.join(root,'src/plugins',dirent.name);
  for(const name of fs.readdirSync(folder)) if(name.endsWith('.js')) pluginFiles.push(path.join(folder,name));
}
const forbidden=/(?:border(?:-[a-z]+)?\s*:[^;\n]*(?:#d[0-9a-f]{2,5}|#e[0-9a-f]{2,5}|#f[0-9a-f]{2,5}|white)|background(?:-color)?\s*:\s*(?:#fff(?:fff)?|white))/ig;
const violations=[];
for(const file of pluginFiles){
  const text=fs.readFileSync(file,'utf8');
  let m;while((m=forbidden.exec(text))){
    const line=text.slice(0,m.index).split('\n').length;
    violations.push(`${path.relative(root,file)}:${line}:${m[0].slice(0,90)}`);
    if(violations.length>20) break;
  }
}
assert(!violations.length,`First-party plugin UI contains hard-coded light structural paint:\n${violations.join('\n')}`);

if(process.exitCode) process.exit(process.exitCode);
console.log('v3.61.57 theme hardening passed: first-party workspaces use semantic surfaces, borderless structure and idle-transparent splitters.');
