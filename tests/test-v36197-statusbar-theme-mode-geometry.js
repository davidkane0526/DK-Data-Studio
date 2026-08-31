'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



const status=read('src/styles/presentation/control-status.css');
const theme=read('src/styles/theme/integrated-command-chrome.css');
const component=read('src/styles/theme/component-appearance.css');
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
const material=read('src/styles/theme/material-renderer.css');
const semantic=read('src/core/theme/semantic-registry.js');

assert(/#statusBar\.statusbar\{[\s\S]*?padding:2px 14px 2px 9px;/.test(status),
  'Status bar must reserve a 14px right safe area so the AI command does not sit on the window edge.');
assert(/\.statusbar-command-cluster\{[\s\S]*?gap:8px;/.test(status),
  'Status command cluster must keep an 8px rhythm between command zones.');
assert(/\.statusbar-plugin-zone\{[\s\S]*?gap:8px;/.test(status),
  'Status buttons within each zone must keep an 8px inter-command gap.');

assert(/#dkdsThemePanel \.dkds-theme-mode-switch\{[^}]*padding:2px/.test(structure)&&material.includes('.dkds-integrated-action-group.dkds-material-role-control')&&material.includes('border-radius:9px'),
  'Appearance segmented control must keep a 2px structural inset and canonical 9px Material shell.');
assert(component.includes('#dkdsThemePanel .dkds-theme-mode-switch>[data-dkds-component-identity="toolbarAction"]{border-radius:7px}'),
  'Appearance selected segment must use the canonical matching inset radius instead of a rectangular blue block.');
assert(semantic.includes('.dkds-integrated-action-group button')&&component.includes('[data-dkds-component-identity="toolbarAction"]:is(.active,[aria-pressed="true"])')&&!/data-dkds-theme-mode="(?:light|dark)"[^{}]*\{[^}]*background:/s.test(theme),
  'Appearance active segment must consume the canonical Theme toolbarAction active state instead of a Theme-panel-specific accent repaint.');

console.log('v3.61.97 statusbar/theme geometry contract PASS: safer right inset, wider command rhythm, rounded appearance selection.');
