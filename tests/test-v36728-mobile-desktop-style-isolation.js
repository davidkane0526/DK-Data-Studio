'use strict';
const fs=require('fs');
const path=require('path');
const assert=(value,message)=>{if(!value)throw new Error(message);};
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=28))),'Desktop/Mobile style isolation regression requires v3.67.28+.');

const resonanceView=read('src/plugins/resonance-workbench/view-components.js');
const resonancePresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const scientificCss=read('src/styles/presentation/scientific.css');

assert(resonancePresentation.includes("className:'respar-scan-global dkds-mode-group'")&&!resonancePresentation.includes('respar-scan-global dkds-mode-group dkds-action-row'),
  'Desktop scan-mode commands must not be converted into a generic action-row container by Mobile work.');
assert(resonancePresentation.includes("className:'respar-detect-actions'")&&!resonancePresentation.includes('respar-detect-actions dkds-action-row'),
  'Desktop detector commands must keep their established container identity.');
assert(/#resonanceDedicatedPage \.respar-scan-global\{[^}]*display:grid;[^}]*grid-template-columns:1fr 1fr/.test(resonanceCss),
  'Desktop scan-mode controls must retain their two-column plugin layout.');
assert(/#resonanceDedicatedPage \.respar-scan-global button\{width:100%\}/.test(resonanceCss),
  'Desktop scan-mode controls must retain equal-width buttons.');
assert(/#resonanceDedicatedPage \.respar-detect-actions\{[^}]*display:grid;[^}]*grid-template-columns:1fr 1fr/.test(resonanceCss),
  'Desktop detector actions must retain their two-column plugin layout.');
assert(/#resonanceDedicatedPage \.respar-inspector-action-grid\{[^}]*display:grid;[^}]*grid-template-columns:1fr 1fr/.test(resonanceCss),
  'Desktop inspector action geometry must not be flattened by Mobile responsive composition.');

assert(!resonanceCss.includes('resonance-native-client')&&!resonanceView.includes('ctx.runtime.isNativeClient')&&!resonancePresentation.includes('ctx.runtime.isNativeClient'),
  'Resonance must remain platform-neutral; Desktop/Mobile composition belongs to Presenters, not plugin selectors.');
const pluginApi=read('src/core/plugins/kernel/modules/plugin-api.js');
assert(!pluginApi.includes('platform: window.DKDSPlatform')&&!pluginApi.includes('isNativeClient:!!state.host'),
  'The supported Plugin API must not expose Desktop/Mobile presentation identity.');

assert(scientificCss.includes('.dkds-scientific-curve-surface:focus,\n.dkds-scientific-curve-surface:focus-visible {outline:none'),
  'Scientific plot focus must suppress the browser focus rectangle in every theme.');
assert(!scientificCss.includes('html[data-dkds-theme="dark"] .dkds-scientific-curve-surface:focus'),
  'Plot focus suppression must not be limited to dark mode; that leaks the browser focus frame in light mode.');

console.log('v3.67.28 Desktop/Mobile style isolation PASS: Desktop Resonance command geometry is restored, plugin responsive composition is platform-neutral, and scientific plot focus no longer exposes a light-mode browser frame.');
