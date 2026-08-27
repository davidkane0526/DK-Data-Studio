'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.97','v3.61.97 status/theme geometry contract must track the application version.');

const status=read('src/styles/presentation/control-status.css');
const theme=read('src/styles/theme/integrated-command-chrome.css');

assert(/#statusBar\.statusbar\{[\s\S]*?padding:2px 14px 2px 9px;/.test(status),
  'Status bar must reserve a 14px right safe area so the AI command does not sit on the window edge.');
assert(/\.statusbar-command-cluster\{[\s\S]*?gap:8px;/.test(status),
  'Status command cluster must keep an 8px rhythm between command zones.');
assert(/\.statusbar-plugin-zone\{[\s\S]*?gap:8px;/.test(status),
  'Status buttons within each zone must keep an 8px inter-command gap.');

assert(/#dkdsThemePanel \.dkds-theme-mode-switch\{[\s\S]*?padding:2px;[\s\S]*?border-radius:9px;/.test(theme),
  'Appearance segmented control must keep a rounded 9px outer track with 2px inset.');
assert(/#dkdsThemePanel \.dkds-theme-mode-switch>button\{[\s\S]*?border-radius:7px;/.test(theme),
  'Appearance selected segment must use the matching inset radius instead of a rectangular blue block.');
assert(/data-dkds-theme-mode="light"\],[\s\S]*?data-dkds-theme-mode="dark"\]\{[\s\S]*?background:var\(--dkui-accent\);/.test(theme),
  'Appearance active segment must remain driven by the Core accent token.');

console.log('v3.61.97 statusbar/theme geometry contract PASS: safer right inset, wider command rhythm, rounded appearance selection.');
