'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const generator=path.join(root,'sdk','python','dkds_plugin_gen.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const sdk=require('../sdk/contract.json');
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};
function pythonCommand(){for(const [cmd,prefix] of (process.platform==='win32'?[['python',[]],['py',['-3']]]:[['python3',[]],['python',[]]])){const p=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});if(!p.error&&p.status===0)return {cmd,prefix};}throw new Error('Python 3 required');}
assert.strictEqual(sdk.sdkVersion,'1.51.61');
assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(unitSpec.UNIT_CATALOG).length,41);
const spec={schema:'dkds.declarative-plugin.v1',plugin:{id:'com.example.live-bindings',name:'Live Bindings',version:'1.0.0',description:'Read-only snapshot binding gate'},page:{id:'live-bindings',label:'Live Bindings',title:'Live Bindings',actionIds:[]},workspace:{activity:'live-bindings',primaryRole:'scientific-primary'},data:{accepts:['science.transport.iv']},domainAdapter:{ref:'builtin.example/live',dependency:'builtin.example'},content:[{kind:'note',text:'primary'}],surfaces:[{id:'inspector',label:'Inspector',role:'prime',presentationRole:'inspector',semanticKind:'inspector',placements:['right','bottom','float'],defaultPlacement:'right',chromeHeaderId:'head',children:[{kind:'header',id:'head',title:'Inspector'},{kind:'status',id:'selection',text:'—',binding:{statePath:'selection.label',fallback:'none',prefix:'Selected: '}},{kind:'metric',id:'count',label:'Count',binding:{statePath:'diagnostics.count',fallback:'0'}},{kind:'field',id:'view',type:'text',label:'Active view',binding:{statePath:'activeView'}},{kind:'field',id:'enabled',type:'checkbox',label:'Enabled',binding:{statePath:'settings.enabled'}},{kind:'table',id:'rows',columns:[{key:'name',label:'Name'},{key:'value',label:'Value'}],rows:[],binding:{statePath:'rows'}}]}]};
const py=pythonCommand(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-live-bindings-'));
try{
  const specPath=path.join(temp,'spec.json'),out=path.join(temp,'generated');
  fs.writeFileSync(specPath,JSON.stringify(spec,null,2));
  const build=spawnSync(py.cmd,py.prefix.concat([generator,'build',specPath,out]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'generation failed:\n'+build.stdout+'\n'+build.stderr);
  const source=fs.readFileSync(path.join(out,'plugin.js'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(out,'plugin.json'),'utf8'));
  assert(source.includes('const liveBindings=[]')&&source.includes('const refreshLiveBindings=()=>'),'All bound Units must share one snapshot refresh pipeline.');
  assert(source.includes('liveDomain.snapshot()?.state||{}'),'Binding refresh must read the authoritative Domain Adapter snapshot.');
  for(const token of ['.value.textContent=','.control.value=','.input.checked=','.textContent=','?.setData?.'])assert(source.includes(token),'Missing public binding update surface: '+token);
  assert(source.includes('readOnly:true')&&source.includes('disabled:true'),'Bound controls must be presentation-only/read-only.');
  assert(!/querySelector|Unit_for_|plugin\.css/.test(source),'Snapshot bindings must not use private DOM/selectors or plugin-specific presentation paths.');
  assert(manifest.requiresCore.includes('services'));assert.deepStrictEqual(manifest.pluginDependencies,[{id:'builtin.example'}]);
  const validate=spawnSync(process.execPath,[validator,'validate',out],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validate.status,0,'generated package validation failed:\n'+validate.stdout+'\n'+validate.stderr);
  const invalid={...spec,surfaces:[{...spec.surfaces[0],children:[{kind:'header',id:'head',title:'Inspector'},{kind:'status',id:'bound',text:'x',binding:{statePath:'activeView'}}]}]};delete invalid.domainAdapter;
  fs.writeFileSync(specPath,JSON.stringify(invalid,null,2));
  const rejected=spawnSync(py.cmd,py.prefix.concat([generator,'check',specPath]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejected.status,0);assert((rejected.stderr||'').includes('requires top-level domainAdapter'));
  console.log('Phase F live snapshot bindings PASS: one Domain Adapter snapshot -> public Status/Metric/Field/Check/Table handles.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
