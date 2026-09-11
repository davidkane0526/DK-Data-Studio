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

assert(status.includes('--dkds-statusbar-padding-right:14px;')&&status.includes('--dkds-statusbar-padding-left:9px;')&&read('src/styles/structure/super-top-contract.css').includes('padding:0 var(--dkds-statusbar-padding-right) 0 var(--dkds-statusbar-padding-left);'),
  'Status bar must reserve the configured 14px right safe area while Structure uniquely owns final padding.');
assert(/\.statusbar-command-cluster\{[\s\S]*?gap:8px;/.test(status),
  'Status command cluster must keep an 8px rhythm between command zones.');
assert(status.includes('--dkds-statusbar-zone-gap:8px;')&&read('src/styles/structure/super-top-contract.css').includes('gap:var(--dkds-statusbar-zone-gap);'),
  'Status buttons within each zone must keep the configured 8px inter-command gap through the single Structure owner.');

assert(/#dkdsThemePanel \.dkds-theme-mode-switch\{[^}]*padding:2px/.test(structure)&&material.includes('.dkds-integrated-action-group.dkds-material-role-control')&&material.includes('border-radius:9px'),
  'Appearance segmented control must keep a 2px structural inset and canonical 9px Material shell.');
assert(component.includes('border-radius:var(--dkui-component-toolbar-action-radius,var(--ui-control-radius,8px))'),
  'Appearance segments must consume the Theme 3.10 toolbarAction radius instead of restoring a Theme-panel-specific rectangular block.');
assert(semantic.includes('.dkds-integrated-action-group button')&&component.includes('[data-dkds-component-identity="toolbarAction"]:is(.active,[aria-pressed="true"])')&&!/data-dkds-theme-mode="(?:light|dark)"[^{}]*\{[^}]*background:/s.test(theme),
  'Appearance active segment must consume the canonical Theme toolbarAction active state instead of a Theme-panel-specific accent repaint.');

console.log('v3.61.97 statusbar/theme geometry contract PASS: safer right inset, wider command rhythm, rounded appearance selection.');
