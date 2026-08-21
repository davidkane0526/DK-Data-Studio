const fs=require('fs');
const path=require('path');
const assert=(cond,msg)=>{if(!cond)throw new Error(msg);};
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const expected='plotly.js-cartesian-dist-min/plotly-cartesian.min.js';
const wrong='plotly.js-cartesian-dist-min/plotly.min.js';
for(const file of ['src/index.html','src/core/chart-runtime.js','src/plugin-window/runtime.js','mobile/scripts/sync-web-assets.js']){
  const source=read(file);
  assert(source.includes(expected),`${file} must load the actual Cartesian Plotly distribution entry: ${expected}`);
  assert(!source.includes(wrong),`${file} must not reference the nonexistent Cartesian entry: ${wrong}`);
}
const pkg=JSON.parse(read('package.json'));
assert(pkg.dependencies?.['plotly.js-cartesian-dist-min'],'Desktop package must declare plotly.js-cartesian-dist-min.');
const mobile=JSON.parse(read('mobile/package.json'));
assert(mobile.dependencies?.['plotly.js-cartesian-dist-min'],'Mobile package must declare plotly.js-cartesian-dist-min.');
// When dependencies are installed, verify the real file exists. Source-only ZIPs intentionally omit node_modules.
const installed=path.join(root,'node_modules','plotly.js-cartesian-dist-min');
if(fs.existsSync(installed)){
  assert(fs.existsSync(path.join(installed,'plotly-cartesian.min.js')),'Installed Cartesian Plotly package is missing plotly-cartesian.min.js.');
}
console.log('PASS plotly cartesian entry v3.61.1');
