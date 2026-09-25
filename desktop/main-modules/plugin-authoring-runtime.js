'use strict';

const fs=require('fs');
const path=require('path');
const os=require('os');
const crypto=require('crypto');
const childProcess=require('child_process');

const MAX_SOURCE_BYTES=4*1024*1024;
const SESSION_TTL_MS=30*60*1000;
const PYTHON_FILES=['dkds_source_import.py','dkds_plugin_gen.py','dkds_portable_task.py'];

function createPluginAuthoringRuntime({app,appRoot,dialog,nativeSaveRuntime,nativeDialogBroker,pluginInstallPlan,commitPluginInstall,restoreInstalledPackage}){
  const sessions=new Map();
  let pythonCache=null;
  let toolRootCache='';

  function sweep(){
    const now=Date.now();
    for(const [token,row] of sessions){
      if(now-Number(row.createdAt||0)<=SESSION_TTL_MS)continue;
      sessions.delete(token);
      try{fs.rmSync(row.workDir,{recursive:true,force:true});}catch{}
    }
  }

  function pythonCandidates(){
    const configured=String(process.env.DKDS_PYTHON||'').trim();
    const rows=[];
    if(configured)rows.push({cmd:configured,prefix:[]});
    if(process.platform==='win32')rows.push({cmd:'py',prefix:['-3']},{cmd:'python',prefix:[]},{cmd:'python3',prefix:[]});
    else rows.push({cmd:'python3',prefix:[]},{cmd:'python',prefix:[]});
    const seen=new Set();
    return rows.filter(row=>{const key=row.cmd+'\0'+row.prefix.join('\0');if(seen.has(key))return false;seen.add(key);return true;});
  }

  function resolvePython({refresh=false}={}){
    if(pythonCache&&!refresh)return pythonCache;
    for(const row of pythonCandidates()){
      const probe=childProcess.spawnSync(row.cmd,[...row.prefix,'-c','import sys,json;print(json.dumps({"major":sys.version_info[0],"minor":sys.version_info[1],"executable":sys.executable}))'],{
        encoding:'utf8',timeout:5000,windowsHide:true,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}
      });
      if(probe.error||probe.status!==0)continue;
      try{
        const info=JSON.parse(String(probe.stdout||'').trim());
        if(Number(info.major)!==3)continue;
        pythonCache=Object.freeze({cmd:row.cmd,prefix:[...row.prefix],version:`${info.major}.${info.minor}`,executable:String(info.executable||row.cmd)});
        return pythonCache;
      }catch{}
    }
    pythonCache=null;
    return null;
  }

  function toolRoot(){
    if(toolRootCache&&fs.existsSync(toolRootCache))return toolRootCache;
    const root=path.join(app.getPath('temp'),'dkds-plugin-authoring-sdk');
    fs.mkdirSync(root,{recursive:true});
    for(const name of PYTHON_FILES){
      const source=path.join(appRoot,'sdk','python',name);
      if(!fs.existsSync(source))throw new Error(`Authoring SDK file is missing: ${name}`);
      fs.writeFileSync(path.join(root,name),fs.readFileSync(source));
    }
    toolRootCache=root;
    return root;
  }

  function runPython(args,{timeout=30000}={}){
    const python=resolvePython();
    if(!python){
      const err=new Error('未找到 Python 3。Python/Jupyter 源码导入只在 authoring 阶段需要 Python 3；生成并安装后的插件不依赖 Python。');
      err.code='PYTHON_AUTHORING_UNAVAILABLE';
      throw err;
    }
    const root=toolRoot();
    const script=path.join(root,'dkds_source_import.py');
    const result=childProcess.spawnSync(python.cmd,[...python.prefix,script,...args],{
      cwd:root,encoding:'utf8',timeout,windowsHide:true,maxBuffer:8*1024*1024,
      env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'}
    });
    if(result.error)throw result.error;
    if(result.status!==0){
      const err=new Error(String(result.stderr||result.stdout||`Python authoring exited with ${result.status}`).trim());
      err.code='PYTHON_AUTHORING_FAILED';
      throw err;
    }
    return {stdout:String(result.stdout||''),stderr:String(result.stderr||'')};
  }

  function session(token){
    sweep();
    const row=sessions.get(String(token||''));
    if(!row){const err=new Error('Python/Jupyter authoring session has expired.');err.code='PLUGIN_AUTHORING_SESSION_EXPIRED';throw err;}
    return row;
  }

  function analyzeSource(sourcePath){
    const stat=fs.statSync(sourcePath);
    if(!stat.isFile())throw new Error('Authoring source must be a file.');
    if(stat.size>MAX_SOURCE_BYTES)throw new Error(`Python/Jupyter source exceeds ${MAX_SOURCE_BYTES/1024/1024} MB.`);
    const ext=path.extname(sourcePath).toLowerCase();
    if(!['.py','.ipynb'].includes(ext))throw new Error('Authoring source must be .py or .ipynb.');
    const token=crypto.randomUUID();
    const workDir=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-plugin-authoring-'));
    const reportPath=path.join(workDir,'analysis.json');
    runPython(['analyze',sourcePath,'--output',reportPath]);
    const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
    const row={token,sourcePath,name:path.basename(sourcePath),workDir,createdAt:Date.now(),report,package:null,build:null};
    sessions.set(token,row);
    return row;
  }

  function publicAnalysis(row){
    return {
      token:row.token,
      name:row.name,
      python:resolvePython(),
      report:row.report,
      sourceExecuted:false,
      runtimePythonRequired:false
    };
  }

  function build(row,functionId){
    const selected=String(functionId||'').trim();
    if(!selected)throw new Error('请选择一个可转换函数。');
    const packagePath=path.join(row.workDir,'generated.dkplugin');
    const reportPath=path.join(row.workDir,'build.json');
    runPython(['build',row.sourcePath,'--function-id',selected,'--package',packagePath,'--report',reportPath],{timeout:45000});
    const raw=JSON.parse(fs.readFileSync(packagePath,'utf8'));
    const plan=pluginInstallPlan(raw);
    const buildReport=JSON.parse(fs.readFileSync(reportPath,'utf8'));
    row.package=plan.pkg;
    row.build={functionId:selected,report:buildReport,installationKind:plan.installationKind,requiresRestart:plan.requiresRestart,previousVersion:plan.previousVersion,bundledVersion:plan.bundledVersion};
    return {
      ok:true,
      package:plan.pkg,
      manifest:plan.manifest,
      installationKind:plan.installationKind,
      requiresRestart:plan.requiresRestart,
      previousVersion:plan.previousVersion,
      bundledVersion:plan.bundledVersion,
      report:buildReport
    };
  }

  function install(row){
    if(!row.package)throw new Error('请先构建并验证插件。');
    let plan=null;
    try{
      plan=pluginInstallPlan(row.package);
      const installed=commitPluginInstall(plan,{generatedBy:'python-source-import'});
      return {ok:true,package:installed,installationKind:plan.installationKind,requiresRestart:plan.requiresRestart};
    }catch(err){
      try{if(plan)restoreInstalledPackage(plan.manifest.id,plan.previousPackage||null);}catch{}
      throw err;
    }
  }

  function installIpc(ipcMain){
    ipcMain.handle('plugins:authoringStatus',async()=>({available:!!resolvePython(),python:resolvePython(),sourceExecuted:false,runtimePythonRequired:false}));
    ipcMain.handle('plugins:authoringSelectSource',async()=>{
      const python=resolvePython();
      if(!python)return {ok:false,error:{code:'PYTHON_AUTHORING_UNAVAILABLE',message:'未找到 Python 3。请安装 Python 3 后重新导入；生成后的插件本身不依赖 Python。'}};
      const result=await dialog.showOpenDialog({
        title:'选择 Python / Jupyter 插件源码',properties:['openFile'],
        filters:[{name:'Python / Jupyter',extensions:['py','ipynb']},{name:'Python',extensions:['py']},{name:'Jupyter Notebook',extensions:['ipynb']}]
      });
      if(result.canceled||!result.filePaths.length)return {ok:true,canceled:true};
      try{return {ok:true,canceled:false,...publicAnalysis(analyzeSource(result.filePaths[0]))};}
      catch(err){return {ok:false,error:{code:String(err.code||'PLUGIN_AUTHORING_ANALYZE_FAILED'),message:String(err.message||err)}};}
    });
    ipcMain.handle('plugins:authoringBuild',async(_event,payload={})=>{
      try{return build(session(payload.token),payload.functionId);}
      catch(err){return {ok:false,error:{code:String(err.code||'PLUGIN_AUTHORING_BUILD_FAILED'),message:String(err.message||err)}};}
    });
    ipcMain.handle('plugins:authoringInstall',async(_event,payload={})=>{
      try{return install(session(payload.token));}
      catch(err){return {ok:false,error:{code:String(err.code||'PLUGIN_AUTHORING_INSTALL_FAILED'),message:String(err.message||err)}};}
    });
    ipcMain.handle('plugins:authoringExport',async(event,payload={})=>{
      const row=session(payload.token);
      if(!row.package)throw new Error('请先构建并验证插件。');
      if(!nativeSaveRuntime.authorized(payload,'export')){
        nativeSaveRuntime.blockMissing({...payload,source:payload?.source||'core.plugin-manager.python-authoring'},'export');
        return null;
      }
      const manifest=row.package.manifest;
      const safeId=String(manifest.id||'generated').replace(/[^0-9A-Za-z._-]/g,'_');
      const safeVersion=String(manifest.version||'1.0.0').replace(/[^0-9A-Za-z._-]/g,'_');
      const defaultName=`${safeId}-${safeVersion}.dkplugin`;
      const result=await nativeDialogBroker.run(event,{kind:'pluginAuthoringExport',source:payload?.source||'core.plugin-manager.python-authoring',defaultName},async parent=>{
        const options={title:'导出生成的 DK Data Studio 插件',defaultPath:path.join(app.getPath('downloads'),defaultName),filters:[{name:'DK Data Studio Plugin',extensions:['dkplugin']}]};
        return parent?dialog.showSaveDialog(parent,options):dialog.showSaveDialog(options);
      },{blockedValue:null});
      if(!result||result.canceled||!result.filePath)return null;
      fs.writeFileSync(result.filePath,JSON.stringify(row.package,null,2)+'\n','utf8');
      return {path:result.filePath,name:path.basename(result.filePath),id:manifest.id,version:manifest.version};
    });
  }

  return Object.freeze({installIpc,resolvePython,analyzeSource,build,install,sessions});
}

module.exports={createPluginAuthoringRuntime};
