'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const audit=require(path.join(root,'tools/quality/reachability-audit.js'));

const dead=`
function unusedHelper(value){ return value + 1; }
const liveHelper = value => value * 2;
module.exports = { liveHelper };
`;
const deadRows=audit.analyzeSource(dead,{file:'fixture.js'});
assert.deepEqual(deadRows.map(row=>row.name),['unusedHelper'],'A local single-reference helper should be reported while an exported binding remains live.');

const dynamic=`
function provider(){ return 1; }
const template = \`runtime-provider=\${provider}\`;
function callback(){ return 2; }
// callback is registered by an external composition contract.
module.exports={ callback };
obj.method = function descriptiveLabel(){ return 3; };
`;
assert.equal(audit.analyzeSource(dynamic).length,0,'Templates/comments/exports may conservatively keep a callback live; named function-expression labels are not declarations.');

const masked=audit.maskSource(`const x='function fake(){}'; // function fake2(){}\nfunction real(){}`);
assert.deepEqual(audit.declarations(masked).map(row=>row.name),['real'],'Declaration scanning must ignore strings/comments.');

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-reachability-'));
try{
  const coverageFile=path.join(tmp,'coverage.json');
  fs.writeFileSync(coverageFile,JSON.stringify({result:[{url:`file://${path.join(root,'src/core/ui/frame-scheduler.js')}`,functions:[{functionName:'requestFrame',ranges:[{startOffset:0,endOffset:1,count:0}]}]}]}));
  const coverage=audit.loadCoverage(tmp);
  const entry=coverage.get(path.join(root,'src/core/ui/frame-scheduler.js'));
  assert(entry&&entry.functions.get('requestFrame')===0,'V8 coverage evidence should preserve explicit zero-hit named functions.');
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }

const report=audit.validate();
assert.equal(report.highConfidence.length,0,'Current source tree must contain no high-confidence single-reference function declarations/bindings.');
console.log('v3.68.0 conservative function reachability audit regression passed.');
