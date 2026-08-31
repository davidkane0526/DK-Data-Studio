'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

// 1) Desktop workspace: left data rail persists; bottom group plot starts after
// it and extends through center + inspector width.
const grid=read('src/styles/structure/plugin-workspace.css');
assert(grid.includes('"cleft clsplit center crsplit cright"'),'upper workspace must retain left / center / right columns.');
assert(grid.includes('"cleft clsplit cbsplit cbsplit cbsplit"'),'bottom splitter must start after the left data rail.');
assert(grid.includes('"cleft clsplit cbottom cbottom cbottom"'),'group plot must span center through the right edge while the data rail persists.');
assert(!grid.includes('"cbottom cbottom cbottom cbottom cbottom"'),'group plot must not run underneath the data list.');

// 2) Both scientific navigation runtimes expose exactly the same material and
// action semantics, so a theme cannot paint them differently.
const curveNav=read('src/core/ui/modules/scientific-curve/navigation.js');
const chartRuntime=read('src/core/scientific/chart-runtime.js');
for(const source of [curveNav,chartRuntime]){
  assert(source.includes('dkds-scientific-nav-tools')&&source.includes('dkds-integrated-action-group')&&source.includes('dkds-material-role-floating'),'all plot nav shells must consume the same floating integrated material contract.');
  assert(source.includes("button.dataset.dkdsComponentIdentity='toolbarAction'")&&source.includes("button.dataset.dkdsComponentVariant='quiet'"),'all plot nav buttons must consume the same quiet ToolbarAction contract.');
}
const integrated=read('src/styles/theme/integrated-command-chrome.css');
const appearance=read('src/styles/theme/component-appearance.css');
const desktopChrome=read('src/styles/structure/desktop-chrome-geometry.css');
assert(appearance.includes('.dkds-scientific-nav-tools [data-dkds-component-identity="toolbarAction"]{border-radius:6px}'),'plot navigation actions must remain soft rounded canonical ToolbarAction hit regions.');
assert(!integrated.includes('.dkds-scientific-nav-tools button:hover:not(:disabled)'),'Integrated command Theme CSS must not repaint plot-navigation hover.');

// 3/4) Portable/header actions are quiet by default, with rounded spacing and
// no accidental generic hard-border hover.
const portable=read('src/core/ui/modules/layout/portable-view.js');
const actions=read('src/core/ui/modules/interaction/context-actions.js');
assert(portable.includes("placementButton.dataset.dkdsComponentVariant='quiet'")&&portable.includes("closeButton.dataset.dkdsComponentVariant='quiet'")&&portable.includes("collapseButton.dataset.dkdsComponentVariant='quiet'"),'Portable header controls must be quiet actions.');
assert(actions.includes("headerIntegrated?'quiet':''"),'integrated header ActionGroup controls must default to quiet actions.');
assert(desktopChrome.includes('min-height:26px;height:26px;min-width:26px;padding:0 8px')&&appearance.includes(':where(.dkds-portable-controls,.panel-header-actions,.dkds-plot-view-actions,.dkds-surface-actions,.trend-header-actions) [data-dkds-component-identity="toolbarAction"]{border-radius:7px}'),'header controls must combine canonical 26px Structure geometry with soft Component Appearance rounding.');
assert(appearance.includes('color-mix(in srgb,var(--dkui-control-hover) 62%,transparent)'),'quiet hover paint must be lighter than generic control hover.');

// 5/6/8) The graph command/legend outlines and every topbar group share explicit
// box geometry instead of unrelated magic heights.
const workspace=read('src/styles/structure/workspace-interaction.css');
assert(workspace.includes('.main-plot-tools button{height:26px;min-height:26px;padding:3px 8px'),'main plot command buttons must use the canonical 26px inner height.');
assert(/\.main-plot-tools\{[\s\S]*?padding:3px;[\s\S]*?height:34px;[\s\S]*?box-sizing:border-box;/.test(workspace),'main plot command outline must use equal 3px inset and a 34px border-box.');
assert(/\.main-legend-bar\{[\s\S]*?min-height:34px;/.test(workspace)&&/\.main-legend-bar\{[\s\S]*?height:34px;[\s\S]*?box-sizing:border-box;[\s\S]*?padding:3px;/.test(workspace),'legend outline must not retain the old 40px minimum and must use equal 3px inset.');

const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const shell=read('src/styles/structure/shell-navigation.css');
const superTop=read('src/styles/structure/super-top-contract.css');
const workbench=read('src/styles/structure/workbench-components.css');
assert(schema.includes('--dkds-shell-action-height:34px')&&schema.includes('--dkds-shell-group-height:38px'),'topbar must use the 34px action / 38px visual-envelope contract.');
assert(shell.includes('height:var(--dkds-shell-group-height,38px)')&&shell.includes('padding:2px;'),'primary activity cluster must use the same 38px envelope with 2px inset.');
assert(superTop.includes('height:var(--dkds-shell-group-height,38px)'),'file command outline must use the same envelope.');
assert(workbench.includes('height:var(--dkds-shell-group-height,38px)'),'system command outline must use the same envelope.');
assert(appearance.includes('--dkds-shell-action-halo:0 0 0 2px'),'topbar action halo must use an exact centered 2px spread so the visual envelope matches grouped chrome without blur growth.');

// 7) Parameters / inspector / group presentation buttons have the same content
// geometry. No first-button padding exception may return.
assert(shell.includes('padding:6px 10px;\n  display:inline-flex;\n  align-items:center;\n  justify-content:center;\n  text-align:center;'),'plugin presentation commands must share centered content geometry.');
assert(shell.includes('.plugin-context-toolbar .plugin-toolbar-btn.plugin-section-start:first-child{\n  margin-left:0;\n  padding-left:10px;'),'the first presentation button must use the same 10px side inset as its siblings.');
assert(!shell.includes('padding-left:7px;\n}\n.plugin-context-toolbar .plugin-toolbar-btn.plugin-section-start:first-child'),'the old narrow first-button exception must not return.');

// 9) Theme selector is a fixed popover, never a portable view. Check both the
// declaration and the Core refusal path so accidental future wrapping cannot
// reintroduce the placement button.
const status=read('src/plugins/status-monitor/plugin.js');
const semantic=read('src/styles/structure/sdk-semantic-surfaces.css');
assert(status.includes("'data-dkds-portable-chrome':'false','data-dkds-portable':'false'"),'theme picker must explicitly opt out of portable behavior.');
assert(portable.includes('[data-dkds-portable-chrome="false"],[data-dkds-portable="false"]'),'PortableView must recognize both no-chrome and no-portable semantics before injecting controls.');
assert(portable.includes("this.allowed=this.portableDisabled?['home']")&&portable.includes("const requested=this.portableDisabled?'home'"),'non-portable surfaces must be structurally pinned home, not merely hide their placement button.');
assert(semantic.includes('[data-dkds-portable="false"] .dkds-portable-controls{display:none}'),'CSS fail-safe must suppress any stale portable controls inside a non-portable surface.');

console.log('v3.67.9 desktop visual acceptance PASS: workspace geometry, scientific nav parity, quiet header hover, equal control insets, uniform presentation buttons, 38px shell envelope, and non-portable theme picker are all guarded.');
