#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..','..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const failures=[];
const requireText=(text,token,message)=>{if(!text.includes(token))failures.push(message);};
const forbidText=(text,token,message)=>{if(text.includes(token))failures.push(message);};
const requireRegex=(text,re,message)=>{if(!re.test(text))failures.push(message);};
const forbidRegex=(text,re,message)=>{if(re.test(text))failures.push(message);};

function validate(){
  failures.length=0;
  const componentRuntime=read('src/core/theme/component-appearance.js');
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

  // HARD-01: analysis/workbench navigation is a toolbar action, never a tab.
  requireRegex(componentRuntime,/tab:Object\.freeze\(\{selector:'[^']*activity-tab:not\(\.top-level-activity-tab\)[^']*'/,'HARD-01: generic Tab selector must exclude top-level workspaces.');
  forbidRegex(componentRuntime,/tab:Object\.freeze\(\{selector:'[^']*dkds-analysis-nav-btn/,'HARD-01: .dkds-analysis-nav-btn must never be classified as a Tab.');
  requireRegex(componentRuntime,/toolbarAction:Object\.freeze\(\{selector:'[^']*dkds-analysis-nav-btn/,'HARD-01: .dkds-analysis-nav-btn must be a Theme toolbarAction.');
  forbidRegex(componentCss,/:where\([^)]*dkds-analysis-nav-btn[^)]*\):is\([^)]*active[^}]*inset\s+0\s+-2px/s,'HARD-01: analysis navigation must never receive a tab underline indicator.');
  forbidRegex(controlStatus,/\.dkds-analysis-nav-btn\.(?:active|selected)|\.dkds-analysis-nav-btn\[aria-pressed/s,'HARD-01: Presentation must not repaint analysis-navigation states; Theme owns them.');

  // HARD-02: chart-title and bottom-status actions are hit regions of parent chrome.
  requireText(componentRuntime,'.analysis-chart-title','HARD-02: analysis-chart-title must be a Core panelHeader semantic component.');
  requireText(materialRenderer,'.analysis-chart-title','HARD-02: analysis-chart-title must be assigned the chrome Material role.');
  requireText(coverage,'.analysis-chart-title','HARD-02: Theme coverage must inspect analysis-chart-title.');
  requireRegex(integratedCss,/:where\([^)]*analysis-chart-title[^)]*\)\s*>\s*:where\([^)]*dkds-integrated-action-group/s,'HARD-02: chart-title direct action groups must be flattened into the title chrome.');
  forbidRegex(componentRuntime,/toolbarGroup:Object\.freeze\(\{selector:'[^']*(?:dkds-integrated-action-group|statusbar-command-cluster)/,'HARD-02: integrated/status command clusters must never be painted as toolbarGroup components.');
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

  if(failures.length){
    const error=new Error(`Hard visual invariants failed (${failures.length})\n${failures.map((x,i)=>`${i+1}. ${x}`).join('\n')}`);
    error.failures=[...failures];
    throw error;
  }
  return Object.freeze({ok:true,invariants:5});
}

if(require.main===module){
  try{const result=validate();console.log(`Hard visual invariants PASS (${result.invariants})`);}catch(err){console.error(err.message||err);process.exit(1);}
}
module.exports=Object.freeze({validate});
