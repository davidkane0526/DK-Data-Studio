'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const vm=require('vm');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const reference=path.join(root,'examples','declarative-python-task-reference','build_plugin.py');
const validator=path.join(root,'sdk','tools','dkds-plugin.js');
const pythonEnv={...process.env,PYTHONDONTWRITEBYTECODE:'1'};

function pythonCommand(){
  const candidates=process.platform==='win32'
    ? [['python',[]],['py',['-3']]]
    : [['python3',[]],['python',[]]];
  for(const [cmd,prefix] of candidates){
    const probe=spawnSync(cmd,prefix.concat(['--version']),{encoding:'utf8',env:pythonEnv});
    if(!probe.error&&probe.status===0)return {cmd,prefix};
  }
  throw new Error('Python 3 is required for the authoring-time portable-task gate.');
}

(async()=>{
  const py=pythonCommand();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-portable-task-'));
  try{
    const generated=path.join(temp,'generated');
    const build=spawnSync(py.cmd,py.prefix.concat([reference,generated]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(build.status,0,'Portable task reference generation failed:\n'+build.stdout+'\n'+build.stderr);

    const files=fs.readdirSync(generated).sort();
    assert.deepStrictEqual(files,['README.md','generated-task-analyze-curve.js','plugin.js','plugin.json']);
    assert(!files.some(name=>/\.py(?:c|o)?$/i.test(name)),'Generated runtime package must contain no Python source/bytecode.');

    const manifest=JSON.parse(fs.readFileSync(path.join(generated,'plugin.json'),'utf8'));
    const pluginSource=fs.readFileSync(path.join(generated,'plugin.js'),'utf8');
    const taskSource=fs.readFileSync(path.join(generated,'generated-task-analyze-curve.js'),'utf8');

    assert.strictEqual(manifest.apiVersion,'1.19.0');
    assert(manifest.requiresCore.includes('execution.tasks'),'Generated task plugin must use the existing Core Task Runner.');
    assert.deepStrictEqual(manifest.tasks,[{id:'analyze-curve',entry:'generated-task-analyze-curve.js'}]);
    assert(!manifest.requiresCore.some(value=>/python/i.test(String(value))),'Runtime manifest must not require a Python backend.');
    assert(pluginSource.includes("ctx.tasks.submit(\"analyze-curve\""),'Generated action must submit through ctx.tasks.');
    assert(pluginSource.includes('g_generated_curve_surface.requestRender?.()'),'Task result must refresh the generated Unit ScientificPlot.');
    assert(!/ctx\.python|runtimeProviders|pythonProvider/i.test(pluginSource),'Generated plugin runtime must not contain a Python execution bridge.');

    assert(taskSource.includes('self.DKDSTaskDefinition=Object.freeze'),'Portable authoring must lower to a normal JavaScript DKDSTaskDefinition.');
    assert(!/\bdef\s+analyze_curve\b|import\s+python|Pyodide|pythonProvider/i.test(taskSource),'Task runtime must contain only lowered JavaScript.');

    const sandbox={self:{},console};
    sandbox.globalThis=sandbox.self;
    vm.createContext(sandbox);
    vm.runInContext(taskSource,sandbox,{filename:'generated-task-analyze-curve.js'});
    assert.equal(typeof sandbox.self.DKDSTaskDefinition?.run,'function');

    const result=await sandbox.self.DKDSTaskDefinition.run({sample_count:5,gain:2,normalize:false},{});
    assert.strictEqual(result.count,5);
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(result.points)),
      [{x:-2,y:8},{x:-1,y:2},{x:0,y:0},{x:1,y:2},{x:2,y:8}]
    );

    const normalized=await sandbox.self.DKDSTaskDefinition.run({sample_count:3,gain:2,normalize:true},{});
    assert.strictEqual(normalized.points.length,3);
    assert(Math.abs(normalized.points[0].y-(2/3))<1e-12);
    assert.strictEqual(normalized.points[1].y,0);

    const validation=spawnSync(process.execPath,[validator,'validate',generated],{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(validation.status,0,'Generated portable task plugin failed ordinary SDK validation:\n'+validation.stdout+'\n'+validation.stderr);

    const rejectCode=[
      'import sys',
      'sys.path.insert(0, '+JSON.stringify(path.join(root,'sdk','python'))+')',
      'from dkds_portable_task import compile_portable_task, PortableTaskError',
      'bad="def bad(x: int) -> int:\\n    while x > 0:\\n        x -= 1\\n    return x\\n"',
      'try:',
      '    compile_portable_task("bad",bad,function_name="bad")',
      'except PortableTaskError:',
      '    raise SystemExit(0)',
      'raise SystemExit(3)'
    ].join('\n');
    const rejected=spawnSync(py.cmd,py.prefix.concat(['-c',rejectCode]),{cwd:root,encoding:'utf8',env:pythonEnv});
    assert.strictEqual(rejected.status,0,'Unsupported Python must fail closed during authoring-time lowering.');

    console.log('Phase F portable Python task lowering PASS: Python authoring -> JS DKDSTaskDefinition -> Core Task Runner; no Python runtime/backend.');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exit(1);});
