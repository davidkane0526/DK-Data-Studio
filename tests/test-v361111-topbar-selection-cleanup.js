const assert=require('assert');
const fs=require('fs');

const touch=fs.readFileSync('src/styles/platform/touch.css','utf8');
const theme=fs.readFileSync('src/styles/theme/contract.css','utf8');
const components=fs.readFileSync('src/styles/theme/component-appearance.css','utf8');

assert(!/\.plugin-toolbar-btn\[data-plugin-id\]::after/.test(touch),'desktop/plugin toolbar must not inherit the historical underline pseudo-element from platform/touch.css');
assert(!/--dkui-selected-shadow:[^;]*0\s+0\s+0\s+1px/.test(theme),'selected state must not combine a hard 1px rim with the selection halo');
assert(/--dkui-selected-shadow:\s*0\s+0\s+4px/.test(theme),'selected state should keep one centered semantic halo');
assert(components.includes('var(--dkui-component-tab-surface-active,var(--dkui-active-surface))')&&components.includes('var(--dkui-component-tab-border-active,var(--dkui-selection-border))')&&components.includes('var(--dkui-component-tab-indicator,var(--dkui-accent))'),'Theme 3.8 must route active tabs through the bounded Component Appearance contract instead of a legacy activity-tab paint block');
assert(!/activity-tab\.active[^}]*0\s+0\s+0\s+1px/.test(theme),'legacy Theme paint must not reintroduce a hard active-tab rim');

console.log('v3.62.0 topbar selection cleanup contract: PASS');
