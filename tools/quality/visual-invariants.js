#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const {inspectPluginCss,collectCoreAliases}=require('../../sdk/visual-contract');
const root=path.resolve(__dirname,'..','..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const failures=[];
const requireText=(text,token,message)=>{if(!text.includes(token))failures.push(message);};
const forbidText=(text,token,message)=>{if(text.includes(token))failures.push(message);};
const requireRegex=(text,re,message)=>{if(!re.test(text))failures.push(message);};
const forbidRegex=(text,re,message)=>{if(re.test(text))failures.push(message);};
const pluginVisualIdentity=/(?:\.pulse-|\.pulse-analysis\b|\.dc-|\.data-center-body\b|\.ter-|\.ter-analysis\b|#terMaxPage\b|\.respar-|\.reswin-|\.resonance-|#resonanceDedicatedPage\b|\.dksvc-|\.dksmb-|\.dkai-|\.dkds-vth-|\.transfer-vth-lab-page\b)/;
const pluginVisualPaintProp=/^(?:background(?:-[\w-]+)?|color|border(?:-[\w-]+)?|border-radius|box-shadow|text-shadow|font(?:-[\w-]+)?|font|outline(?:-[\w-]+)?|filter|fill|stroke|accent-color)$/i;
const controlGeometryProp=/^(?:height|min-height|max-height|padding(?:-[\w-]+)?|line-height)$/i;
const authoredCoreCssFiles=()=>{
  const out=[];
  const walk=dir=>{if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()&&entry.name.endsWith('.css'))out.push(file);}};
  walk(path.join(root,'src','styles'));
  return out;
};
const pluginVisualPaintRules=css=>{
  const clean=String(css||'').replace(/\/\*[\s\S]*?\*\//g,'');
  const out=[];
  for(const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=match[1].replace(/\s+/g,' ').trim();
    if(!selector||selector.startsWith('@')||!pluginVisualIdentity.test(selector))continue;
    const isControl=/(?:^|[\s>+~,])(button|input|select|textarea)(?=[.#:\[\s>+~,]|$)/i.test(selector);
    for(const raw of match[2].split(';')){
      const idx=raw.indexOf(':');if(idx<0)continue;
      const prop=raw.slice(0,idx).trim();if(!prop)continue;
      if(pluginVisualPaintProp.test(prop)||(isControl&&controlGeometryProp.test(prop)))out.push(`${selector} -> ${prop}`);
    }
  }
  return out;
};

const actionStateSelector=selector=>{
  const cleaned=String(selector||'').replace(/:not\([^)]*\)/g,'');
  const action=/(?:\bbutton\b|toolbar-btn|project-tab|activity-tab|dkds-action-button|dkds-choice-button|plugin-main-tool-btn|dkds-analysis-nav-btn|plugin-toolbar-btn|theme-profile-option|plugin-super-selector|dkds-list-item|dkds-chip|plugin-status-badge|plugin-type-badge|plugin-capability-chip|dkds-summary-chip|plugin-menu-item|menu-item|dkds-context-item)/.test(cleaned);
  const state=/(?:\.(?:active|selected|is-active|is-selected)\b|aria-pressed|aria-selected|aria-checked)/.test(cleaned);
  return action&&state;
};
const actionStatePaintRules=css=>{
  const clean=String(css||'').replace(/\/\*[\s\S]*?\*\//g,'');
  const out=[];
  for(const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=match[1].replace(/\s+/g,' ').trim();
    if(!selector||!actionStateSelector(selector))continue;
    if(/(?:^|;)\s*(?:background(?:-color|-image)?|color|-webkit-text-fill-color|border(?:-(?:top|right|bottom|left)-color|-color)?|box-shadow|text-shadow)\s*:/m.test(match[2]))out.push(selector);
  }
  return out;
};

function validate(){
  failures.length=0;
  const componentRuntime=read('src/core/theme/component-appearance.js');
  const uiComponentRuntime=read('src/core/ui/component-runtime.js');
  const semanticRegistry=read('src/core/theme/semantic-registry.js');
  const componentCss=read('src/styles/theme/component-appearance.css');
  const integratedCss=read('src/styles/theme/integrated-command-chrome.css');
  const controlStatus=read('src/styles/presentation/control-status.css');
  const materialRenderer=read('src/core/theme/material-renderer.js');
  const materialCss=read('src/styles/theme/material-renderer.css');
  const coverage=read('src/core/theme/coverage-runtime.js');
  const tooltip=read('src/core/ui/modules/tooltip/group-plot.js');
  const workbench=read('src/core/ui/modules/workbench/analysis.js');
  const activityShell=read('src/core/plugins/kernel/modules/activity/shell.js');
  const statusItems=read('src/core/plugins/kernel/modules/project/status.js');
  const portableView=read('src/core/ui/modules/layout/portable-view.js');
  const resonanceControls=read('src/plugins/resonance-workbench/feature-controls-runtime.js');
  const touch=read('src/styles/platform/touch.css');
  const contractCss=read('src/styles/theme/contract.css');
  const materialRoles=read('src/styles/theme/material-roles.css');
  const thinGlass=read('src/plugins/thin-glass-theme/plugin.js');
  const connectivity=read('src/plugins/connectivity-center/plugin.js');
  const devtools=read('src/core/plugins/devtools.js');
  const projectTabs=read('src/app/modules/project-tabs-history.js');
  const pluginManager=read('src/core/plugins/manager-ui.js');
  const foundation=read('src/app/modules/foundation.js');
  const connectivityCss=read('src/styles/presentation/connectivity.css');
  const devtoolsCss=read('src/styles/presentation/plugin-devtools.css');
  const chromeGeometry=read('src/styles/structure/desktop-chrome-geometry.css');
  const shellNavigation=read('src/styles/structure/shell-navigation.css');
  const presentationShell=read('src/styles/presentation/shell.css');
  const schemaStructure=read('src/styles/structure/schema-and-plugin-ui.css');
  const workspaceStructure=read('src/styles/structure/workspace-interaction.css');
  const pluginWorkspaceStructure=read('src/styles/structure/plugin-workspace.css');
  const desktopShell=read('src/core/ui/modules/presentation/desktop-shell.js');
  const statusPlugin=read('src/plugins/status-monitor/plugin.js');
  const terSharedViews=read('src/plugins/ter-analysis/shared-views.js');
  const terAnalysisService=read('src/plugins/ter-analysis/analysis-service.js');
  const resonanceView=read('src/plugins/resonance-workbench/view-components.js');
  const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
  const scientificChart=read('src/core/scientific/chart-runtime.js');
  const scientificNav=read('src/core/ui/modules/scientific-curve/navigation.js');
  const indexHtml=read('src/index.html');

  // HARD-01: analysis/workbench navigation is a toolbar action, never a tab.
  requireRegex(semanticRegistry,/id:'tab'[^\n]+activity-tab:not\(\.top-level-activity-tab\)/,'HARD-01: generic Tab selector must exclude top-level workspaces.');
  forbidRegex(semanticRegistry,/id:'tab'[^\n]+dkds-analysis-nav-btn/,'HARD-01: .dkds-analysis-nav-btn must never be classified as a Tab.');
  requireRegex(semanticRegistry,/id:'toolbarAction'[^\n]+dkds-analysis-nav-btn/,'HARD-01: .dkds-analysis-nav-btn must be a Theme toolbarAction.');
  forbidRegex(componentCss,/:where\([^)]*dkds-analysis-nav-btn[^)]*\):is\([^)]*active[^}]*inset\s+0\s+-2px/s,'HARD-01: analysis navigation must never receive a tab underline indicator.');
  forbidRegex(controlStatus,/\.dkds-analysis-nav-btn\.(?:active|selected)|\.dkds-analysis-nav-btn\[aria-pressed/s,'HARD-01: Presentation must not repaint analysis-navigation states; Theme owns them.');

  // HARD-02: chart-title and bottom-status actions are hit regions of parent chrome.
  requireText(semanticRegistry,'.analysis-chart-title','HARD-02: analysis-chart-title must be a Core panelHeader semantic component.');
  requireText(materialRenderer,'Semantic.resolveMaterialRole(el)','HARD-02: Material Renderer must obtain chart-title ownership from the canonical semantic registry.');
  requireText(coverage,'Semantic.materialAreas()','HARD-02: Theme coverage must consume the canonical material-area registry that includes analysis-chart-title.');
  requireRegex(materialCss,/analysis-chart-title[^\n]*\)\s*\n?\s*:where\([^)]*(?:dkds-surface-actions|dkds-integrated-action-group)/s,'HARD-02: chart-title action groups must flatten into the parent title chrome through the Material Renderer.');
  forbidRegex(semanticRegistry,/id:'toolbarGroup'[^\n]*(?:dkds-integrated-action-group|statusbar-command-cluster)/,'HARD-02: integrated/status command clusters must never be painted as toolbarGroup components.');
  forbidRegex(componentCss,/:where\([^)]*(?:dkds-integrated-action-group|statusbar-command-cluster)[^)]*\)\s*\{[^}]*--dkds-material-base/s,'HARD-02: Theme Component Appearance must not create a second material shell around integrated/status groups.');
  requireText(statusItems,"button.className='plugin-status-item quiet'",'HARD-02: status-bar actions must declare the canonical quiet action variant so parent chrome remains the only surface.');
  forbidRegex(integratedCss,/#statusBar\.statusbar[\s\S]*?\.plugin-status-item:is\([^}]+\{[^}]*?(?:background|border-color|box-shadow)/s,'HARD-02: Theme location CSS must not repaint status-bar actions.');

  // HARD-03: Core owns tooltip rendering, while tooltip presence is explicit semantic metadata.
  requireText(tooltip,"querySelectorAll?.('[title]')",'HARD-03: Core tooltip runtime must intercept every browser-native title surface.');
  requireText(tooltip,"target.removeAttribute('title')",'HARD-03: Core must remove native title attributes before Chromium can paint them.');
  requireText(tooltip,'MutationObserver','HARD-03: dynamically created title attributes must also be normalized.');
  requireText(tooltip,'dkdsTooltipFromTitle','HARD-03: title-to-tooltip migration must require an explicit opt-in, never happen by default.');
  requireText(tooltip,"policy==='overflow'",'HARD-03: declarative Core tooltips must support overflow-only semantics.');
  forbidRegex(tooltip,/if\(title&&!String\(target\.dataset\?\.dkdsTooltip/,'HARD-03: native title text must never be promoted into a DKDS tooltip implicitly.');
  forbidText(workbench,"dataset.dkdsTooltip='PRIME",'HARD-03: PRIME/SUB navigation with visible labels must remain tooltip-free.');
  forbidText(activityShell,'button.dataset.dkdsTooltip=tooltip','HARD-03: activity tabs with visible labels must remain tooltip-free.');
  requireText(statusItems,'delete button.dataset.dkdsTooltip','HARD-03: bottom status-bar actions must explicitly remain tooltip-free.');
  forbidText(portableView,"placementButton.title='图表位置'",'HARD-03: integrated chart-position controls must not request a tooltip.');
  requireRegex(resonanceControls,/respar-dataset-title" data-dkds-tooltip="\$\{esc\(d\.path\)\}"/,'HARD-03: dataset labels must expose the full source path through the Core custom tooltip contract.');

  // HARD-04: no historical topbar/plugin underline or double selection rim may return.
  forbidRegex(touch,/\.plugin-toolbar-btn\[data-plugin-id\]::after/,'HARD-04: platform/touch.css must never draw plugin-toolbar underlines.');
  forbidRegex(contractCss,/--dkui-selected-shadow:[^;]*0\s+0\s+0\s+1px/,'HARD-04: selected state must not combine a hard rim with its halo.');
  requireRegex(contractCss,/--dkui-selected-shadow:\s*0\s+0\s+4px/,'HARD-04: selected state must keep one centered semantic halo.');
  forbidText(componentCss,'box-shadow:inset 0 -2px 0 var(--dkds-ca-tab-indicator)','HARD-04: canonical Tab selected/active paint must not stack an underline indicator on top of its filled state.');

  // HARD-05: large elevated Thin Glass surfaces use one stronger optical contract.
  requireText(thinGlass,"'workspace-modal':{materialBlur:",'HARD-05: Thin Glass elevated surfaces must expose a dedicated workspace-modal optical context.');
  requireRegex(materialRoles,/role="elevated"[\s\S]*?--dkds-material-fill-floor:72%;/,'HARD-05: Core elevated surfaces must enforce the shared readability floor.');
  requireText(connectivity,'dksmb-browser dkds-material-role-surface','HARD-05: SMB browser must declare the shared Core surface role without creating a nested rounded card.');
  requireText(connectivity,'dksmb-nav dkds-material-role-sidebar','HARD-05: SMB navigation must declare the shared Core sidebar role.');
  requireText(connectivity,'dksmb-toolbar dkds-material-role-chrome','HARD-05: SMB path strip must declare the shared Core chrome role.');
  requireText(connectivity,'dksmb-connection dkds-material-role-sidebar','HARD-05: SMB connection strip must declare the shared Core sidebar role.');
  requireText(connectivity,'dksmb-foot dkds-material-role-chrome','HARD-05: SMB footer must declare the shared Core chrome role.');
  forbidText(connectivity,'dksmb-browser dkds-surface','HARD-05: SMB browser must not create a rounded nested Core surface inside the dialog.');
  forbidText(connectivity,'dksmb-toolbar dkds-toolbar','HARD-05: SMB path toolbar must not create a nested toolbarGroup card.');
  forbidText(connectivity,'dksmb-connection dkds-action-row','HARD-05: SMB connection fields must not create a nested toolbarGroup card.');


  // HARD-06: one canonical component runtime; plugins cannot repaint Core chrome.
  requireText(uiComponentRuntime,"const VERSION='2.0.0'",'HARD-06: Core component runtime 2.0 is required.');
  for(const factory of ['action','actionGroup','tabs','surfaceHeader','field','hydrate'])requireRegex(uiComponentRuntime,new RegExp(`\\b${factory}\\(`),`HARD-06: Core component runtime must expose ${factory}().`);
  const pluginRoot=path.join(root,'src','plugins');
  if(fs.existsSync(pluginRoot))for(const entry of fs.readdirSync(pluginRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const folder=path.join(pluginRoot,entry.name),file=path.join(folder,'plugin.css');if(!fs.existsSync(file))continue;
    const sourceFiles=[];const walk=d=>{for(const row of fs.readdirSync(d,{withFileTypes:true})){const sourcePath=path.join(d,row.name);if(row.isDirectory())walk(sourcePath);else if(row.isFile()&&/\.(?:js|html)$/.test(row.name))sourceFiles.push(sourcePath);}};walk(folder);
    const aliases=collectCoreAliases(sourceFiles.map(sourcePath=>fs.readFileSync(sourcePath,'utf8')).join('\n'));
    const audit=inspectPluginCss(fs.readFileSync(file,'utf8'),{path:path.relative(root,file).replace(/\\/g,'/'),aliases});
    for(const issue of audit.issues)failures.push(`HARD-06: ${issue.code}: ${issue.message}`);
  }

  // HARD-07: component identity/state is the single paint owner for actions.
  requireText(uiComponentRuntime,"owner='core-component'",'HARD-07: Core factories must mark explicit component semantics separately from runtime inference.');
  requireText(uiComponentRuntime,'dkdsComponentVariantOwner=owner','HARD-07: explicit Core component variants must retain their ownership across hydration.');
  requireRegex(uiComponentRuntime,/variant:row\.variant\|\|''\}\);semantic\(button,'tab',row\.variant\|\|''\)/,'HARD-07: Tab factory must not mark every idle tab as selected.');
  requireText(semanticRegistry,"dkdsComponentVariantOwner==='core-component'",'HARD-07: semantic assignment must preserve explicit component variants.');
  requireText(semanticRegistry,'.dkds-mode-group>button','HARD-07: segmented/mode-group actions must be canonical toolbarAction components.');
  requireText(semanticRegistry,'.dkds-integrated-action-group button','HARD-07: integrated command children must keep canonical toolbarAction identity while the parent owns material.');
  requireText(semanticRegistry,'[role="option"]','HARD-07: selectable option rows must route through canonical menuItem appearance.');
  requireText(semanticRegistry,'.dkds-list-item','HARD-07: shared list rows must route active/selected paint through canonical menuItem appearance.');
  requireText(semanticRegistry,'.dkds-context-item','HARD-07: context-menu rows must route selected paint through canonical menuItem appearance.');
  requireText(semanticRegistry,'.secondary,[data-tone="secondary"]','HARD-07: conventional secondary actions must resolve to the canonical secondary component variant.');
  requireText(devtools,'role="tablist"','HARD-07: Core DevTools navigation must declare tab semantics instead of relying on a private active paint rule.');
  requireText(devtools,'role="tab"','HARD-07: Core DevTools navigation buttons must resolve through canonical Tab appearance.');
  forbidRegex(devtoolsCss,/\.dkds-plugin-devtools-window>nav button\{[^}]*?(?:background|border(?:-color)?|box-shadow)\s*:/s,'HARD-07: Plugin DevTools navigation may own geometry, but canonical Tab Component Appearance must own its paint.');
  requireText(projectTabs,"project-tab${selected?' selected':''}",'HARD-07: project tabs must use selected semantics rather than historical active-state drift.');
  requireText(projectTabs,"aria-selected',selected?'true':'false'",'HARD-07: project tabs must expose canonical aria-selected state.');
  requireText(pluginManager,"tone:'success'",'HARD-07: plugin enabled status must use the canonical Chip success tone rather than private active paint.');
  requireText(pluginManager,'data-status=\"${status.tone}\"','HARD-07: plugin status badges must route semantic status through Chip data-status tokens.');
  requireText(foundation,'lan-web-url-chip dkds-list-item','HARD-07: selectable LAN address rows must route through canonical List/MenuItem appearance.');
  forbidRegex(connectivityCss,/\.lan-web-url-chip\.selected\s*\{[^}]*?(?:background|color|border-color|box-shadow)/s,'HARD-07: LAN address selection must not privately repaint its canonical row surface.');
  requireText(componentCss,'--dkui-component-toolbar-action-variant-primary-surface-hover','HARD-07: Core renderer must consume Theme-authored primary hover slots.');
  requireText(componentCss,'--dkui-component-toolbar-action-variant-secondary-surface-hover','HARD-07: Core renderer must consume Theme-authored secondary hover slots.');
  forbidRegex(componentCss,/\.(?:dkds-surface-header|floating-header|analysis-page-header)[^{]*\[data-dkds-component-identity="(?:toolbarAction|tab)"\]/s,'HARD-07: component paint must never be redefined by visual location/context.');
  for(const rel of ['src/styles/presentation','src/styles/theme']){
    const dir=path.join(root,rel);if(!fs.existsSync(dir))continue;
    for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.css'))){
      if(rel.endsWith('/theme')&&name==='component-appearance.css')continue;
      const rules=actionStatePaintRules(fs.readFileSync(path.join(dir,name),'utf8'));
      for(const selector of rules)failures.push(`HARD-07: ${rel}/${name} repaints action state outside Component Appearance: ${selector}`);
    }
  }
  if(fs.existsSync(pluginRoot))for(const entry of fs.readdirSync(pluginRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const folder=path.join(pluginRoot,entry.name);
    for(const name of fs.readdirSync(folder).filter(name=>name.endsWith('.css'))){
      const rel=path.relative(root,path.join(folder,name)).replace(/\\/g,'/');
      const rules=actionStatePaintRules(fs.readFileSync(path.join(folder,name),'utf8'));
      for(const selector of rules)failures.push(`HARD-07: ${rel} repaints action state outside Component Appearance: ${selector}`);
    }
  }


  // HARD-08: Core visual layers are domain-blind. Plugin identity may remain in
  // plugin-owned geometry, but no authored Core stylesheet may paint it.
  for(const file of authoredCoreCssFiles()){
    const rel=path.relative(root,file).replace(/\\/g,'/');
    for(const rule of pluginVisualPaintRules(fs.readFileSync(file,'utf8')))failures.push(`HARD-08: ${rel} owns plugin visual chrome: ${rule}`);
  }


  // HARD-09: visible UI typography never drops below the shared 10 px floor.
  // Tiny glyphs should use SVG/CSS geometry; text must stay inside the declared
  // Core typography range rather than bypassing it with 7-9 px literals.
  for(const file of authoredCoreCssFiles()){
    const css=fs.readFileSync(file,'utf8');
    for(const match of css.matchAll(/font-size\s*:\s*([0-9.]+)px/gi)){
      const size=Number(match[1]);
      if(Number.isFinite(size)&&size<10){
        const rel=path.relative(root,file).replace(/\\/g,'/');
        failures.push(`HARD-09: ${rel} bypasses the typography floor with ${size}px.`);
      }
    }
  }


  // HARD-10: docking hosts are geometry only. A dock slot must never become a
  // second white/glass sheet behind the Surface it hosts.
  for(const file of authoredCoreCssFiles()){
    const css=fs.readFileSync(file,'utf8'),rel=path.relative(root,file).replace(/\\/g,'/');
    for(const token of ['inspector-dock-slot','prime-right-dock-slot','prime-bottom-dock-slot']){
      const re=new RegExp(`\\.${token}[^{}]*\\{[^}]*?(?:background(?:-[\\w-]+)?|border(?:-[\\w-]+)?|box-shadow)\\s*:`,`s`);
      if(re.test(css))failures.push(`HARD-10: ${rel} paints layout-only .${token}.`);
    }
  }

  // HARD-11: Theme Picker is a fixed status popover, never a PortableView.
  requireText(statusPlugin,"data-dkds-portable-chrome':'false'",'HARD-11: Theme Picker must opt out of PortableView chrome structurally.');
  requireText(statusPlugin,"data-dkds-portable':'false'",'HARD-11: Theme Picker must opt out of PortableView placement/state restoration.');
  requireText(statusPlugin,'dkds-fixed-popover-header','HARD-11: Theme Picker must use fixed-popover header semantics.');
  requireRegex(portableView,/this\.portableDisabled=!!\(this\.node\.matches\?\.\('\.dkds-fixed-popover,[^']*data-dkds-portable-chrome="false"[^']*data-dkds-portable="false"/,'HARD-11: PortableView must reject fixed popovers before creating placement chrome.');
  requireRegex(portableView,/const chrome=this\.spec\.chrome!==false&&!this\.portableDisabled/,'HARD-11: placement chrome must not be created for a disabled portable surface.');

  // HARD-12: every desktop panel close action has one square geometry and one
  // canonical corner radius, independent of which header created it.
  requireRegex(chromeGeometry,/\.dkds-panel-close-button\{[\s\S]*?width:26px;min-width:26px;max-width:26px;height:26px;min-height:26px;[\s\S]*?padding:0/,'HARD-12: panel close geometry must be exactly 26x26 with zero padding.');
  requireText(componentCss,'[data-dkds-component-identity="toolbarAction"].dkds-panel-close-button{border-radius:7px}','HARD-12: panel close radius must have one canonical 7 px owner.');
  requireRegex(chromeGeometry,/dkds-fixed-popover-header>\.dkds-panel-close-button\{[\s\S]*?max-height:26px;padding:0/,'HARD-12: fixed popover close must consume the same 26x26 header geometry.');

  // HARD-13: desktop topbar uses exact geometry, not a blur approximation.
  requireText(schemaStructure,'--dkds-shell-group-height:38px','HARD-13: shell command groups must share the 38 px visual envelope.');
  requireText(componentCss,'--dkds-ca-action-shadow-selected:var(--dkui-component-toolbar-action-shadow-selected','HARD-13: topbar emphasis depth must resolve through Theme component slots, not fixed Core paint.');
  requireRegex(shellNavigation,/\.plugin-context-toolbar \.plugin-toolbar-btn\{[\s\S]*?height:34px/,'HARD-13: plugin context commands must use the same 34 px action body.');

  // HARD-14: Presenter-generated 参数 / 检查 / 组图 are one command family.
  requireText(desktopShell,"button.className='toolbar-btn plugin-toolbar-btn dkds-presentation-command'",'HARD-14: Desktop Presenter surface commands need the canonical presentation-command geometry class.');
  requireText(desktopShell,"button.dataset.pluginSection='presentation-surfaces'",'HARD-14: Presenter surface commands must form one section without internal separators.');
  requireRegex(shellNavigation,/\.plugin-context-toolbar \.dkds-presentation-command\{[\s\S]*?width:auto;[\s\S]*?min-width:48px;[\s\S]*?max-width:none/,'HARD-14: Presenter commands must keep a 48 px minimum while allowing long labels to breathe.');

  // HARD-15: both scientific renderers use one floating toolbar contract.
  for(const [name,source] of [['ChartRuntime',scientificChart],['ScientificCurve',scientificNav]]){
    requireText(source,"dkds-scientific-nav-tools",`HARD-15: ${name} must use the shared scientific navigation class.`);
    requireText(source,"dkds-integrated-action-group dkds-material-role-floating",`HARD-15: ${name} must use the shared floating Material contract.`);
    requireText(source,"drag.dataset.dkdsComponentIdentity='toolbarAction'",`HARD-15: ${name} drag affordance must be a canonical toolbarAction.`);
    requireText(source,"drag.dataset.dkdsComponentVariant='quiet'",`HARD-15: ${name} drag affordance must use the same quiet appearance as its buttons.`);
  }
  requireRegex(workspaceStructure,/\.main-plot-tools\{[\s\S]*?padding:3px;[\s\S]*?height:34px/,'HARD-15: main plot tools must use the 34 px / 3 px compact-strip geometry.');
  requireRegex(workspaceStructure,/\.main-legend-bar\{[\s\S]*?height:34px;[\s\S]*?padding:3px/,'HARD-15: main legend must use the same 34 px / 3 px compact-strip geometry.');
  requireRegex(materialCss,/#mainPlotTools\.dkds-material-role-control,[\s\S]*?#mainLegendBar\.dkds-material-role-control[\s\S]*?border-radius:9px/,'HARD-15: main tools and legend must share one Material edge contract.');

  // HARD-16: nested headers may own a tonal Component band, but never an
  // independent optical material layer. Material Renderer still uniquely owns
  // backdrop/specular/depth composition for the parent Surface.
  forbidRegex(componentCss,/\[data-dkds-component-identity="(?:panelHeader|inspectorHeader)"\][^{]*\{[^}]*(?:backdrop-filter|filter\s*:|box-shadow\s*:(?!none))/s,'HARD-16: panel/inspector headers must not become independent optical material surfaces.');
  requireText(materialCss,'Header-owned command wrappers are transparent composition only.','HARD-16: Material Renderer must flatten nested command wrappers inside headers.');

  // HARD-17: canonical fields/actions own their own control paint, and the
  // Material Renderer must not add a second independent control surface.
  requireText(semanticRegistry,"const CANONICAL_CONTROL_COMPONENTS=new Set(['toolbarAction','tab','menuItem','chip','field'])",'HARD-17: canonical control paint-owner set must remain explicit.');
  requireText(materialRenderer,'Semantic.semanticControlOwnsPaint','HARD-17: Material Renderer must respect canonical control paint ownership.');
  requireRegex(componentCss,/\[data-dkds-component-identity="field"\]\{[\s\S]*?background:[^;]+;[\s\S]*?border:1px[^;]+;[\s\S]*?box-shadow:none/,'HARD-17: Field Component Appearance must be the canonical field paint owner.');



  // HARD-18: canonical Material surfaces may keep geometry in Presentation,
  // but Presentation must not repaint their optical background/border/shadow.
  requireText(semanticRegistry,'.analysis-chart-title,.dkds-chart-head,.dkds-plot-view-head','HARD-18: generic chart heads must be part of canonical panel-header semantics.');
  const surfaceClasses=['topbar','project-tabs-bar','left-panel','floating-panel','floating-header','analysis-chart-title','dkds-chart-head','dkds-surface-header','dkds-plot-view-head','dkds-group-plot-head','docked-group-slot','dkds-portable-view'];
  for(const file of fs.readdirSync(path.join(root,'src','styles','presentation')).filter(name=>name.endsWith('.css'))){
    const css=fs.readFileSync(path.join(root,'src','styles','presentation',file),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
      const selector=match[1].replace(/\s+/g,' ').trim(),body=match[2];
      const ownsSurface=surfaceClasses.some(name=>new RegExp(`(?:^|[\\s>+~,])\\.${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=[.#:\\[\\s>+~,]|$)`).test(selector));
      if(!ownsSurface)continue;
      if(/(?:^|;)\s*(?:background(?:-[\w-]+)?|box-shadow|border(?:-(?:top|right|bottom|left))?(?!-radius)\b)\s*:/m.test(body))failures.push(`HARD-18: presentation/${file} repaints canonical Material surface: ${selector}`);
    }
  }



  // HARD-19: Import Workbench is one modal workspace Material surface. Internal
  // editor regions may carry semantic state/dividers but must not restore the
  // historical stack of opaque white cards or private shadows.
  const importCss=read('src/styles/presentation/import-workbench.css');
  forbidRegex(importCss,/#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/i,'HARD-19: Import Workbench must not hard-code theme colors.');
  requireRegex(importCss,/\.import-section\{[^}]*background:transparent[^}]*box-shadow:none/s,'HARD-19: Import editor sections must remain flat inside the modal workbench.');
  requireRegex(importCss,/\.import-workbench-header[^}]*\.import-file-actions[\s\S]*?background:transparent/s,'HARD-19: Import layout regions must not place an opaque sheet over the workbench Material.');

  // HARD-20: LAN/Web floating panel owns optical composition. Internal service
  // groups stay quiet; literal white is allowed only for the QR-code paper.
  const connectivityRules=connectivityCss.replace(/\/\*[\s\S]*?\*\//g,'');
  for(const match of connectivityRules.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=match[1].replace(/\s+/g,' ').trim(),body=match[2];
    if(selector.includes('.lan-web-qr-image'))continue;
    if(/#[0-9a-f]{3,8}\b/i.test(body))failures.push(`HARD-20: LAN presentation hard-codes theme paint outside QR paper: ${selector}`);
  }
  requireRegex(connectivityCss,/\.lan-web-body\{background:transparent;background-image:none/s,'HARD-20: LAN body must remain transparent under the elevated Material owner.');
  requireRegex(connectivityCss,/lan-web-status-card[^}]*background:transparent[^}]*box-shadow:none/s,'HARD-20: LAN service groups must not create a second opaque/shadowed card layer.');

  // HARD-21: Plugin DevTools is one elevated Material owner. Its header/nav
  // are transparent composition and Theme Inspector close uses canonical action paint.
  requireText(devtools,'dkds-plugin-devtools-window dkds-material-role-elevated','HARD-21: Plugin DevTools window must declare the elevated Material role.');
  requireText(devtools,"DKDSMaterialSurface?.apply?.(overlay.querySelector('.dkds-plugin-devtools-window'),'elevated')",'HARD-21: Plugin DevTools must apply its elevated Material role at creation time.');
  forbidRegex(devtoolsCss,/\.dkds-plugin-devtools-window\{[^}]*(?:background|box-shadow)\s*:/s,'HARD-21: Plugin DevTools window must not privately repaint its Material surface.');
  requireRegex(devtoolsCss,/\.dkds-plugin-devtools-window>header\{[^}]*background:transparent[^}]*box-shadow:none/s,'HARD-21: Plugin DevTools header must remain transparent under the parent Material.');
  requireRegex(devtoolsCss,/\.dkds-plugin-devtools-window>nav\{[^}]*background:transparent[^}]*box-shadow:none/s,'HARD-21: Plugin DevTools tab rail must remain transparent under the parent Material.');
  requireText(read('src/core/theme/debug-runtime.js'),'dkds-theme-debug-exit dkds-panel-close-button','HARD-21: Theme Inspector exit must consume the canonical close-action appearance.');
  forbidRegex(devtoolsCss,/\.dkds-theme-debug-exit:(?:hover|focus-visible)[^{]*\{[^}]*(?:background|border-color|box-shadow)\s*:/s,'HARD-21: Theme Inspector exit must not maintain private hover/focus paint.');

  // HARD-22: Plugin Manager tags/counters consume canonical Chip appearance;
  // presentation may own category layout but not a parallel light/dark palette.
  const pluginChromeCss=read('src/styles/presentation/plugin-chrome.css');
  forbidRegex(pluginChromeCss,/#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b|rgba?\(/i,'HARD-22: Plugin Manager presentation must not restore hard-coded theme colors.');
  requireText(pluginManager,'plugin-type-badge type-${escapeHtml(typeMeta.id)}" data-dkds-component-identity="chip"','HARD-22: plugin type tags must explicitly consume canonical Chip appearance.');
  requireText(pluginManager,'plugin-status-badge" data-dkds-component-identity="chip"','HARD-22: plugin status tags must explicitly consume canonical Chip appearance.');
  requireText(pluginManager,'plugin-capability-chip" data-dkds-component-identity="chip"','HARD-22: plugin capability tags must explicitly consume canonical Chip appearance.');
  requireText(read('src/index.html'),'plugin-manager-visible-count" data-dkds-component-identity="chip"','HARD-22: Plugin Manager visible-count tag must consume canonical Chip appearance.');
  forbidRegex(pluginChromeCss,/html\[data-dkds-theme="dark"\][^{]*\.plugin-type-badge/s,'HARD-22: plugin type tags must not fork a dark-mode palette outside Theme.');

  // HARD-24: Presentation is theme-neutral by default. Literal paint is
  // reserved for visualization marks, modal scrims, and QR content; ordinary
  // shell/page chrome must consume semantic Theme tokens instead of forking a
  // light/dark palette inside Presentation.
  const presentationLiteralAllowlist=Object.freeze({
    'connectivity.css':[selector=>selector.includes('.lan-web-qr-image')],
    'dialogs.css':[selector=>selector.includes('.dkds-dialog-overlay')],
    'import-workbench.css':[selector=>selector.includes('.import-panel-overlay')],
    'plugin-devtools.css':[selector=>selector.includes('.dkds-plugin-devtools')],
    'scientific.css':[
      selector=>selector.includes('.brush .selection'),
      selector=>selector.includes('.dkds-scientific-direct-box.is-range'),
      selector=>selector.includes('.dkds-scientific-direct-box.is-zoom'),
      selector=>selector.includes('.dkds-scientific-persisted-range')
    ],
    'shell.css':[
      selector=>selector.includes('.direct-range-box'),
      selector=>selector.includes('.direct-zoom-box'),
      selector=>selector.includes('.dkds-direct-point-handle'),
      selector=>selector.includes('.dkds-overlay'),
      selector=>selector.includes('.project-save-choice-backdrop')
    ]
  });
  for(const file of fs.readdirSync(path.join(root,'src','styles','presentation')).filter(name=>name.endsWith('.css'))){
    const css=fs.readFileSync(path.join(root,'src','styles','presentation',file),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
      const selector=match[1].replace(/\s+/g,' ').trim(),body=match[2];
      if(selector===':root'||selector==='html[data-dkds-theme="dark"]'||selector==='from'||selector==='to'||/^\d+%$/.test(selector))continue;
      if(!/(?:#[0-9a-f]{3,8}\b|rgba?\()/i.test(body))continue;
      const allowed=(presentationLiteralAllowlist[file]||[]).some(test=>test(selector));
      if(!allowed)failures.push(`HARD-24: presentation/${file} hard-codes ordinary UI paint instead of Theme semantics: ${selector}`);
    }
  }
  forbidRegex(read('src/styles/presentation/shell.css'),/html\[data-dkds-theme="dark"\] body\.dkds-modern-ui \.brand(?:-mark)?\s*\{/s,'HARD-24: Shell branding must not fork a private dark-mode palette.');

  // HARD-23: dialog elevated Material must remain visible through its own
  // header/footer; modal actions are canonical ToolbarAction paint owners.
  const dialogsCss=read('src/styles/presentation/dialogs.css');
  requireRegex(dialogsCss,/\.dkds-dialog-header\{[^}]*background:transparent[^}]*box-shadow:none/s,'HARD-23: Dialog header must remain transparent inside the elevated Material owner.');
  requireRegex(dialogsCss,/\.dkds-dialog-footer\{[^}]*background:transparent[^}]*box-shadow:none/s,'HARD-23: Dialog footer must remain transparent inside the elevated Material owner.');
  forbidRegex(dialogsCss,/body\.dkds-modern-ui \.dkds-dialog-(?:header|footer)\{[^}]*background:(?!transparent)/s,'HARD-23: high-specificity dialog rules must not restore an opaque header/footer strip.');
  forbidRegex(dialogsCss,/\.dkds-dialog-action(?:\.[\w-]+)?\{[^}]*(?:background|border-color|box-shadow|color)\s*:/s,'HARD-23: Dialog action paint must stay in canonical Component Appearance.');
  const dialogRuntime=read('src/core/ui/modules/dialog/settings.js');
  requireText(dialogRuntime,"button.dataset.dkdsComponentIdentity='toolbarAction'",'HARD-23: Dialog actions must enter the canonical ToolbarAction system synchronously.');
  requireText(dialogRuntime,"kind==='danger'?'destructive'",'HARD-23: Dialog danger action kind must map to the canonical destructive variant.');
  requireText(dialogRuntime,"button.dataset.dkdsComponentVariant=variant",'HARD-23: Dialog action kind must be declared as a canonical semantic variant before first paint.');

  // HARD-25: optical occlusion is a renderer/content-cover failure, not a
  // synonym for "has an opaque ancestor". Opaque ancestors can still host
  // valid backdrop sampling of sibling/scientific content.
  requireText(materialRenderer,"occlusionSource='self'",'HARD-25: Material Renderer must distinguish self repaint occlusion.');
  requireText(materialRenderer,"occlusionSource='child'",'HARD-25: Material Renderer must distinguish opaque descendant occlusion.');
  requireText(materialRenderer,'coverage>=.72','HARD-25: opaque descendant detection must require substantial visual coverage.');
  requireText(materialRenderer,'alpha>=.985','HARD-25: opaque descendant detection must require an actually opaque layer.');
  forbidText(materialRenderer,"&&opaqueParent)status='OPAQUE_PARENT_OCCLUSION'",'HARD-25: an opaque ancestor alone must never fail Material rendering.');
  requireText(materialRenderer,'color\\(srgb','HARD-25: Material alpha parsing must understand Chromium color(srgb ...) output.');

  // HARD-26: layout/content wrappers below a canonical Material owner must not
  // reintroduce an opaque sheet in Presentation. Theme Renderer keeps a runtime
  // flattening fail-safe, but authored Presentation must be clean by itself.
  const flattenDescendants=['analysis-page-body','plugin-manager-body','automation-test-body','dkds-settings-body','floating-body','dkds-plugin-canvas-frame','dkds-plugin-canvas-center','dkds-plugin-canvas-left','dkds-plugin-canvas-right','dkds-plugin-canvas-bottom','dkds-analysis-primary-host'];
  for(const file of fs.readdirSync(path.join(root,'src','styles','presentation')).filter(name=>name.endsWith('.css'))){
    const css=fs.readFileSync(path.join(root,'src','styles','presentation',file),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
      const selector=match[1].replace(/\s+/g,' ').trim(),body=match[2];
      if(!flattenDescendants.some(name=>new RegExp(`(?:^|[\\s>+~,])\\.${name}(?=[.#:\\[\\s>+~,]|$)`).test(selector)))continue;
      const painted=[...body.matchAll(/(?:^|;)\s*(background(?:-color|-image)?)\s*:\s*([^;]+)/gm)]
        .filter(row=>!/^transparent(?:\s*!important)?$/i.test(String(row[2]||'').trim())&&!/^none(?:\s*!important)?$/i.test(String(row[2]||'').trim()));
      if(painted.length)failures.push(`HARD-26: presentation/${file} repaints Material content wrapper: ${selector}`);
    }
  }
  requireText(materialCss,'.analysis-page-body,.plugin-manager-body,.automation-test-body,.dkds-settings-body,.floating-body,.dkds-plugin-canvas-frame','HARD-26: Material Renderer must retain runtime flattening for canonical content wrappers.');

  // HARD-27: panel/workspace headers inherit the nearest semantic Material
  // owner even when a transparent layout wrapper sits between them. Do not
  // regress to direct-parent-only detection and create a second glass strip.
  requireText(materialRenderer,'while(parent&&parent!==document.body&&parent!==document.documentElement&&depth<6)','HARD-27: nested header ownership must search the nearest Material ancestor.');
  requireText(materialRenderer,'if(parent.matches?.(MATERIAL_OWNER_SELECTOR))','HARD-27: nested header ownership must resolve through canonical Material owners.');
  forbidText(materialRenderer,"const parent=el?.parentElement;if(!parent?.matches?.(MATERIAL_OWNER_SELECTOR))return ''",'HARD-27: direct-parent-only header ownership must not return.');

  // HARD-28: canonical Chip and ToolbarAction appearance has one idle paint
  // owner. Presentation may arrange these controls, but must not quietly
  // reintroduce a local background/text/border palette that outranks Theme.
  const canonicalPresentationSelectors=[
    '.dkds-chip','.plugin-capability-chip','.plugin-status-badge','.plugin-type-badge',
    '.plugin-role-badge','.plugin-owned-badge','.dkds-summary-chip','#contextOverflowBtn'
  ];
  const canonicalIdlePaint=/(?:^|;)\s*(?:background(?:-color|-image)?|color|-webkit-text-fill-color|border(?:-(?:top|right|bottom|left)-color|-color)?|box-shadow|text-shadow)\s*:/m;
  for(const file of fs.readdirSync(path.join(root,'src','styles','presentation')).filter(name=>name.endsWith('.css'))){
    const css=fs.readFileSync(path.join(root,'src','styles','presentation',file),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
      const selector=match[1].replace(/\s+/g,' ').trim();
      if(!canonicalPresentationSelectors.some(token=>selector.includes(token)))continue;
      if(canonicalIdlePaint.test(match[2]))failures.push(`HARD-28: presentation/${file} repaints canonical Chip/ToolbarAction appearance: ${selector}`);
    }
  }
  requireRegex(componentCss,/\[data-dkds-component-identity="chip"\]\{[^}]*border:1px solid var\(--dkui-component-chip-border,transparent\)[^}]*border-radius:999px[^}]*background:/s,'HARD-28: canonical Chip border/radius/idle paint must live together in Component Appearance.');

  // HARD-29: public Design System elevated/floating helpers and the memory
  // breakdown panel are semantic Material owners, never Presentation-painted
  // lookalikes. This keeps Plugin API 1.19 surface classes Theme-native.
  requireRegex(semanticRegistry,/id:'elevated'[^\n]+dkds-surface-elevated/,'HARD-29: dkds-surface-elevated must resolve through the elevated Material role.');
  requireRegex(semanticRegistry,/id:'floating'[^\n]+dkds-floating-surface/,'HARD-29: dkds-floating-surface must resolve through the floating Material role.');
  requireText(semanticRegistry,".zoom-panel,.dkds-floating-surface,.floating-panel",'HARD-29: runtime role inference must classify dkds-floating-surface as floating.');
  requireText(semanticRegistry,".dkds-theme-settings-dialog,.dkds-surface-elevated'))return 'elevated'",'HARD-29: runtime role inference must classify dkds-surface-elevated as elevated.');
  forbidRegex(read('src/styles/presentation/shell.css'),/\.dkds-(?:surface-elevated|floating-surface)\s*\{[^}]*(?:background|border|box-shadow|color)\s*:/s,'HARD-29: Presentation must not repaint public elevated/floating semantic Material primitives.');
  forbidRegex(read('src/styles/presentation/plugin-chrome.css'),/\.dkds-memory-panel\s*\{[^}]*(?:background|border|box-shadow|color)\s*:/s,'HARD-29: Memory panel outer Material paint must stay out of Presentation.');
  requireRegex(materialCss,/\.dkds-memory-panel\.dkds-material-role-floating\{[^}]*border-width:1px[^}]*border-radius:13px/s,'HARD-29: Material Renderer must own memory-panel edge/radius geometry.');

  // HARD-30: generic semantic Surface and Dialog shells are Material owners.
  // Presentation may style their content, but not repeat outer text/radius/edge
  // appearance already determined by Material role + recipe.
  const shellPresentation=read('src/styles/presentation/shell.css');
  forbidRegex(shellPresentation,/\.dkds-surface\s*\{[^}]*(?:color|background|border|box-shadow)\s*:/s,'HARD-30: dkds-surface outer Material appearance must stay out of Presentation.');
  forbidRegex(shellPresentation,/\.dkds-surface-header\s*\{[^}]*(?:color|background|border-color|box-shadow)\s*:/s,'HARD-30: generic SurfaceHeader color/material must come from semantic chrome ownership.');
  const dialogPresentation=read('src/styles/presentation/dialogs.css');
  forbidRegex(dialogPresentation,/\.dkds-dialog(?:,\.dkds-dialog-shell)?\s*\{[^}]*(?:color|background|border-radius|box-shadow)\s*:/s,'HARD-30: Dialog outer Material appearance must stay out of Presentation.');
  forbidRegex(dialogPresentation,/\.dkds-settings-dialog\s*\{[^}]*(?:color|background|border|box-shadow)\s*:/s,'HARD-30: Settings Dialog outer Material appearance must stay out of Presentation.');
  forbidRegex(read('src/styles/presentation/import-workbench.css'),/\.import-workbench\s*\{[^}]*color\s*:/s,'HARD-30: Import Workbench outer text must come from its semantic Surface role.');
  requireRegex(materialCss,/\.dkds-surface\.dkds-material-role-surface\{[^}]*border-radius:var\(--dkds-visual-radius\)/s,'HARD-30: Material Renderer must own generic Surface radius.');
  requireRegex(materialCss,/:where\(\.dkds-dialog,\.dkds-dialog-shell\)\.dkds-material-role-elevated\{[^}]*border-radius:14px/s,'HARD-30: Material Renderer must own Dialog shell radius.');

  // HARD-31: semantic workspace/header/table hosts inherit Material text, and
  // the range action menu is a real popover Material rather than a transparent
  // Presentation shell with its own edge/shadow contract.
  const analysisPresentation=read('src/styles/presentation/analysis.css');
  forbidRegex(analysisPresentation,/\.analysis-page-body[^{}]*\{[^}]*color\s*:/s,'HARD-31: Analysis page body must inherit semantic workspace text color.');
  forbidRegex(analysisPresentation,/\.dkds-analysis-workbench\s*\{[^}]*color\s*:/s,'HARD-31: Analysis Workbench text must come from its surface Material role.');
  const pluginPresentation=read('src/styles/presentation/plugin-chrome.css');
  forbidRegex(pluginPresentation,/(?:analysis-page-header|plugin-manager-header)[^{}]*\{[^}]*color\s*:/s,'HARD-31: semantic page headers must not carry a parallel Presentation text palette.');
  forbidRegex(pluginPresentation,/\.dkds-plugin-workspace\s*\{[^}]*color\s*:/s,'HARD-31: Plugin Workspace text must inherit surface Material role.');
  forbidRegex(read('src/styles/presentation/scientific.css'),/\.dkds-table-surface-host\s*\{[^}]*color\s*:/s,'HARD-31: TableSurface host text must inherit its surface Material role.');
  forbidRegex(shellPresentation,/\.range-action-menu\s*\{[^}]*(?:background|border|box-shadow)\s*:/s,'HARD-31: Range action popover must not be repainted by Presentation.');
  requireRegex(materialCss,/\.range-action-menu\.dkds-material-role-popover\{[^}]*border-width:1px[^}]*border-radius:10px/s,'HARD-31: Material Renderer must own range-action popover edge/radius.');

  // HARD-32: outer edge geometry for portable/floating/popover Material owners
  // belongs to Material Renderer. Presentation may position or animate these
  // surfaces, but must not carry a second radius contract.
  forbidRegex(pluginPresentation,/\.dkds-portable-view(?:\.is-docked)?\s*\{[^}]*border-radius\s*:/s,'HARD-32: PortableView outer radius must stay out of Presentation.');
  forbidRegex(dialogPresentation,/(?:\.command-menu|\.dkds-context-menu)\s*\{[^}]*border-radius\s*:/s,'HARD-32: Popover outer radius must stay out of Presentation.');
  forbidRegex(shellPresentation,/\.floating-panel\s*\{[^}]*border-radius\s*:/s,'HARD-32: floating-panel outer radius must stay out of Presentation.');
  requireRegex(materialCss,/\.command-menu\.dkds-material-role-popover\{[^}]*border-radius:9px/s,'HARD-32: Material Renderer must own command-menu radius.');
  requireRegex(materialCss,/\.dkds-context-menu\.dkds-material-role-popover\{[^}]*border-radius:10px/s,'HARD-32: Material Renderer must own context-menu radius.');
  requireRegex(materialCss,/\.dkds-portable-view\.dkds-material-role-floating\{[^}]*border-radius:10px/s,'HARD-32: Material Renderer must own floating PortableView radius.');
  requireRegex(materialCss,/\.dkds-portable-view:is\(\.dkds-material-role-surface,\.dkds-material-role-sidebar\)[^{]*\{[^}]*border-radius:8px/s,'HARD-32: Material Renderer must own docked PortableView radius.');
  requireRegex(materialCss,/\.floating-panel:is\(\.dkds-material-role-floating,\.dkds-material-role-elevated\)\{[^}]*border-radius:var\(--ui-panel-radius\)/s,'HARD-32: Material Renderer must own floating-panel radius.');

  // HARD-33: a Trend Card is the scientific Material owner; its legend is a
  // transparent content region. Registering both produces nested optical
  // surfaces under glass themes and recreates the card-within-card look.
  forbidText(semanticRegistry,'.analysis-chart-card,.trend-card-legend,.analysis-control-card','HARD-33: Trend legend must not be registered as a scientific Material surface.');
  forbidText(semanticRegistry,'.plugin-manager-toolbar-card,.trend-card-legend,.analysis-control-card','HARD-33: runtime role inference must not classify Trend legend as a Material surface.');
  requireRegex(read('src/styles/presentation/scientific.css'),/\.trend-card-legend\s*\{[^}]*background:transparent/s,'HARD-33: Trend legend content region must remain transparent inside its Material-owning card.');

  // HARD-34: Material-owning cards express state through semantic Material
  // variables rather than painting status-specific surfaces in Presentation.
  const managerRuntime=read('src/core/plugins/manager-ui.js');
  requireText(managerRuntime,'card.dataset.dkdsMaterialState=status.className','HARD-34: Plugin Manager cards must publish semantic Material state.');
  requireText(managerRuntime,'data-dkds-material-state="error"','HARD-34: Plugin Manager error summary must publish semantic Material state.');
  forbidRegex(pluginPresentation,/\.plugin-manager-(?:card|stat)[^{]*\{[^}]*(?:background|border-color)\s*:/s,'HARD-34: Plugin Manager Material surfaces must not paint status background/border in Presentation.');
  for(const state of ['active','error','disabled'])requireText(materialRoles,`[data-dkds-material-state="${state}"]`,`HARD-34: Material Role layer must support ${state} semantic surface state.`);
  requireRegex(materialRoles,/\[data-dkds-material-state="error"\]\{[^}]*--dkds-material-border:[^}]*--dkds-material-base:/s,'HARD-34: error surface state must retarget Material tokens rather than direct paint.');

  // HARD-35: Material role text color is theme-owned. Presentation must not
  // rebuild a private dark palette for shell chrome/sidebar owners.
  forbidRegex(shellPresentation,/html\[data-dkds-theme="dark"\][^{]*(?:\.topbar|\.left-panel)\s*\{[^}]*color\s*:/s,'HARD-35: shell Material owners must not carry dark-mode text-color overrides in Presentation.');
  requireRegex(materialRoles,/data-dkds-material-role="chrome"[\s\S]*?color:var\(--dkui-role-chrome-text/s,'HARD-35: chrome role must own semantic text color.');
  requireRegex(materialRoles,/data-dkds-material-role="sidebar"[\s\S]*?color:var\(--dkui-role-sidebar-text/s,'HARD-35: sidebar role must own semantic text color.');

  // HARD-36: Windows/Electron Visual Closure must include a runtime computed-
  // geometry gate. Keep the runner orchestration small; visual assertions live
  // in their own diagnostics module so neither existing diagnostics module
  // regresses toward a monolith.
  const automationRuntime=read('src/diagnostics/automation-test-runtime.js');
  const automationVisual=read('src/diagnostics/automation-visual-cases.js');
  requireText(automationRuntime,"runCase('ui.visual-geometry-closure'",'HARD-36: Automation Runtime must retain the Desktop Visual Closure computed-geometry case.');
  requireText(automationRuntime,'visualGeometryClosureSmoke','HARD-36: Automation Runtime must dispatch the dedicated visual smoke case.');
  requireText(automationVisual,'getBoundingClientRect','HARD-36: runtime visual closure must measure actual DOM geometry.');
  requireText(automationVisual,'getComputedStyle','HARD-36: runtime visual closure must inspect computed appearance.');
  requireText(automationVisual,"document.getElementById('inspectorDockSlot')",'HARD-36: runtime visual closure must validate the Inspector dock host.');
  requireRegex(automationVisual,/Inspector dock host must remain transparent:[^`]*\$\{dockStyle\.backgroundColor\}/s,'HARD-36: Inspector dock transparency must be an executable runtime assertion.');
  requireRegex(automationVisual,/Topbar action must be 34px high:[^`]*\$\{r\.height\.toFixed\(2\)\}px/s,'HARD-36: runtime visual closure must protect 34px topbar actions.');
  requireRegex(automationVisual,/Topbar group envelope must be 38px:[^`]*\$\{group\.className\}/s,'HARD-36: runtime visual closure must protect the 38px topbar group envelope.');
  requireText(automationVisual,'Presenter command must be at least 48px wide and 34px high:','HARD-36: runtime visual closure must protect semantic-width Desktop Presenter commands.');
  requireText(automationVisual,"info?.componentContext==='grouped'",'HARD-36: runtime visual closure must exercise grouped Component Context resolution.');
  requireText(automationVisual,"info?.materialRole==='chrome'",'HARD-36: runtime visual closure must exercise Component × Material Role composition.');
  requireText(automationVisual,"context==='workspace-modal'",'HARD-36: runtime visual closure must exercise workspace-modal Material Context resolution.');
  requireRegex(automationVisual,/Main Plot Tools[^\n]*Main Legend/,'HARD-36: runtime visual closure must validate both Scientific main tools and legend chrome.');
  requireText(automationVisual,".dkds-portable-placement-trigger",'HARD-36: runtime visual closure must protect Theme Picker from PortableView placement chrome.');
  requireText(automationVisual,".trend-card-legend",'HARD-36: runtime visual closure must verify Trend Legend remains transparent child content.');
  requireText(automationVisual,".dkds-scientific-surface-host > .dkds-scientific-nav-tools",'HARD-36: runtime visual closure must compare ScientificCurve navigation geometry.');
  requireText(automationVisual,".dkds-scientific-chart-host > .dkds-scientific-nav-tools",'HARD-36: runtime visual closure must compare ChartRuntime navigation geometry.');
  requireText(automationVisual,".dkds-portable-header .dkds-portable-controls button",'HARD-36: runtime visual closure must validate Portable header controls.');
  requireText(automationVisual,".dkds-panel-close-button",'HARD-36: runtime visual closure must validate shared close-button geometry.');
  requireText(automationVisual,".dkds-plugin-canvas-frame.has-canvas-left.has-canvas-right",'HARD-36: runtime visual closure must validate actual desktop workspace grid geometry.');

  // HARD-37: runtime chart-header acceptance must consume the same parent-owned
  // chrome ownership contract as Theme Coverage. Reading roleOf() directly is
  // invalid here because CSS custom properties can inherit the parent Surface
  // role even when the nested header is intentionally not a Material owner.
  requireText(automationRuntime,"ownership?.(header,'chrome')",'HARD-37: Automation chart-header gate must use Material ownership semantics.');
  requireText(automationRuntime,"ownership.status==='MATERIAL_PARENT_OWNED'",'HARD-37: Automation chart-header gate must recognize parent-owned chrome.');
  forbidText(automationRuntime,"Analysis chart title is not Core chrome",'HARD-37: obsolete roleOf-only chart-header assertion must not return.');

  // HARD-38: Component Appearance may parameterize a Material-owning toolbar,
  // but Material Renderer remains its only background/border/shadow painter.
  const componentAppearance=read('src/styles/theme/component-appearance.css');
  requireRegex(componentAppearance,/data-dkds-component-identity="toolbarGroup"[^}]*--dkds-material-base:[^}]*--dkds-material-border:/s,'HARD-38: ToolbarGroup must feed semantic tokens into Material rendering.');
  requireRegex(componentAppearance,/data-dkds-component-identity="toolbarGroup"\]:not\(:is\([^}]*dkds-floating-surface[^}]*\)\)\{[^}]*background:/s,'HARD-38: only non-Material ToolbarGroup may paint its own background.');
  requireRegex(materialCss,/data-dkds-component-identity="toolbarGroup"\]:is\(\.dkds-material-role-surface,\.dkds-material-role-floating\)\{[^}]*border-width:1px/s,'HARD-38: Material Renderer must own edge geometry for Material toolbar groups.');
  requireText(read('src/plugins/resonance-workbench/view-components.js'),'respar-main-tools dkds-toolbar dkds-floating-surface','HARD-38: Main Plot Tools must compose ToolbarGroup semantics with the shared floating Material surface.');



  // HARD-39: Presenter surface controls are visibility toggles, not selected
  // navigation. Multiple panels can be visible simultaneously, so selected
  // paint creates a row of competing primary pills under colorful themes.
  requireText(desktopShell,"button.dataset.dkdsComponentVariant=item.active?'active':'quiet'",'HARD-39: Presenter surface toggles must use soft active semantics.');
  requireText(desktopShell,"button.classList.toggle('active',!!item.active)",'HARD-39: Presenter surface toggles must publish active state rather than selected state.');
  forbidText(desktopShell,"button.dataset.dkdsComponentVariant=item.active?'selected':'quiet'",'HARD-39: Presenter surface toggles must not regress to selected paint.');

  // HARD-40: Import Workbench is a large modal workspace. Theme 3.10 keeps
  // it elevated while giving it an explicit workspace-modal Material Context,
  // so glass themes can tune large-surface optics without downgrading semantics.
  requireText(indexHtml,'class="import-workbench dkds-material-role-elevated" data-dkds-material-context="workspace-modal"','HARD-40: Import Workbench must declare elevated + workspace-modal semantics.');
  requireRegex(semanticRegistry,/id:'elevated'[^\n]*\.import-workbench/,'HARD-40: semantic elevated coverage must include Import Workbench.');
  requireText(semanticRegistry,"if(matches(el,'.import-workbench'))return 'workspace-modal'",'HARD-40: Import Workbench must resolve workspace-modal Material Context.');
  requireRegex(materialCss,/\.import-workbench\.dkds-material-role-elevated\{[^}]*border-width:1px[^}]*border-radius:12px/s,'HARD-40: Material Renderer must own Import Workbench edge geometry.');

  // HARD-41: Theme Contract 3.10 exposes bounded composition axes. Theme
  // authors may express depth/context, but Core remains the only final painter.
  const themeContract=read('sdk/theme-contract.js');
  requireText(themeContract,"const VERSION='3.10.0'",'HARD-41: Theme Contract must be 3.10.0.');
  requireText(themeContract,"const MATERIAL_CONTEXTS=Object.freeze(['compact','panel','dialog','workspace-modal'])",'HARD-41: Theme Contract must expose the bounded Material Context vocabulary.');
  requireText(themeContract,"const COMPONENT_CONTEXTS=Object.freeze(['standalone','grouped'])",'HARD-41: Theme Contract must expose the bounded Component Context vocabulary.');
  requireText(themeContract,'resolveComponentAppearance','HARD-41: Theme Contract must own contextual component composition.');
  requireText(themeContract,'resolveMaterialContext','HARD-41: Theme Contract must own contextual material composition.');
  requireText(themeContract,"(?:url|var|calc|env|expression|attr)\\s*\\(",'HARD-41: Theme Contract must reject executable/dynamic CSS functions from depth slots.');

  // HARD-42: Component Appearance and Material Renderer consume contextual
  // declarations instead of reintroducing topbar-specific aesthetic patches.
  const contextualComponentRuntime=read('src/core/theme/component-appearance.js');
  requireText(contextualComponentRuntime,"const VERSION='3.0.0'",'HARD-42: Component Appearance contextual resolver must be v3.0.0.');
  requireText(contextualComponentRuntime,'ThemeContract.resolveComponentAppearance','HARD-42: Component Appearance must resolve Theme Contract composition.');
  requireText(materialRenderer,"const VERSION='3.10.0'",'HARD-42: Material Renderer must be v3.10.0.');
  requireText(materialRenderer,'resolveMaterialContext?.','HARD-42: Material Renderer must resolve Material Context through Theme Contract.');
  forbidRegex(componentAppearance,/\.topbar-primary[^}]*box-shadow:[^}]*0 0 0 2px/s,'HARD-42: Core must not hardcode a theme-specific topbar halo.');
  forbidRegex(componentAppearance,/\.topbar-primary[^}]*toolbar-group[^}]*box-shadow:none/s,'HARD-42: Core must not hardcode grouped action depth for every Theme.');

  // HARD-43: Every bundled Theme Provider uses Theme 3.10 declarative
  // contextual composition. This includes the default Theme in Core runtime.
  const themeRuntime=read('src/core/theme/runtime.js');
  const thinGlassTheme=read('src/plugins/thin-glass-theme/plugin.js');
  const auroraTheme=read('src/plugins/aurora-pop-theme/plugin.js');
  requireText(themeRuntime,"version:'3.10.0',contractVersion:'3.10.0'",'HARD-43: Core Default Theme runtime must expose Theme 3.10.');
  requireText(themeRuntime,'componentContexts:()=>COMPONENT_CONTEXTS.slice()','HARD-43: Core Default Theme must expose Component Contexts.');
  requireText(thinGlassTheme,"version:'1.12.1'",'HARD-43: Thin Glass must be migrated to 1.12.1 / Theme 3.10.');
  requireText(thinGlassTheme,"contract:'theme-3.10'",'HARD-43: Thin Glass must declare Theme 3.10 contextual composition.');
  requireText(thinGlassTheme,'contexts:{grouped:', 'HARD-43: Thin Glass must author grouped Component Context depth declaratively.');
  requireText(thinGlassTheme,"'workspace-modal':{materialBlur:",'HARD-43: Thin Glass must author workspace-modal Material Context optics.');
  requireText(auroraTheme,"version:'2.3.1'",'HARD-43: Aurora Pop must be migrated to 2.3.1 / Theme 3.10.');
  requireText(auroraTheme,"contract:'component-appearance-3.10'",'HARD-43: Aurora Pop must declare Theme 3.10 contextual composition.');
  requireText(auroraTheme,'contexts:{grouped:', 'HARD-43: Aurora Pop must author grouped Component Context depth declaratively.');
  requireText(auroraTheme,"'workspace-modal':{materialBlur:",'HARD-43: Aurora Pop must author workspace-modal Material Context optics.');

  // HARD-44: Public SDK authoring must expose the same 3.10 contract as the
  // bundled themes; no private first-party-only composition vocabulary.
  const sdkContract=JSON.parse(read('sdk/contract.json'));
  const sdkTypes=read('sdk/plugin-api.d.ts');
  const themeTemplate=read('sdk/templates/theme-profile/plugin.js');
  requireText(JSON.stringify(sdkContract),'"sdkVersion":"1.24.0"','HARD-44: public SDK must be 1.24.0.');
  requireText(JSON.stringify(sdkContract),'"themeContractVersion":"3.10.0"','HARD-44: SDK must publish Theme Contract 3.10.0.');
  requireText(sdkTypes,"readonly contractVersion:'3.10.0'",'HARD-44: SDK types must expose Theme Contract 3.10.0.');
  requireText(sdkTypes,'DKDSThemeComponentContext','HARD-44: SDK types must expose Component Context.');
  requireText(sdkTypes,'DKDSThemeMaterialContext','HARD-44: SDK types must expose Material Context.');
  requireText(themeTemplate,"themeContract:'^3.10.0'",'HARD-44: official Theme template must target Theme Contract 3.10.');
  requireText(themeTemplate,'contract.appearance.component-contexts','HARD-44: official Theme template must demonstrate Component Context capability.');
  requireText(themeTemplate,'contract.material.contexts','HARD-44: official Theme template must demonstrate Material Context capability.');

  // HARD-45: R4 Windows diagnostics validate composition semantics, not one
  // mandatory aesthetic. Old R3 reports cannot authorize Theme 3.10.
  const visualVerifier=read('tools/quality/verify-visual-closure-report.js');
  const visualCases=read('src/diagnostics/automation-visual-cases.js');
  requireText(automationRuntime,"const VERSION='1.33.0'",'HARD-45: Windows diagnostics must emit Automation Runner 1.33.0.');
  requireText(visualVerifier,'const REQUIRED_RUNNER=[1,33,0]','HARD-45: report verifier must reject pre-R6 Core visual/performance reports.');
  requireText(visualVerifier,'visual.groupedContextChecked','HARD-45: R4 verifier must require grouped Component Context coverage.');
  requireText(visualVerifier,'visual.standaloneContextChecked','HARD-45: R4 verifier must require standalone Component Context coverage.');
  requireText(visualVerifier,'visual.workspaceModalChecked','HARD-45: R4 verifier must require workspace-modal Material Context coverage.');
  requireText(visualCases,"Appearance?.version==='3.0.0'",'HARD-45: Windows visual diagnostics must inspect the contextual Component resolver.');
  forbidText(visualCases,'Integrated topbar action must not stack a second shadow/halo','HARD-45: R4 diagnostics must not impose R3 no-shadow aesthetics on all Themes.');
  forbidText(visualCases,'Standalone emphasized topbar action must use an exact 2px spread halo','HARD-45: R4 diagnostics must not impose a fixed halo on all Themes.');

  // HARD-46: Theme Providers stay declarative. Core theme plugins must not
  // regain selector-owned application paint as Theme expression grows.
  for(const [label,theme] of [['Thin Glass',thinGlassTheme],['Aurora Pop',auroraTheme]]){
    forbidRegex(theme,/querySelector|querySelectorAll|\.style\.|insertRule|styleSheets|adoptedStyleSheets/,'HARD-46: '+label+' must not directly paint Core DOM/selectors.');
  }


  // HARD-47: Theme observers must not rescan D3/SVG class churn. Scientific
  // renderers mutate SVG classes frequently; Theme ownership is HTML chrome.
  requireText(materialRenderer,'materialClassRelevant','HARD-47: Material observer must prefilter class mutations by semantic material classes.');
  requireText(materialRenderer,'ignoredNonHtml','HARD-47: Material observer must track and ignore non-HTML mutation churn.');
  requireText(semanticRegistry,'htmlElement','HARD-47: Semantic observer must ignore non-HTML/SVG attribute churn.');
  requireText(contextualComponentRuntime,'pendingAppearanceRoots','HARD-47: Component Appearance must batch mutation-driven recomposition.');
  requireText(contextualComponentRuntime,'requestFrame','HARD-47: Component Appearance recomposition must be frame-coalesced.');

  // HARD-48: Material Context assignment must be idempotent. Rewriting the same
  // data attribute can recursively feed MutationObserver and create idle churn.
  requireText(materialRenderer,"setData(el,'dkdsMaterialContext',context)",'HARD-48: Material Context assignment must use idempotent setData.');
  forbidText(materialRenderer,'el.dataset.dkdsMaterialContext=context','HARD-48: direct repeated Material Context writes must not return.');
  requireText(automationRuntime,"runCase('ui.theme-runtime-performance'",'HARD-48: Windows automation must retain an idle Theme Runtime budget case.');
  requireText(automationVisual,'themeRuntimePerformanceSmoke','HARD-48: Theme Runtime performance smoke must live in visual diagnostics.');
  requireText(visualVerifier,"'ui.theme-runtime-performance'",'HARD-48: release verifier must require Theme Runtime performance acceptance.');

  // HARD-49: Controlled Theme effects must be consumed by the Core Material
  // renderer. Theme expression is not useful if effect tokens are accepted but
  // visually discarded. Intensity is normalized to a CSS percentage by Core.
  requireText(themeRuntime,"key==='glowIntensity'?",'HARD-49: Theme Runtime must project normalized glow intensity into CSS percentage units.');
  requireText(materialCss,'--dkds-material-theme-overlay','HARD-49: Material Renderer must consume controlled Theme effect overlays.');
  requireText(materialCss,'--dkui-effect-header-gradient-start','HARD-49: Core chrome must consume Theme header gradient expression.');
  requireText(materialCss,'--dkui-effect-accent-glow','HARD-49: Core elevated/popover surfaces must consume Theme accent glow expression.');
  requireText(materialCss,'--dkui-effect-edge-glow','HARD-49: Core floating surfaces must consume Theme edge glow expression.');

  // HARD-50: status popovers are anchored/portable-safe instead of receiving stray placement chrome.
  requireText(statusPlugin,"'data-dkds-portable':'false'",'HARD-50: Status Monitor temporary surfaces must explicitly opt out of PortableView chrome.');
  requireText(statusPlugin,'positionThemePanel','HARD-50: Theme Picker must anchor to the Theme status command.');
  // HARD-51: scientific and mode-control buttons are integrated semantic groups.
  requireText(semanticRegistry,'.dkds-mode-group,.dkds-scientific-nav-tools','HARD-51: mode and ScientificPlot navigation controls must resolve grouped Component Context.');
  // HARD-52: title hierarchy is a Core Component band inside the parent Material.
  requireRegex(componentAppearance,/component-identity=\"panelHeader\"[\s\S]*?background:var\(--dkui-component-panel-header-surface/,'HARD-52: PanelHeader must consume Theme tonal-band appearance.');
  requireRegex(componentAppearance,/component-identity=\"inspectorHeader\"[\s\S]*?background:var\(--dkui-component-inspector-header-surface/,'HARD-52: InspectorHeader must consume Theme tonal-band appearance.');
  // HARD-53: TER summary metadata must not masquerade as a ToolbarGroup.
  requireText(terSharedViews,'id=\\"terSummary\\" class=\\"dkds-summary-strip\\"','HARD-53: TER summary must use the metadata strip contract.');
  // HARD-54: Resonance main tools use equal-inset integrated chrome and legend remains content.
  requireText(resonanceView,'respar-main-tools dkds-toolbar dkds-floating-surface dkds-integrated-action-group','HARD-54: Resonance main tools must use integrated action composition.');
  requireText(resonanceView,'respar-main-legend dkds-scroll-x-compact dkds-legend-strip','HARD-54: Resonance legend must be a light content strip, not a ToolbarGroup/Surface.');

  // HARD-55: Semantic assignment must batch child additions. The R5 Windows
  // report proved full-root semantic rescans remained an idle performance cost.
  requireText(semanticRegistry,'pendingSemanticRoots','HARD-55: Semantic Registry must batch mutation-driven root assignment.');
  requireText(semanticRegistry,'scheduleSemanticAssignment','HARD-55: Semantic Registry child additions must use the batched scheduler.');
  requireText(semanticRegistry,'framePending:!!semanticFrame','HARD-55: Semantic performance diagnostics must expose queue settlement.');
  requireText(automationVisual,'semanticAssignCalls<=8','HARD-55: Windows performance acceptance must bound semantic full-root rescans.');
  requireText(visualVerifier,'semanticAssignCalls','HARD-55: Release verifier must fail closed on semantic idle rescans.');

  // HARD-56: integrated command envelopes own the single outer edge. 38px shell
  // groups contain 34px actions with a mathematically equal 1px inset.
  requireText(schemaStructure,'.file-command-group{gap:0;padding:1px;height:var(--dkds-shell-group-height)','HARD-56: 38px file-command group must use a 1px equal inset around 34px actions.');
  requireText(componentCss,':is(.file-command-group,.dkds-integrated-action-group)>[data-dkds-component-identity="toolbarAction"][data-dkds-component-context="grouped"]{border-color:transparent;border-radius:0;box-shadow:none}','HARD-56: explicit integrated command envelopes must suppress child outer edges/depth.');
  forbidText(componentCss,':focus-visible{outline:2px solid var(--dkui-focus);outline-offset:1px;border-color:var(--dkds-ca-action-border-active)}','HARD-56: keyboard focus must not stack a second active border on ToolbarAction.');

  // HARD-57: fixed status popovers stay visually anchored and inspectors publish
  // explicit semantics instead of relying on fragile ancestry/class inference.
  requireText(statusPlugin,'a.right-box.width:a.left','HARD-57: Theme Picker must edge-align to its status-bar trigger.');
  requireText(resonanceView,'data-dkds-inspector-header','HARD-57: Resonance Curve Inspector must explicitly publish inspector-header semantics.');

  // HARD-58: dense scientific metadata is a quiet semantic Chip variant across
  // all built-in Theme providers, not a row of heavy default pills.
  requireText(terAnalysisService,'dkds-summary-chip dkds-chip quiet','HARD-58: TER summary values must use the quiet metadata Chip variant.');
  requireText(componentCss,'component-variant="quiet"]{background:var(--dkui-component-chip-variant-quiet-surface,transparent)','HARD-58: Core Component Appearance must render quiet Chips as lightweight metadata.');
  requireText(thinGlass,"chip:{variants:{quiet:",'HARD-58: Thin Glass must declare quiet Chip appearance.');
  requireText(auroraTheme,"quiet:{surface:'transparent',text:'#747B8E'",'HARD-58: Aurora Pop must declare light quiet Chip appearance.');

  // HARD-59: canonical Tabs and primary scientific surfaces cannot regain
  // presentation-owned paint or decorative focus frames.
  forbidRegex(presentationShell,/\.project-tab\s*\{[^}]*?(?:border|background|box-shadow|color)/s,'HARD-59: Presentation must not repaint canonical Project Tabs.');
  requireText(resonanceView,'data-dkds-surface-edge="none"','HARD-59: Resonance primary scientific plot must explicitly opt out of decorative container edges.');
  requireText(materialCss,'[data-dkds-surface-edge="none"]{border-width:0;outline:none;box-shadow:none}','HARD-59: Core Material Renderer must own the no-edge scientific-surface policy.');
  requireText(automationVisual,'Main scientific plot must not own a decorative','HARD-59: Windows acceptance must measure the primary plot no-edge policy.');

  // HARD-60: destructive actions own a restrained semantic danger depth in
  // Core. Domain plugins only compose/size the rich selection popover.
  requireText(componentCss,'--dkds-ca-action-shadow:var(--dkui-component-toolbar-action-variant-destructive-shadow,0 2px 8px color-mix(in srgb,var(--dkui-danger) 14%,transparent))','HARD-60: destructive ToolbarAction must retain a Core-owned danger depth fallback.');
  requireText(resonanceView,'data-dkds-menu-behavior="rich" role="dialog" aria-label="框选区域操作"','HARD-60: Resonance range-selection popover must publish rich-dialog semantics.');
  forbidText(resonanceCss,'.respar-range-identity select,#resonanceDedicatedPage .respar-range-identity input,#resonanceDedicatedPage .respar-range-identity button{width:100%}','HARD-60: Resonance range identity must not rely on a broad historical width override.');
  forbidRegex(resonanceCss,/\.respar-range-menu\s*\{[^}]*(?:background|border|box-shadow|color)\s*:/s,'HARD-60: Resonance range popover must not repaint Core Material/Theme appearance.');

  // HARD-61: grouped is a composition/layout semantic, not proof that a parent
  // paints an outer shell. Only explicit integrated command envelopes may erase
  // child edges/depth; status/activity groups must not become visually empty.
  requireText(componentCss,':is(.file-command-group,.dkds-integrated-action-group)>[data-dkds-component-identity="toolbarAction"][data-dkds-component-context="grouped"]{border-color:transparent;border-radius:0;box-shadow:none}','HARD-61: explicit integrated chrome owners must flatten their direct child actions.');
  forbidText(componentCss,'body.dkds-modern-ui [data-dkds-component-identity="toolbarAction"][data-dkds-component-context="grouped"]{border-color:transparent;box-shadow:none}','HARD-61: generic grouped context must not globally erase child edge/depth.');
  requireText(semanticRegistry,'.statusbar-command-cluster,.toolbar-group,.primary-activity-cluster,.system-core-tools-group','HARD-61: topbar/statusbar integrated containers must still resolve grouped Component Context for semantic composition.');
  requireText(materialRenderer,'.statusbar-command-cluster button,.toolbar-group button,.primary-activity-cluster button,.system-core-tools-group button','HARD-61: Material Renderer must keep integrated top/status actions from becoming nested Material surfaces.');
  if(failures.length){
    const error=new Error(`Hard visual invariants failed (${failures.length})\n${failures.map((x,i)=>`${i+1}. ${x}`).join('\n')}`);
    error.failures=[...failures];
    throw error;
  }
  return Object.freeze({ok:true,invariants:61});
}

if(require.main===module){
  try{const result=validate();console.log(`Hard visual invariants PASS (${result.invariants})`);}catch(err){console.error(err.message||err);process.exit(1);}
}
module.exports=Object.freeze({validate});
