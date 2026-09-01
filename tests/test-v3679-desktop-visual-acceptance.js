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
const componentRuntime=read('src/core/theme/component-appearance.js');
const themeRuntime=read('src/core/theme/runtime.js');
assert(appearance.includes('border-radius:var(--dkui-component-toolbar-action-radius,var(--ui-control-radius,8px))'),'plot navigation actions must remain canonical ToolbarAction hit regions while Theme 3.10 resolves their radius.');
assert(!integrated.includes('.dkds-scientific-nav-tools button:hover:not(:disabled)'),'Integrated command Theme CSS must not repaint plot-navigation hover.');

// 3/4) Portable/header actions are quiet by default, with rounded spacing and
// no accidental generic hard-border hover.
const portable=read('src/core/ui/modules/layout/portable-view.js');
const actions=read('src/core/ui/modules/interaction/context-actions.js');
assert(portable.includes("placementButton.dataset.dkdsComponentVariant='quiet'")&&portable.includes("closeButton.dataset.dkdsComponentVariant='quiet'")&&portable.includes("collapseButton.dataset.dkdsComponentVariant='quiet'"),'Portable header controls must be quiet actions.');
assert(actions.includes("headerIntegrated?'quiet':''"),'integrated header ActionGroup controls must default to quiet actions.');
assert(desktopChrome.includes('min-height:26px;height:26px;min-width:26px;padding:0 8px')&&appearance.includes('border-radius:var(--dkui-component-toolbar-action-radius,var(--ui-control-radius,8px))'),'header controls must combine canonical 26px Structure geometry with Theme 3.10 resolved Component Appearance radius.');
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
assert(/\.dkds-segmented-command-group\{[^}]*height:var\(--dkds-shell-group-height\)/.test(schema),'file and system command outlines must consume the same canonical segmented 38px envelope.');
assert(!superTop.includes('.global-commandbar .file-command-group{')&&!/system-core-tools-group\{[^}]*height:var\(--dkds-shell-group-height/.test(workbench),'file/system command envelope geometry must not be duplicated outside the canonical segmented Structure owner.');
assert(componentRuntime.includes('ThemeContract.resolveComponentAppearance')&&componentRuntime.includes('contextFor(target)')&&componentRuntime.includes('roleFor(target)')&&themeRuntime.includes('contexts:{grouped:')&&themeRuntime.includes('standalone:{variants:')&&!appearance.includes('--dkds-shell-action-halo'),'topbar depth must be resolved from Theme 3.10 Component Context/Material Role composition instead of a fixed 2px Core halo.');

// 7) Parameters / inspector / group presentation buttons have the same content
// geometry. No first-button padding exception may return.
assert(shell.includes('padding:6px 11px;\n  display:inline-flex;\n  align-items:center;\n  justify-content:center;\n  text-align:center;')&&shell.includes('[data-dkds-presentation-compact="true"]{\n  width:48px;min-width:48px;max-width:48px'),'plugin presentation commands must share centered content geometry and exact 48px compact width.');
assert(shell.includes('.plugin-context-toolbar .plugin-toolbar-btn.plugin-section-start:first-child{\n  margin-left:0;\n  padding-left:11px;'),'the first presentation button must use the same 11px side inset as its siblings.');
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
