const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'..','src','core','host','mobile-plugin-package.js'),'utf8');
const window={};
vm.runInNewContext(source,{window,Object,Set,JSON,Error},{filename:'mobile-plugin-package.js'});
const normalize=window.DKDSMobilePluginPackage.normalize;

const valid=normalize({
  schema:1,
  manifest:{id:'lab.sdk-mobile',name:'SDK Mobile Lab',version:'1.0.0',apiVersion:'1.18.0',pluginType:'workbench',entry:'plugin.js',styles:['style.css']},
  files:{'plugin.js':'window.__sdkMobile=true;','style.css':'.sdk-mobile{display:block}'}
});
assert.strictEqual(valid.manifest.source,'external');
assert.strictEqual(valid.manifest.id,'lab.sdk-mobile');
assert.deepStrictEqual(Array.from(valid.manifest.scripts),['plugin.js']);

assert.throws(()=>normalize({schema:1,manifest:{id:'lab.bad',name:'Bad',version:'1.0.0',apiVersion:'1.18.0'},files:{'../plugin.js':''}}),/Unsafe plugin file path/);
assert.throws(()=>normalize({schema:1,manifest:{id:'builtin.bad',name:'Bad',version:'1.0.0',apiVersion:'1.18.0'},files:{'plugin.js':''}}),/reserved plugin id/);
assert.throws(()=>normalize({schema:1,manifest:{id:'lab.tool',name:'Tool',version:'1.0.0',apiVersion:'1.18.0',pluginType:'tool'},files:{'plugin.js':''}}),/workspace\.role=top/);

console.log('Android plugin package validator passed: SDK package reuse, safe paths and TOP tool contract.');
