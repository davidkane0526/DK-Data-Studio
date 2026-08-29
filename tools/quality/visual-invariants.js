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
  requireRegex(integratedCss,/:where\([^)]*analysis-chart-title[^)]*\)[\s\S]*?:where\([^)]*(?:dkds-surface-actions|dkds-integrated-action-group)[^)]*\)/s,'HARD-02: chart-title action groups must share the title chrome even through Core layout wrappers.');
  forbidRegex(semanticRegistry,/id:'toolbarGroup'[^\n]*(?:dkds-integrated-action-group|statusbar-command-cluster)/,'HARD-02: integrated/status command clusters must never be painted as toolbarGroup components.');
  forbidRegex(componentCss,/:where\([^)]*(?:dkds-integrated-action-group|statusbar-command-cluster)[^)]*\)\s*\{[^}]*--dkds-material-base/s,'HARD-02: Theme Component Appearance must not create a second material shell around integrated/status groups.');
  requireRegex(integratedCss,/#statusBar\.statusbar[\s\S]*?\.plugin-status-item::before\{display:none\}/,'HARD-02: status-bar command chrome must remain one parent-owned surface.');

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

  // HARD-05: large elevated Thin Glass surfaces use one stronger optical contract.
  requireRegex(thinGlass,/elevated:\{materialBlur:10,materialBlurStrong:11,materialSaturation:1\.04,materialTintOpacity:\.76\}/,'HARD-05: Thin Glass elevated surfaces must use the shared stronger dialog/panel optical recipe.');
  requireRegex(materialRoles,/role="elevated"[\s\S]*?--dkds-material-fill-floor:72%;/,'HARD-05: Core elevated surfaces must enforce the shared readability floor.');
  requireText(connectivity,'<section class="dksmb-browser dkds-surface">','HARD-05: SMB browser content must consume the same Core semantic surface layering as service panels.');


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

  if(failures.length){
    const error=new Error(`Hard visual invariants failed (${failures.length})\n${failures.map((x,i)=>`${i+1}. ${x}`).join('\n')}`);
    error.failures=[...failures];
    throw error;
  }
  return Object.freeze({ok:true,invariants:7});
}

if(require.main===module){
  try{const result=validate();console.log(`Hard visual invariants PASS (${result.invariants})`);}catch(err){console.error(err.message||err);process.exit(1);}
}
module.exports=Object.freeze({validate});
