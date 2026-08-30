'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



const actions=read('src/core/ui/modules/interaction/context-actions.js');
const shell=read('src/styles/structure/analysis-shell.css');
const structure=read('src/styles/structure/super-top-contract.css');
const appearance=read('src/styles/theme/component-appearance.css');
const chrome=read('src/styles/presentation/plugin-chrome.css');
const material=read('src/core/theme/material-renderer.js');
const semanticTheme=read('src/core/theme/semantic-registry.js');
const coverage=read('src/core/theme/coverage-runtime.js');
const pulse=read('src/plugins/pulse-analysis/feature-runtime.js');
const ter=read('src/plugins/ter-analysis/feature-runtime.js');

// Ordinary ActionGroups remain integrated by default, but analysis-page header
// groups are explicitly converted to separated peer controls. This prevents
// adjacent labels/icons from visually merging into one segmented capsule.
assert(actions.includes("classList.add('dkds-action-group','dkds-integrated-action-group','dkds-material-role-control')"),
  'ActionGroup must preserve the integrated default contract.');
assert(actions.includes("this.container.classList.contains('dkds-plugin-header-actions')||spec.integrated===false"),
  'Plugin header ActionGroups must opt into the separated header contract.');
assert(actions.includes("classList.add('dkds-separated-action-group')")&&actions.includes("classList.remove('dkds-integrated-action-group','dkds-material-role-control')"),
  'Separated header groups must remove nested integrated/material ownership.');

// Geometry: each command remains atomic, the group is nowrap/scroll-safe, and
// close remains a non-shrinking sibling. A gap is required between real buttons.
assert(/\.analysis-page-header>\.dkds-plugin-header-actions\.dkds-action-group\{[^}]*flex-wrap:nowrap;[^}]*gap:8px;/.test(shell),
  'Analysis header action groups must preserve an 8px inter-button gap.');
assert(/\.analysis-page-header>\.dkds-plugin-header-actions :where\(button,\.dkds-action-button\)\{[^}]*flex:0 0 auto;[^}]*min-width:max-content;/.test(shell),
  'Header action labels must not shrink into neighboring controls.');
assert(/\.analysis-page-header>\.dkds-plugin-header-actions\{[\s\S]*?overflow-x:auto;/.test(shell),
  'Oversized header action groups must scroll rather than overlap the close action.');
assert(shell.includes('.analysis-page-header>.analysis-page-close{flex:0 0 auto;}'),
  'Close-window control must remain a fixed sibling.');

// Paint: header actions are individual Core control surfaces, matching Import
// and Close, rather than one shared outer capsule with touching hit regions.
assert(chrome.includes('.analysis-page-header>.dkds-separated-action-group')&&chrome.includes('background:transparent;'),
  'Separated header action group container must be paintless.');
assert(actions.includes("button.dataset.dkdsActionLayout='standalone'")&&/\.dkds-action-button\{[^}]*height:30px;[^}]*padding:0 10px;/.test(structure)&&appearance.includes('[data-dkds-action-layout="standalone"]'),
  'Separated header actions must use canonical action geometry plus the Core standalone semantic appearance.');
assert(!chrome.includes('.dkds-separated-action-group>.dkds-action-button'),
  'Presentation must not restore a page-specific paint path for separated header actions.');

// Both user-reported TOP headers use the same Core host, so the fix must stay
// host-generic rather than special-casing TER or Pulse CSS.
assert(pulse.includes("pulseHeaderActionsHost.className='dkds-plugin-header-actions'"),
  'Pulse header must continue to consume the generic Core header action contract.');
assert(ter.includes("terHeaderActionsHost.className='dkds-plugin-header-actions'"),
  'TER header must continue to consume the generic Core header action contract.');

// Theme Coverage must not count one surface in two incompatible semantic areas.
assert(semanticTheme.includes('.floating-panel:not(.lan-web-panel):not(.update-panel)')&&semanticTheme.includes('.dkds-dialog,.dkds-dialog-shell,.dkds-settings-dialog,.update-panel,.lan-web-panel,.import-workbench'),
  'Canonical semantic areas must keep generic floating surfaces separate from elevated LAN/update panels.');
assert(semanticTheme.includes('.dkds-analysis-workbench,.super-workspace-page,.main-workspace,.dkds-plugin-canvas-center'),
  'SUPER/main workspace nodes must receive the same surface role that coverage expects.');
assert(material.includes('Semantic.materialAreas()')&&coverage.includes('Semantic.materialAreas()'),'Renderer and coverage must share the same semantic area authority.');

console.log('v3.61.96 header action spacing + theme coverage contract PASS: separated peer controls, atomic labels, overflow safety and non-overlapping material areas.');
