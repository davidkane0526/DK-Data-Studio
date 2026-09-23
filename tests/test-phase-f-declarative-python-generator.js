'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const generator=path.join(root,'sdk','python','dkds_plugin_gen.py');
const reference=path.join(root,'examples','declarative-python-reference','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const schema=JSON.parse(fs.readFileSync(path.join(root,'sdk','declarative-plugin.schema.json'),'utf8'));
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

assert.strictEqual(schema.properties.schema.const,'dkds.declarative-plugin.v1');
assert(schema.properties.content.items.oneOf.some(row=>row?.properties?.kind?.const==='table'),'Declarative schema v1 must expose the canonical Unit table content kind.');
assert.strictEqual(unitSpec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38','Phase F generator must consume the frozen Unit contract, not advance it.');
assert(fs.existsSync(generator),'Python generator must exist.');
assert(fs.existsSync(reference),'Python reference authoring script must exist.');

function pythonCommand(){
  const candidates=process.platform==='win32'
    ? [['python',[]],['py',['-3']]]
    : [['python3',[]],['python',[]]];
  for(const row of candidates){
    const cmd=row[0],prefix=row[1];
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the Phase F generator gate.');
}

const py=pythonCommand();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-generator-'));
try{
  const generated=path.join(temp,'generated');
  const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(build.status,0,'Python reference generation failed:\n'+build.stdout+'\n'+build.stderr);

  const manifest=JSON.parse(fs.readFileSync(path.join(generated,'plugin.json'),'utf8'));
  const source=fs.readFileSync(path.join(generated,'plugin.js'),'utf8');
  assert.strictEqual(manifest.id,'com.example.generated-workbench');
  assert.strictEqual(manifest.apiVersion,'1.19.0');
  assert.strictEqual(manifest.pluginType,'workbench');
  assert(!manifest.styles,'Generated v1 plugins must not ship private CSS.');
  assert(manifest.requiresCore.includes('ui.unit-templates'));
  assert(manifest.requiresCore.includes('ui.scientific-plot'));

  for(const token of [
    'units.page.create',
    'units.pageHeader.create',
    'units.workspace.create',
    'units.layout.create',
    'units.panel.create',
    'units.field.create',
    'units.check.create',
    'units.prime.build',
    'units.note.create',
    'units.scientificPlot.create'
  ])assert(source.includes(token),'Generated reference missing public Unit call: '+token);
  assert(source.includes("variant:'fixed-titleless'")&&source.includes("presentationPurpose:'parameters'"),'Generated parameters must use the canonical titleless parameter PRIME.');
  assert(source.includes("variant:'form-grid-2'"),'Generated parameters must consume the published two-column form recipe.');
  assert(!/ctx\.ui\.styles|document\.|Unit_for_|plugin\.css/.test(source),'Generator must not create a private styling/DOM/specialized-Unit path.');

  const validation=spawnSync(process.execPath,[validator,'validate',generated],{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.strictEqual(validation.status,0,'Generated plugin failed the ordinary SDK validator:\n'+validation.stdout+'\n'+validation.stderr);
  assert(validation.stdout.includes('DKDS SDK validation OK: com.example.generated-workbench@1.0.0'));

  const invalidSpec=path.join(temp,'invalid.json');
  fs.writeFileSync(invalidSpec,JSON.stringify({
    schema:'dkds.declarative-plugin.v1',
    plugin:{id:'com.example.invalid',name:'Invalid',version:'1.0.0',description:'invalid private style request'},
    page:{id:'invalid',label:'Invalid',title:'Invalid'},
    workspace:{activity:'invalid',primaryRole:'scientific-primary'},
    data:{accepts:['science.transport.iv']},
    content:[{kind:'note',text:'invalid'}],
    styles:['plugin.css']
  },null,2));
  const rejection=spawnSync(py.cmd,py.prefix.concat([generator,'check',invalidSpec]),{cwd:root,encoding:'utf8',env:pythonEnv});
  assert.notStrictEqual(rejection.status,0,'Generator must fail closed on undeclared/private authoring fields.');
  assert((rejection.stderr||'').includes('unsupported top-level fields: styles'));

  console.log('Phase F declarative Python generator PASS: Python -> schema v1 -> Plugin API 1.19 -> frozen Unit Templates 2.5.38.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
