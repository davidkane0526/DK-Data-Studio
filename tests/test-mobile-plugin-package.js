const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'..','src','core','host','mobile-plugin-package.js'),'utf8');
const platformPresentation=require('../sdk/platform-presentation-contract');
const window={};
vm.runInNewContext(source,{window,Object,Set,JSON,Error,DKDSPlatformPresentationContract:platformPresentation},{filename:'mobile-plugin-package.js'});
const normalize=window.DKDSMobilePluginPackage.normalize;

const valid=normalize({
  schema:1,
  manifest:{id:'lab.sdk-mobile',name:'SDK Mobile Lab',version:'1.0.0',apiVersion:'1.19.0',pluginType:'workbench',entry:'plugin.js',styles:['style.css'],platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}}},
  files:{'plugin.js':'window.__sdkMobile=true;','style.css':'.sdk-mobile{display:block}'}
});
assert.strictEqual(valid.manifest.id,'lab.sdk-mobile');
assert.strictEqual(valid.manifest.pluginType,'workbench');
assert.strictEqual(valid.manifest.apiVersion,'1.19.0');
assert.deepStrictEqual(Array.from(valid.manifest.scripts),['plugin.js']);
assert(!Object.prototype.hasOwnProperty.call(valid.manifest,'source'),'Current mobile package normalization must not synthesize a legacy source classification field.');
assert.throws(()=>normalize({schema:1,manifest:{id:'lab.ui-no-presentation',name:'UI no presentation',version:'1.0.0',apiVersion:'1.19.0',pluginType:'workbench',entry:'plugin.js',styles:['style.css']},files:{'plugin.js':'','style.css':'.x{}'}}),/platformPresentation/,'Mobile package normalization must reject current UI packages that omit platformPresentation.');

assert.throws(()=>normalize({schema:1,manifest:{id:'lab.bad',name:'Bad',version:'1.0.0',apiVersion:'1.19.0',pluginType:'extension',entry:'../plugin.js'},files:{'../plugin.js':''}}),/Unsafe plugin file path/);
assert.throws(()=>normalize({schema:1,manifest:{id:'builtin.bad',name:'Bad',version:'1.0.0',apiVersion:'1.19.0',pluginType:'extension',entry:'plugin.js'},files:{'plugin.js':''}}),/reserved plugin id/);
assert.throws(()=>normalize({schema:1,manifest:{id:'lab.tool',name:'Tool',version:'1.0.0',apiVersion:'1.19.0',pluginType:'tool',entry:'plugin.js'},files:{'plugin.js':''}}),/workspace\.role=top/);
assert.throws(()=>normalize({schema:1,manifest:{id:'lab.no-type',name:'No Type',version:'1.0.0',apiVersion:'1.19.0',entry:'plugin.js'},files:{'plugin.js':''}}),/pluginType is required/);
assert.throws(()=>normalize({schema:1,manifest:{id:'lab.old-api',name:'Old API',version:'1.0.0',apiVersion:'1.18.0',pluginType:'extension',entry:'plugin.js'},files:{'plugin.js':''}}),/requires 1\.19\.0/);

console.log('Android plugin package validator passed: exact current Plugin API/type contract, safe paths and TOP tool contract.');
