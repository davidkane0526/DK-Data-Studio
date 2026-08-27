const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=(v,m)=>{if(!v)throw new Error(m);};
const root=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const pkg=JSON.parse(read('package.json'));
const base=readCoreCss(root);
const modern=readCoreCss(root);
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');

assert(pkg.version==='3.61.95','Expected application version 3.61.95.');
assert(base.includes('.dkds-scientific-curve-surface:focus,.dkds-scientific-curve-surface:focus-visible{outline:none}'),'Focused scientific surfaces must not expose a browser focus rectangle around the plot.');
assert(resonance.includes("if(!node.hasAttribute('tabindex'))node.tabIndex=-1")&&resonance.includes('claimKeyboardFocus()'),'Plot keyboard ownership must remain enabled while its visible focus rectangle is suppressed.');
assert(modern.includes('--dkui-selection-bg:var(--dkui-accent-soft);'),'Light mode must keep the semantic selection token.');
assert(modern.includes('--dkui-selection-bg:rgba(255,255,255,.075);'),'Dark mode selection must use a restrained neutral white surface instead of a blue fill.');
assert(modern.includes('--dkui-selection-border:rgba(255,255,255,.10);'),'Dark mode selected rows must use a neutral white boundary.');
assert(modern.includes('background:var(--dkui-selection-bg,var(--dkui-accent-soft))'),'Dataset and linked-selection rows must consume the selection token.');
console.log('v3.61.62 neutral dark selection and plot focus-frame regression checks passed.');
