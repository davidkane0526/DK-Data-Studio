const assert=require('assert');
const fs=require('fs');
const path=require('path');
const F=require('../src/core/project-format.js');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const project={
  version:'3.25.0',
  datasets:[{
    name:'embedded.csv',path:'C:/missing/original/embedded.csv',text:'V,I\n0,1e-9\n1,2e-9\n',vg:1,
    points:[{v:0,i:1e-9,index:0,sourceLine:2},{v:1,i:2e-9,index:1,sourceLine:3}]
  }],
  scanVisibility:[['C:/missing/original/embedded.csv',{forward:true,reverse:true}]],
  peaks:[{id:'p1',datasetPath:'C:/missing/original/embedded.csv',v:1,i:2e-9}],
  plugins:{'builtin.ter-analysis':{workspace:{schema:1,result:{records:[{vg:1,vds:1,ter:100}]}}}}
};
const text=F.serializeProject(project,2);
const parsed=F.parseProjectText(text);
assert.deepStrictEqual(parsed.datasets[0].points,project.datasets[0].points,'embedded parsed points must round-trip');
assert.strictEqual(parsed.datasets[0].text,project.datasets[0].text,'embedded source text must round-trip');
assert.deepStrictEqual(parsed.plugins,project.plugins,'plugin analysis state must round-trip');

const utf8bom=Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from(text,'utf8')]);
assert.strictEqual(F.parseProjectBytes(utf8bom).project.datasets[0].points.length,2,'UTF-8 BOM project must open');
const utf16le=Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(text,'utf16le')]);
const decoded16=F.parseProjectBytes(utf16le);
assert.strictEqual(decoded16.encoding,'utf-16le');
assert.strictEqual(decoded16.project.datasets[0].name,'embedded.csv','UTF-16LE project must open');

const legacy={datasets:[],pulseAnalysis:{files:[{name:'old.csv'}]}};
const migrated=F.parseProjectText(JSON.stringify(legacy));
assert.ok(migrated.pulseAnalysis,'legacy root pulse state must be preserved for backward round-trip');
assert.deepStrictEqual(migrated.plugins['builtin.pulse-analysis'].workspace,legacy.pulseAnalysis,'legacy pulse state must also be mirrored into plugin namespace');
assert.throws(()=>F.parseProjectText('{"datasets":{}}'),/datasets/,'damaged dataset schema must be rejected');

const app=read('src/app.js');
const web=read('src/web-bridge.js');
const main=read('main.js');
assert(app.includes('if(Array.isArray(d.points)&&d.points.length)'),'project loader must prefer embedded parsed points when original data files do not exist');
assert(app.includes('name:d.name,path:d.path,text:d.text,vg:d.vg'),'project saver must keep embedded raw source text');
assert(app.includes('points:(d.points||[]).map'),'project saver must keep embedded parsed points');
assert(web.includes('DKDSProjectFormat.serializeProject')&&web.includes('DKDSProjectFormat.parseProjectBytes'),'web open/save must use the same project-format layer');
assert(main.includes('DKDSProjectFormat.serializeProject')&&main.includes('DKDSProjectFormat.parseProjectBytes'),'desktop open/save must use the same project-format layer');
console.log('Project format OK: self-contained data, shared desktop/web parser, legacy migration, BOM encodings.');
