'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const components=read('src/styles/theme/component-appearance.css');
const chrome=read('src/styles/theme/integrated-command-chrome.css');
const material=read('src/styles/theme/material-renderer.css');
const surfaces=read('src/styles/structure/sdk-semantic-surfaces.css');
const debug=read('src/core/theme/debug-runtime.js');
const devCss=read('src/styles/presentation/plugin-devtools.css');
const semantic=read('src/core/theme/semantic-registry.js');

const parts=pkg.version.split('.').map(Number);
assert(parts[0]>3||(parts[0]===3&&(parts[1]>65||(parts[1]===65&&parts[2]>=9))),'v3.65.9 gate requires 3.65.9+');

// Filled/active command labels use canonical component state paint; dark mode also has a Core readability fallback.
assert(components.includes('Dark-theme action contrast policy'),'Core must define the dark action-contrast policy.');
assert(components.includes('[data-dkds-component-identity="toolbarAction"]:is(')&&components.includes('color:#fff;-webkit-text-fill-color:#fff'),'Dark toolbar actions must render high-contrast white labels.');
assert(components.includes('[data-dkds-component-identity="tab"]:is('),'Dark active/selected tabs must use the same high-contrast label policy.');
assert(components.includes('[data-dkds-component-identity="tab"][data-dkds-component-variant="selected"]')&&components.includes('[data-dkds-component-identity="toolbarAction"][data-dkds-component-variant="active"]'),'Core must render Theme-authored selected/active component variants.');
assert(!/\.dkds-surface-header[^{}]*\[data-dkds-component-identity="(?:tab|toolbarAction)"\][^{]*\{/.test(components),'Surface/header context must never redefine canonical Tab or ToolbarAction paint.');
assert(components.includes('--dkui-component-toolbar-action-variant-primary-surface-hover')&&components.includes('--dkui-component-toolbar-action-variant-secondary-surface-hover'),'Core must consume Theme-authored hover slots for action variants, not only their idle colors.');

// Surface/Plot header commands share the title-bar Material; nested wrappers may not draw a capsule.
assert(surfaces.includes('.dkds-surface-actions'),'Core Surface Header composition must remain generic.');
assert(semantic.includes('INTEGRATED_CONTAINER_SELECTOR')&&semantic.includes('.dkds-integrated-action-group,.panel-header-actions,.trend-header-actions,.dkds-plot-view-actions'),'Core semantic registry must recognize generic nested header action wrappers.');
assert(semantic.includes('chromeOwnedIntegrated(el)')&&semantic.includes("if(chromeOwnedIntegrated(el))return '';"),'Header-owned command wrappers must be flattened by semantic ownership before Material role assignment.');
assert(material.includes('Header-owned command wrappers are transparent composition only.')&&material.includes(':where(.dkds-integrated-action-group,.panel-header-actions,.trend-header-actions,.dkds-plot-view-actions,.dkds-chart-actions,.dkds-surface-actions)'),'Plot and Surface actions must share one transparent Core header-composition path.');
assert(material.includes('background:transparent')&&material.includes('box-shadow:none'),'Header action wrappers must not paint a second capsule over the title-bar Material.');
assert(!/data-center|\.dc-/.test(material)&&!/data-center|\.dc-/.test(chrome),'Core header composition must remain domain-blind.');
assert(!chrome.includes('.dkds-surface-actions'),'Integrated command Theme CSS must not reclaim generic Surface Action paint.');
assert(semantic.includes('.dkds-surface-actions>button'),'Surface action buttons must remain in the canonical toolbarAction resolver.');

// Theme Inspector is a movable dev overlay with bounded, session-scoped position.
assert(/const VERSION='2\.(?:[3-9]|\d{2,})\.\d+'/.test(debug)&&debug.includes("POSITION_KEY='dkds.themeInspector.position'"),'Theme Inspector must expose the movable HUD runtime at debug contract 2.3+ while preserving session-scoped placement.');
assert(debug.includes("closest?.('.dkds-theme-debug-header')")&&debug.includes('setPointerCapture')&&debug.includes('placeOverlay(overlay,{x,y})'),'Theme Inspector drag must use Pointer Events and bounded placement.');
assert(debug.includes('sessionStorage.setItem(POSITION_KEY'),'Theme Inspector position must persist for the current session.');
assert(devCss.includes('.dkds-theme-debug-header')&&devCss.includes('cursor:move')&&devCss.includes('touch-action:none'),'Theme Inspector header must expose a touch-safe drag affordance.');

console.log('v3.65.9 dark action contrast, integrated Surface/Plot headers and movable Theme Inspector contracts passed.');
