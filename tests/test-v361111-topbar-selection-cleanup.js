const assert=require('assert');
const fs=require('fs');

const touch=fs.readFileSync('src/styles/platform/touch.css','utf8');
const theme=fs.readFileSync('src/styles/theme/contract.css','utf8');

assert(!/\.plugin-toolbar-btn\[data-plugin-id\]::after/.test(touch),'desktop/plugin toolbar must not inherit the historical underline pseudo-element from platform/touch.css');
assert(!/--dkui-selected-shadow:[^;]*0\s+0\s+0\s+1px/.test(theme),'selected state must not combine a hard 1px rim with the selection halo');
assert(/--dkui-selected-shadow:\s*0\s+0\s+8px/.test(theme),'selected state should keep one centered semantic halo');
assert(/activity-tab\.active[^}]*border-color:\s*transparent[^}]*box-shadow:\s*var\(--dkui-selected-shadow\)/.test(theme),'final Theme contract must keep top-level activity border transparent and use only the semantic selection halo');

console.log('v3.62.0 topbar selection cleanup contract: PASS');
