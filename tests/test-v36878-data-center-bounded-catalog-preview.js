const assert=require('assert');
const fs=require('fs');
const read=path=>fs.readFileSync(path,'utf8');
const feature=read('src/plugins/data-center/feature-runtime.js');
const selection=read('src/plugins/data-center/artifact-selection.js');
const manifest=JSON.parse(read('src/plugins/data-center/plugin.json'));

assert.strictEqual(manifest.version,'1.15.20');
assert(feature.includes("ctx.data.artifacts.listMetadata({includeTransient:true})"),'Data Center catalog must enumerate Artifact metadata instead of full payloads.');
assert(feature.includes('catalogCache={revision:-1,rows:[]}'),'Data Center must reuse one metadata catalog per Store revision during repeated UI renders.');
assert(selection.includes('ctx.data.artifacts.listMetadata({includeTransient:true})'),'Multi-selection must resolve selected rows from lightweight Artifact metadata.');
assert(feature.includes('ctx.data.artifacts.columnMetadata(meta.id)'),'Data Center table preview must enumerate lightweight column metadata.');
assert(feature.includes('ctx.data.artifacts.readColumnRange(meta.id,column.id,{start:0,limit:n})'),'Data Center table preview must read only its bounded visible row range.');
const preview=feature.slice(feature.indexOf('function renderPreview(){'),feature.indexOf('function renderFormula(){'));
assert(!preview.includes('a.columns.map(c=>`<td>${Number.isFinite(c.values[r])'),'Data Center preview must not read cells from a fully cloned table.');
assert(feature.includes('const current=ctx.data.artifacts.get?.(a.id)'),'Local rename must hydrate the complete Artifact before mutation.');
assert(feature.includes('const fullLocal=local.map(a=>ctx.data.artifacts.get?.(a.id)).filter(Boolean)'),'Local exclusion mutation must hydrate complete Artifacts instead of upserting metadata snapshots.');
console.log('v3.68.78 Data Center metadata catalog + bounded table preview PASS.');
