const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=(v,m)=>{if(!v)throw new Error(m);};
const root=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const pkg=JSON.parse(read('package.json'));
const base=readCoreCss(root);
const modern=readCoreCss(root);
const resonance=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');


assert(/\.dkds-scientific-curve-surface:focus\s*,\s*\.dkds-scientific-curve-surface:focus-visible\s*\{[^}]*outline\s*:\s*none/.test(base),'Focused scientific surfaces must not expose a browser focus rectangle around the plot.');
assert(resonance.includes("if(!node.hasAttribute('tabindex'))node.tabIndex=-1")&&resonance.includes('claimKeyboardFocus()'),'Plot keyboard ownership must remain enabled while its visible focus rectangle is suppressed.');
assert(modern.includes('--dkui-selection-surface:var(--dkui-accent-soft);')&&modern.includes('--dkui-selection-bg:var(--dkui-selection-surface);'),'Light mode must keep Theme 3.7 selectionSurface as the canonical token with the legacy Core alias.');
assert(modern.includes('--dkui-selection-surface:rgba(255,255,255,.075);'),'Dark mode selection must use a restrained neutral white semantic surface instead of a blue fill.');
assert(modern.includes('--dkui-selection-border:rgba(255,255,255,.10);'),'Dark mode selected rows must use a neutral white boundary.');
assert(modern.includes('background:var(--dkui-selection-bg,var(--dkui-accent-soft))'),'Dataset and linked-selection rows must consume the selection token.');
console.log('v3.61.62 neutral dark selection and plot focus-frame regression checks passed.');
