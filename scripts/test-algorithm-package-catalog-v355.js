const assert=require('assert');
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const Semver=require(path.join(root,'semver-compat'));
const Catalog=require(path.join(root,'algorithm-package-catalog'));
const {normalizePluginPackage}=require(path.join(root,'plugin-package'));

assert(Semver.satisfies('3.55.0','>=3.50.0 <4.0.0'));
assert(!Semver.satisfies('4.0.0','>=3.50.0 <4.0.0'));
assert(Semver.satisfies('1.8.0','^1.8.0'));
assert(!Semver.satisfies('2.0.0','^1.8.0'));

const pkg=normalizePluginPackage({schema:1,manifest:{id:'demo.algorithm-provider',name:'Demo Algorithm Provider',version:'2.0.0',apiVersion:'1.8.0',entry:'plugin.js',requiresCore:['analysis.algorithms'],algorithmProvider:true,algorithmCategories:['peak-metrics'],algorithmProvides:[{category:'peak-metrics',id:'demo.fwhm',version:'1.0.0',title:'Demo FWHM'}],compatibility:{app:'>=3.50.0 <4.0.0',pluginApi:'^1.8.0'},pluginDependencies:[{id:'demo.dependency',range:'^2.0.0'}]},files:{'plugin.js':'(()=>{})();'}});
assert.strictEqual(pkg.manifest.algorithmProvides[0].id,'demo.fwhm');
assert.strictEqual(pkg.manifest.compatibility.app,'>=3.50.0 <4.0.0');
assert.strictEqual(pkg.manifest.pluginDependencies[0].range,'^2.0.0');

const packages=[{source:'history',token:'demo-v2.dkplugin',manifest:pkg.manifest,current:false,installed:false}];
let out=Catalog.catalog(packages,{category:'peak-metrics',id:'demo.fwhm',version:'1.0.0'},{appVersion:'3.55.0',pluginApiVersion:'1.8.0',installedVersions:{'demo.dependency':'2.3.0'}});
assert.strictEqual(out.count,1);assert.strictEqual(out.candidates[0].compatible,true);assert.strictEqual(out.candidates[0].recoverable,true);
out=Catalog.catalog(packages,{category:'peak-metrics',id:'demo.fwhm',version:'1.0.0'},{appVersion:'3.55.0',pluginApiVersion:'1.8.0',installedVersions:{'demo.dependency':'1.9.0'}});
assert.strictEqual(out.candidates[0].compatible,false);assert(out.candidates[0].compatibility.issues.some(row=>row.kind==='plugin-dependency'));

for(const [file,expected] of [['src/plugins/resonance-detector-robust/plugin.json',['peak-detector::robust-ricker-v1@1.0.0','peak-metrics::baseline-fwhm-v1@1.0.0']],['src/plugins/standard-transport-algorithms/plugin.json',['transport-transform::transport.didv@1.0.0','transport-scalar-field::transport.scalar-field@1.0.0','ter-analysis::ter.high-low-ratio@1.0.0']]]){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));const keys=(manifest.algorithmProvides||[]).map(row=>`${row.category}::${row.id}@${row.version}`);for(const key of expected)assert(keys.includes(key),`${file} missing catalog entry ${key}`);assert(manifest.compatibility?.app&&manifest.compatibility?.pluginApi,`${file} missing compatibility ranges`);
}
const main=fs.readFileSync(path.join(root,'main.js'),'utf8');assert(main.includes("ipcMain.handle('plugins:algorithmCatalog'"));assert(main.includes("assertPackageCompatible(pkg.manifest,'install/update')"));assert(main.includes("assertPackageCompatible(selected.manifest,'rollback')"));
const preload=fs.readFileSync(path.join(root,'preload.js'),'utf8');assert(preload.includes('pluginAlgorithmCatalog'));
const kernel=fs.readFileSync(path.join(root,'src/core/plugin-kernel.js'),'utf8');assert(kernel.includes('locate:locateAlgorithmPackage'));assert(kernel.includes('recover:recoverAlgorithmPackage'));
const ter=fs.readFileSync(path.join(root,'src/plugins/ter-analysis/analysis-service.js'),'utf8');assert(ter.includes('terRecoverAlgorithmBtn'));assert(ter.includes('api.recover'));
const resonance=fs.readFileSync(path.join(root,'src/plugins/resonance-workbench/view-components.js'),'utf8');assert(resonance.includes('reswinRecoverDetector'));assert(resonance.includes('reswinRecoverMetricAlgorithm'));assert(resonance.includes('recoverLockedAlgorithm'));
console.log('Algorithm package catalog/recovery v3.55 OK');
