const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'src','index.html'),'utf8');
const pluginHtml=fs.readFileSync(path.join(root,'src','plugin-window','index.html'),'utf8');
const polish=fs.readFileSync(path.join(root,'src','ui-polish.css'),'utf8');
const chart=fs.readFileSync(path.join(root,'src','core','chart-runtime.js'),'utf8');

assert.equal(pkg.version,'3.61.23','visual-system polish release must be v3.61.23');
assert(html.includes('<link rel="stylesheet" href="ui-polish.css" />'),'main shell must load the visual-system layer after the legacy stylesheet');
assert(pluginHtml.includes('<link rel="stylesheet" href="../ui-polish.css">'),'dedicated plugin windows must load the same visual-system layer');
assert(polish.includes('--dkds-shadow-xs:')&&polish.includes('--dkds-shadow-float:'),'visual layer must define one shared depth system');
assert(polish.includes('.toolbar-group,.primary-activity-cluster,.system-core-tools-group'),'shell command groups must share one grouped-surface contract');
assert(polish.includes('.js-plotly-plot .plotly .modebar'),'Plotly chrome must use the same UI language as the shell');
assert(polish.includes('body #resonanceDedicatedPage')&&polish.includes('body .dc-card'),'built-in dynamic workbenches must be covered by the Core visual layer');
assert(polish.includes('@media(max-width:1180px)')&&polish.includes('@media(max-width:860px)'),'anti-crowding rules must exist for narrower desktop windows');
assert(polish.includes('@media (prefers-reduced-motion:reduce)'),'motion polish must respect reduced-motion preferences');
assert(!polish.includes('.scatterlayer .trace')&&!polish.includes('.heatmaplayer'),'visual chrome must not override scientific trace or heatmap data colors');
assert(!/\.topbar\s*\{[^}]*\bheight\s*:/s.test(polish),'visual polish must not change the existing topbar geometry contract');
assert(chart.includes("const UI_FONT='Segoe UI Variable Text, Microsoft YaHei UI, Segoe UI, sans-serif'"),'Plotly must use the same typography family as the application shell');
assert(chart.includes('const PLOT_THEME=Object.freeze(')&&chart.includes('function themeAxis(axis={})'),'Core Chart Runtime must own shared plot-axis visual defaults');
assert(chart.includes("next.plot_bgcolor=PLOT_THEME.plot"),'legacy white plot surfaces must normalize to the shared plot background');

console.log('v3.61.23 unified visual-system + chart chrome checks passed.');
