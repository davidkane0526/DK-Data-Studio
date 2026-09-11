'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
function loadData(){const context={console,structuredClone,ArrayBuffer,Float32Array,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8'),context,{filename:'model.js'});return context.DKDSData;}
const D=loadData();
const table=D.createTable({id:'table:range',name:'Range table',semanticType:'science.test',columns:[
  {id:'col:x',key:'x',name:'Bias',unit:'V',dtype:'float64',role:'x',metadata:{sourceHeader:'Voltage'},values:[-0,1,2,NaN,4,5]},
  {id:'col:y',key:'y',name:'Current',unit:'A',dtype:'float32',role:'y',values:[0,1,2,3,4,5]},
  {id:'col:label',key:'label',name:'Label',dtype:'string',role:'label',values:['a','b','c','d','e','f']}
],metadata:{dataAssignments:['*'],marker:'keep'},lineage:{parents:['source:1'],operation:'import'},provenance:[{type:'import',label:'Import'}]});
const other=D.createTable({id:'table:other',columns:[{key:'z',dtype:'number',values:[1]}]});
const store=D.createStore([table,other]);
assert.strictEqual(typeof store.listMetadata,'function','Store must expose metadata-only listing.');
assert.strictEqual(typeof store.columnMetadata,'function','Store must expose lightweight column metadata enumeration.');
assert.strictEqual(typeof store.readColumnRange,'function','Store must expose bounded column range reads.');
const listed=store.listMetadata({includeTransient:true});
const meta=listed.find(row=>row.id===table.id);
assert(meta&&meta.kind==='data.table'&&meta.rowCount===6,'Metadata listing must retain table identity and dimensions.');
assert.strictEqual(meta.provenanceCount,1,'Metadata listing must expose provenance count without copying provenance steps.');
assert.deepStrictEqual(Array.from(meta.provenanceTypes),['import'],'Metadata listing must retain only lightweight provenance type summaries.');
assert(!Object.prototype.hasOwnProperty.call(meta,'provenance'),'Metadata listing must not carry full provenance arrays.');
assert(Array.isArray(meta.columns)&&meta.columns.length===3,'Table metadata must enumerate columns.');
assert(meta.columns.every(column=>!Object.prototype.hasOwnProperty.call(column,'values')),'Column metadata must never contain values.');
assert.deepStrictEqual(Array.from(meta.metadata.dataAssignments),['*'],'Metadata listing must retain assignment metadata needed for plugin visibility.');
meta.metadata.marker='changed';meta.columns[0].metadata.sourceHeader='changed';
const canonical=store.get(table.id);
assert.strictEqual(canonical.metadata.marker,'keep','Metadata snapshots must not alias canonical artifact metadata.');
assert.strictEqual(canonical.columns[0].metadata.sourceHeader,'Voltage','Column metadata snapshots must not alias canonical column metadata.');
const columns=store.columnMetadata(table.id);
assert.strictEqual(columns.length,3);assert.strictEqual(columns[0].id,'col:x');assert.strictEqual(columns[0].length,6);assert.strictEqual(columns[0].artifactRevision,store.artifactRevision(table.id));
assert(!Object.prototype.hasOwnProperty.call(columns[0],'values'));
assert.strictEqual(store.columnMetadata('missing'),null);assert.strictEqual(store.columnMetadata(other.id).length,1);
assert.throws(()=>store.readColumnRange(table.id,'x'),/limit/i,'Range reads must require an explicit finite limit.');
assert.throws(()=>store.readColumnRange(table.id,'x',{limit:Infinity}),/limit/i);
assert.throws(()=>store.readColumnRange(table.id,'x',{limit:65537}),/limit/i);
assert.throws(()=>store.readColumnRange(table.id,'x',{start:-1,limit:2}),/start/i);
assert.throws(()=>store.readColumnRange(table.id,'x',{start:1.5,limit:2}),/start/i);
const range=store.readColumnRange(table.id,'x',{start:1,limit:3});
assert.strictEqual(range.owner.artifactId,table.id);assert.strictEqual(range.owner.columnId,'col:x');assert.strictEqual(range.dtype,'float64');assert.strictEqual(range.start,1);assert.strictEqual(range.end,4);assert.strictEqual(range.length,3);assert.strictEqual(range.totalLength,6);assert.strictEqual(range.artifactRevision,store.artifactRevision(table.id));assert.deepStrictEqual(Array.from(range.values),[1,2,NaN]);
assert(Object.is(store.readColumnRange(table.id,'x',{start:0,limit:1}).values[0],-0),'Range reads must preserve -0.');
assert(Object.isFrozen(range)&&Object.isFrozen(range.owner)&&Object.isFrozen(range.values),'Range snapshots must be immutable containers.');
const tail=store.readColumnRange(table.id,0,{start:5,limit:10});assert.deepStrictEqual(Array.from(tail.values),[5]);assert.strictEqual(tail.end,6);
const labels=store.readColumnRange(table.id,'label',{start:2,limit:2});assert.strictEqual(labels.dtype,'string');assert.deepStrictEqual(Array.from(labels.values),['c','d'],'Range reads must support generic non-numeric cells without scanning the rest of the column.');
const empty=store.readColumnRange(table.id,'x',{start:99,limit:2});assert.strictEqual(empty.start,6);assert.strictEqual(empty.end,6);assert.deepStrictEqual(Array.from(empty.values),[]);
assert.strictEqual(store.readColumnRange('missing','x',{limit:2}),null);assert.strictEqual(store.readColumnRange(table.id,'missing',{limit:2}),null);
const stable=range.artifactRevision;store.upsert({...store.get(other.id),name:'Other changed'});assert.strictEqual(store.artifactRevision(table.id),stable,'Unrelated Artifact edits must not invalidate range revision.');
const changed=store.get(table.id);changed.columns[0].values[1]=10;store.upsert(changed);assert(store.artifactRevision(table.id)>stable,'Owning Artifact edits must advance range revision.');
const modelSource=fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8');
const hostSource=fs.readFileSync(path.join(root,'src/app/modules/data-artifact-host.js'),'utf8');
const pluginSource=fs.readFileSync(path.join(root,'src/core/plugins/kernel/modules/plugin-api.js'),'utf8');
const windowSource=fs.readFileSync(path.join(root,'src/plugin-window/runtime.js'),'utf8');
const types=fs.readFileSync(path.join(root,'sdk/plugin-api.d.ts'),'utf8');
assert(modelSource.includes('MAX_COLUMN_RANGE_VALUES')&&modelSource.includes('readColumnRange(id,ref,options={})'));
for(const [name,source] of [['host',hostSource],['plugin',pluginSource],['window',windowSource]])assert(source.includes('listMetadata')&&source.includes('columnMetadata')&&source.includes('readColumnRange'),`${name} facade must expose metadata/range methods.`);
assert(types.includes('DKDSColumnMetadata')&&types.includes('DKDSColumnRangeSnapshot')&&types.includes('readColumnRange('));
console.log('v3.68.78 lightweight column metadata + bounded range read contract passed.');
