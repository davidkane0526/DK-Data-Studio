#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const [major,minor,patch]=String(json('package.json').version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>68||(minor===68&&patch>=10))),'Mobile placement/theme closure requires v3.68.10+.');

// 1) The RN status bar lives outside the WebView. The Theme popover therefore
// anchors to the WebView bottom on native Mobile instead of reserving Desktop's
// in-renderer status-bar lane a second time.
const themeLayoutSource=read('src/plugins/status-monitor/theme-layout.js');
assert(themeLayoutSource.includes("const fallbackBottom='calc(var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px))'"),'Theme layout must consume the generic renderer status-bar geometry and shared popover-gap token.');
{
  const context={globalThis:{}};context.globalThis=context;vm.createContext(context);vm.runInContext(themeLayoutSource,context);
  const patches=[];
  const dom={style:(_el,patch)=>patches.push(patch)};
  const panel={classList:{contains:()=>false},getBoundingClientRect:()=>({width:420,height:380})};
  context.DKDSStatusMonitorThemeLayout.positionThemePanel({dom,panel,anchor:{x:900},viewport:{innerWidth:1200,innerHeight:800}});
  assert.strictEqual(patches.at(-1).bottom,'calc(var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px))','Theme popover must resolve through the shared renderer status-bar and popover-gap tokens.');
}

// 2) Mobile projection frames are real Material surfaces. Reparenting a PRIME
// into drawer/right/bottom/sheet must not detach it from Theme material context.
const projection=read('src/core/ui/modules/presentation/mobile-web-surface.js');
assert(projection.includes("if(region==='drawer'||region==='companion-right')return 'sidebar'"),'Drawer/right projection frames must consume sidebar Material semantics.');
assert(projection.includes("if(region==='sheet')return 'floating'")&&projection.includes("if(region==='companion-bottom')return 'surface'"),'Sheet/bottom projection frames must consume canonical Material roles.');
assert(projection.includes('window.DKDSMaterialSurface?.apply?.(frame,role)'),'Mobile projection must apply the Core MaterialSurface contract instead of plugin-private paint.');

// 3) Scientific-secondary content in a data-primary workspace is an integral
// data preview, not a forced bottom companion. Verify through the real Presenter.
global.window={
  DKDSPlugins:{
    activities:{list:()=>[{id:'data-center',pluginId:'builtin.data-center',label:'数据中心',primary:true,pluginType:'foundation'}],active:()=> 'data-center'},
    workspace:{top:()=>[{activity:'data-center',pluginId:'builtin.data-center',layout:{mode:'native',primary:{id:'main',presentationRole:'data-primary'},prime:[{id:'chart-preview',presentationRole:'scientific-secondary'}],sub:[]}}]},
    statusBar:{list:()=>[]}
  },
  DKDSUI:{workspaces:{actions:()=>[
    {id:'workspace-primary:main',surfaceId:'main',kind:'primary',presentationRole:'data-primary',active:true},
    {id:'workspace-prime:chart-preview',surfaceId:'chart-preview',kind:'prime',presentationRole:'scientific-secondary',active:true}
  ]},actions:{list:()=>[]}},
  DKDSTheme:{current:()=> 'dark',tokens:()=>({}),materials:()=>({base:{},roles:{}}),appearanceRoles:()=>({roles:{},components:{}}),appearanceComponents:()=>({}),consumption:()=>({version:'0',components:{}}),scientific:()=>({seriesPalette:[],mode:'fallback-only',precedence:[]})}
};
const presenters=require('../src/core/ui/modules/presentation/presenters');
const mobile=presenters.present('mobile',{viewport:{width:1200,height:800},openSurfaces:{'data-center':['chart-preview']}});
const chartPreview=mobile.surfaces.find(row=>row.surfaceId==='chart-preview');
assert.strictEqual(chartPreview?.presentation?.region,'workspace-inline','Data Center scientific preview must stay in the data workspace on Mobile.');

// 4) Mobile canvas docking has one stable lane topology. User-selected
// left/right/bottom placements must no longer be erased by display:contents.
const mobileWorkspace=read('src/styles/platform/native-workspace-presentation.css');
assert(mobileWorkspace.includes('--dkds-mobile-left-track:0px')&&mobileWorkspace.includes('--dkds-mobile-right-track:0px')&&mobileWorkspace.includes('--dkds-mobile-bottom-track:0px'),'Mobile canvas must use stable bounded track variables.');
assert(mobileWorkspace.includes('.dkds-plugin-canvas-frame.has-canvas-left')&&mobileWorkspace.includes('--dkds-mobile-left-track:clamp(190px,26vw,var(--dkds-plugin-canvas-left-width))'),'Wide/expanded Mobile must preserve a real left dock lane.');
assert(mobileWorkspace.includes('position:absolute;z-index:260')&&mobileWorkspace.includes('width:min(86vw,360px)'),'Compact Mobile must convert side docks into bounded sheets instead of crushing the main plot.');
assert(!/\.dkds-plugin-canvas-left,\s*\n[^\n]*\.dkds-plugin-canvas-right,\s*\n[^\n]*\.dkds-plugin-canvas-bottom\{display:contents\}/.test(mobileWorkspace),'Mobile child dock zones must never be flattened with display:contents.');

// 5) Generic mobile touch sizing must not override Core plot-header action
// geometry; this is what caused pressed/focus paint to escape the title strip.
const nativeShell=read('src/styles/platform/native-client-shell.css');
assert(nativeShell.includes('--dkds-generic-button-min-height:var(--dkds-mobile-control-min-height,var(--dkds-touch-target,44px))')&&!/react-native-client\s+button:not\([^\{]+\)\s*\{[^}]*min-height/s.test(nativeShell),'Generic Mobile touch target policy must feed semantic density slots instead of maintaining a fragile compact-action exclusion list.');
assert(mobileWorkspace.includes('.dkds-plot-view-head{overflow:hidden}')&&mobileWorkspace.includes('--dkds-header-action-height:24px'),'Plot header owns a bounded 24px action slot and clips transient paint to its title strip.');

// 6) Mobile floating scientific windows are bounded by their actual zone, and
// their plot content flexes inside the window instead of keeping 42vh/300px.
const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(portable.includes("const mobileHost=document.documentElement?.dataset?.dkdsHost==='mobile'")&&portable.includes('mobileMaxHeight=Math.max(160,zoneHeight-12)'),'PortableView must clamp restored Mobile float bounds to the real projection zone.');
assert(mobileWorkspace.includes('.dkds-portable-view.dkds-plot-view:is(.is-floating,.is-global-floating)>.dkds-plot-view-content')&&mobileWorkspace.includes('flex:1 1 0;min-height:0;height:auto;max-height:100%'),'Floating scientific content must consume only the remaining portable viewport.');

// 7) Data Center keeps one final layout owner. Mobile supplies only layout
// tokens: preview follows source data and sits beside tools on tablet widths.
const dcCss=read('src/plugins/data-center/plugin.css');
const dcMobile=read('src/plugins/data-center/mobile.css');
assert(dcCss.includes('grid-template-areas:var(--dc-main-areas)')&&dcCss.includes('.dc-chart-pane[data-placement="home"]{grid-area:chart;align-self:stretch;height:auto;min-height:0;max-height:none;flex:none}'),'Data Center shared layout must own final grid geometry.');
assert(dcMobile.includes('--dc-main-areas:"source source" "tool chart"')&&dcMobile.includes('@container data-center-workspace (max-width:419px)')&&dcMobile.includes('--dc-main-areas:"source" "tool" "chart"'),'Mobile Data Center must preserve the two-column formula/chart workspace through normal portrait widths and collapse only on genuinely narrow containers.');
assert(!dcMobile.includes('companion-bottom'),'Data Center Mobile must not reintroduce a plugin-private bottom-companion chart layout.');

console.log('v3.68.10 Mobile theme/material + stable dock/float + Data Center preview closure PASS');
