const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const css=read('src/style.css');
const app=read('src/app.js');
const manager=read('src/core/plugin-manager-ui.js');
const pluginWindowCss=read('src/plugin-window/style.css');
const pkg=JSON.parse(read('package.json'));

assert(/^\d+\.\d+\.\d+$/.test(pkg.version),'Application package version must remain a stable semantic version.');
assert(css.includes('--dkds-analysis-page-top'),'analysis pages must use a measured shell-top CSS variable.');
assert(app.includes("root.style.setProperty('--dkds-viewport-height'"),'viewport measurement may expose the current visual viewport height for components that need it.');
assert(css.includes('100dvh'),'analysis pages need a dynamic-viewport fallback.');
assert(css.includes('flex:1 1 0%')&&css.includes('height:0'),'analysis page scroll body must be a zero-basis flex scroll region.');
assert(css.includes('overscroll-behavior:contain'),'analysis page scrolling must stay contained.');
assert(pluginWindowCss.includes('body.plugin-window-host .analysis-page')&&pluginWindowCss.includes('top:0!important')&&pluginWindowCss.includes('bottom:28px!important'),'dedicated plugin windows must fill between their own top edge and status bar without depending on the removed full-host auxiliary renderer.');
assert(css.includes('.analysis-page{')&&css.includes('bottom:var(--dkds-statusbar-height,28px)'),'main analysis pages must use top/bottom constraints so plugin lifecycle changes cannot leave a shortened page.');

assert(app.includes('function measureAnalysisPageTop()'),'app must measure the live topbar/project-tab stack.');
assert(app.includes("document.querySelector('.topbar')")&&app.includes("document.querySelector('.project-tabs-bar')"),'viewport measurement must use the actual shell elements.');
assert(app.includes('window.visualViewport?.height'),'viewport sync must handle effective viewport changes.');
assert(app.includes('function syncAnalysisPageViewport()'),'app must expose a reusable viewport repair routine.');
assert(app.includes("window.addEventListener('resize',()=>{\n    syncAnalysisPageViewport();"),'generic window resize handling must repair open analysis pages.');
assert(app.includes("window.DKDSPlugins.events.on('plugin:state-changed'"),'plugin lifecycle changes must repair analysis-page geometry.');
assert(app.includes("window.DKDSPlugins.events.on('plugin:manager-changed'")&&app.includes('syncAnalysisPageViewport();'),'manager changes must repair analysis-page geometry.');
assert(manager.includes('scheduleViewportRepair'),'plugin manager rerender must trigger viewport repair.');
assert(manager.includes('state.host?.syncAnalysisPageViewport?.()'),'plugin manager must use the shared viewport repair API.');
assert(manager.includes("renderList({scroll:'top'})"),'plugin lifecycle mutations must return the manager to a valid top-aligned viewport instead of keeping a stale bottom anchor.');
assert(manager.includes('function settleManagerAtTop(frames=12)')&&manager.includes('requestAnimationFrame(step)'),'plugin manager must keep the real scroll container top-aligned across late Chromium layout frames.');
assert(manager.includes('function resetManagerScrollChain()')&&manager.includes('document.scrollingElement')&&manager.includes('document.documentElement')&&manager.includes('document.body'),'plugin manager lifecycle repair must reset every Chromium scroll owner, not only the card scroller.');
assert(app.includes('new ResizeObserver(()=>syncAnalysisPageViewport())')&&app.includes("['.topbar','.project-tabs-bar','#activityBar','#primaryActivityBar']"),'analysis viewport must follow late shell reflow after plugin/SUPER changes.');
assert(manager.includes('const renderAfterLifecycleChange=()=>{')&&manager.includes("renderList({scroll:'top'})")&&manager.includes('settleManagerAtTop();'),'every plugin lifecycle rerender must use the top-reset transaction.');

console.log('Analysis-page viewport regression checks passed.');
