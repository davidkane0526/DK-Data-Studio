const assert=require('assert');
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const Catalog=require(path.join(root,'desktop','algorithm-package-catalog'));
const {normalizePluginPackage}=require(path.join(root,'desktop','plugin-package'));

const pkg=normalizePluginPackage({schema:1,manifest:{
  id:'demo.algorithm-provider',name:'Demo Algorithm Provider',version:'2.0.0',apiVersion:'1.19.0',entry:'plugin.js',pluginType:'algorithm',
  requiresCore:['analysis.algorithms'],algorithmProvider:true,algorithmCategories:['peak-metrics'],
  algorithmProvides:[{category:'peak-metrics',id:'demo.fwhm',version:'1.0.0',title:'Demo FWHM'}],
  pluginDependencies:[{id:'demo.dependency'}]
},files:{'plugin.js':'(()=>{})();'}});
assert.strictEqual(pkg.manifest.algorithmProvides[0].id,'demo.fwhm');
assert.strictEqual(pkg.manifest.apiVersion,'1.19.0');
assert(!Object.prototype.hasOwnProperty.call(pkg.manifest,'compatibility'));
assert.deepStrictEqual(pkg.manifest.pluginDependencies,[{id:'demo.dependency'}]);

const packages=[{source:'external',manifest:pkg.manifest,current:true,installed:true}];
let out=Catalog.catalog(packages,{category:'peak-metrics',id:'demo.fwhm',version:'1.0.0'},new Set(['demo.dependency']));
assert.strictEqual(out.count,1);assert.strictEqual(out.candidates[0].ready,true);assert.strictEqual(out.candidates[0].recoverable,true);assert.deepStrictEqual(out.candidates[0].missingDependencies,[]);
out=Catalog.catalog(packages,{category:'peak-metrics',id:'demo.fwhm',version:'1.0.0'},new Set());
assert.strictEqual(out.candidates[0].ready,false);assert.strictEqual(out.candidates[0].recoverable,false);assert.deepStrictEqual(out.candidates[0].missingDependencies,['demo.dependency']);

for(const [file,expected] of [['src/plugins/resonance-detector-robust/plugin.json',['peak-detector::robust-ricker-v1@1.0.0','peak-metrics::baseline-fwhm-v1@1.0.0']],['src/plugins/standard-transport-algorithms/plugin.json',['transport-transform::transport.didv@1.0.0','transport-scalar-field::transport.scalar-field@1.0.0','ter-analysis::ter.high-low-ratio@1.0.0']]]){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));const keys=(manifest.algorithmProvides||[]).map(row=>`${row.category}::${row.id}@${row.version}`);for(const key of expected)assert(keys.includes(key),`${file} missing catalog entry ${key}`);assert.strictEqual(manifest.apiVersion,'1.19.0');assert(!Object.prototype.hasOwnProperty.call(manifest,'compatibility'),`${file} must use only the current exact plugin contract`);for(const dep of manifest.pluginDependencies||[])assert.deepStrictEqual(Object.keys(dep),['id']);
}
const main=fs.readFileSync(path.join(root,'desktop/main.js'),'utf8');assert(main.includes("ipcMain.handle('plugins:algorithmCatalog'"));assert(!main.includes("code:'PLUGIN_INCOMPATIBLE'")&&!main.includes('assertPackageCompatible('),'Main process must not retain version-compatibility install gates.');
const preload=fs.readFileSync(path.join(root,'desktop/preload.js'),'utf8');assert(preload.includes('pluginAlgorithmCatalog'));
const kernel=fs.readFileSync(path.join(root,'src/generated/runtime/plugin-kernel.js'),'utf8');assert(kernel.includes('locate:locateAlgorithmPackage'));assert(kernel.includes('recover:recoverAlgorithmPackage'));assert(kernel.includes('row=>row.ready&&row.recoverable'));
const ter=fs.readFileSync(path.join(root,'src/plugins/ter-analysis/analysis-service.js'),'utf8');assert(ter.includes('terRecoverAlgorithmBtn'));assert(ter.includes('api.recover'));
const resonance=fs.readFileSync(path.join(root,'src/plugins/resonance-workbench/view-components.js'),'utf8');assert(resonance.includes('reswinRecoverDetector'));assert(resonance.includes('reswinRecoverMetricAlgorithm'));assert(resonance.includes('recoverLockedAlgorithm'));
console.log('Algorithm package catalog/recovery current-contract checks passed.');
