'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const resonance=read('src/plugins/resonance-workbench/view-components.js');
const activityShell=read('src/core/plugins/kernel/modules/activity/shell.js');
const shellCss=read('src/styles/structure/shell-navigation.css');
const pluginCss=read('src/styles/structure/schema-and-plugin-ui.css');

// Resonance settings is deliberately an activity-scoped SUPER toolbar
// contribution. Switching SUPER must hide it rather than leave stale chrome.
assert(resonance.includes("ctx.ui.toolbar.add({id:'res-settings',label:'设置',activity:'resonance'"),
  'Resonance settings contribution must remain explicitly scoped to the resonance activity.');
assert(activityShell.includes("el.classList.toggle('plugin-activity-hidden',!!own&&own!==String(id||''))"),
  'Activity visibility runtime must mark contributions from inactive activities as hidden.');
assert(pluginCss.includes('.plugin-activity-hidden{display:none;}'),
  'Inactive plugin contributions need a canonical display:none state.');

// Root-cause regression: a later/more-specific layout selector used to assign
// display:inline-flex to every plugin toolbar button, which overrode the generic
// hidden state. Visible geometry must explicitly exclude inactive contributions.
assert(shellCss.includes('.plugin-context-toolbar .plugin-toolbar-btn:not(.plugin-activity-hidden){'),
  'Context-toolbar visible geometry must never match an inactive activity contribution.');
assert(!shellCss.includes('.plugin-context-toolbar .plugin-toolbar-btn{\n  flex:0 0 auto;\n  display:inline-flex;'),
  'Context-toolbar CSS must not re-display activity-hidden plugin buttons.');

// The overflow storage/fallback lane follows the same rule, otherwise an
// inactive command could reappear only after responsive reparenting.
assert(pluginCss.includes('.context-overflow-menu .plugin-toolbar-btn:not(.plugin-activity-hidden){display:flex;'),
  'Overflow fallback geometry must exclude inactive activity contributions.');
assert(pluginCss.includes('.command-menu>button:not([hidden]):not(.plugin-activity-hidden),'),
  'Direct command-menu fallback items must preserve activity-hidden state.');

console.log('v3.71.18 activity-scoped toolbar visibility contract PASS');
