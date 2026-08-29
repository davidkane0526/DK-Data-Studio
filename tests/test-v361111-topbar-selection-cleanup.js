const assert=require('assert');
const fs=require('fs');

const touch=fs.readFileSync('src/styles/platform/touch.css','utf8');
const theme=fs.readFileSync('src/styles/theme/contract.css','utf8');
const components=fs.readFileSync('src/styles/theme/component-appearance.css','utf8');
const componentRuntime=fs.readFileSync('src/core/theme/component-appearance.js','utf8');
const semanticRuntime=fs.readFileSync('src/core/theme/semantic-registry.js','utf8');
const shell=fs.readFileSync('src/styles/presentation/shell.css','utf8');
const themeRuntime=fs.readFileSync('src/core/theme/runtime.js','utf8');
const thinGlass=fs.readFileSync('src/plugins/thin-glass-theme/plugin.js','utf8');

assert(!/\.plugin-toolbar-btn\[data-plugin-id\]::after/.test(touch),'desktop/plugin toolbar must not inherit the historical underline pseudo-element from platform/touch.css');
assert(!/--dkui-selected-shadow:[^;]*0\s+0\s+0\s+1px/.test(theme),'selected state must not combine a hard 1px rim with the selection halo');
assert(/--dkui-selected-shadow:\s*0\s+0\s+4px/.test(theme),'selected state should keep one centered semantic halo');
assert(components.includes('var(--dkui-component-tab-surface-active,var(--dkui-active-surface))')&&components.includes('var(--dkui-component-tab-border-active,var(--dkui-selection-border))')&&components.includes('var(--dkui-component-tab-indicator,var(--dkui-accent))'),'Theme 3.8 must route document tabs through the bounded Component Appearance contract.');
assert(semanticRuntime.includes('.activity-tab:not(.top-level-activity-tab)'),'Top-level workspace selectors must be excluded from the canonical tab identity.');
assert(semanticRuntime.includes('.primary-activity-bar .activity-tab.top-level-activity-tab')&&semanticRuntime.includes("id:'toolbarAction'"),'Top-level workspace selectors must be classified as toolbar actions by the semantic registry.');
assert(/data-dkds-component-identity="toolbarAction"[^\n]*:is\(\.active,[^}]+box-shadow:var\(--dkui-selected-shadow\)/s.test(components),'Active toolbarAction identity must keep the single centered semantic halo.');
assert(!/data-dkds-component-identity="toolbarAction"[^}]+inset\s+0\s+-2px/s.test(components),'ToolbarAction selection must never receive the generic tab underline indicator.');
assert(/toolbar-group[^}]+background:var\(--dkui-component-toolbar-group-surface[^}]+border:1px solid var\(--dkui-component-toolbar-group-border/s.test(components),'Toolbar groups must be painted directly by Theme Component Appearance.');
assert(!/toolbar-group[^}]+background:\s*#(?:f7f9fc|f8fafd|202631)/s.test(shell),'Presentation must not hard-code toolbar-group theme paint.');
assert(themeRuntime.includes('appearance:{components:{toolbarGroup:')&&thinGlass.includes('components:{toolbarGroup:'),'Both built-in themes must explicitly author Theme 3.8 toolbar component appearance.');
assert(!/activity-tab\.active[^}]*0\s+0\s+0\s+1px/.test(theme),'legacy Theme paint must not reintroduce a hard active-tab rim');

console.log('v3.62.0 topbar selection cleanup contract: PASS');
