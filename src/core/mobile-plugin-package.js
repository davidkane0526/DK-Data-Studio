(() => {
  const MAX_FILES=64,MAX_FILE_CHARS=4*1024*1024,MAX_TOTAL_CHARS=8*1024*1024;
  const TYPES=new Set(['foundation','data','algorithm','workbench','task','tool','extension','developer']);
  const validId=value=>/^[a-z0-9][a-z0-9._-]*$/i.test(String(value||''));
  function fileName(value){
    const raw=String(value||'').replace(/\\/g,'/').trim();
    if(!raw||raw.startsWith('/')||/^[a-z]:\//i.test(raw))throw new Error(`Invalid plugin file path: ${value}`);
    const parts=[];
    for(const part of raw.split('/')){
      if(!part||part==='.')continue;
      if(part==='..')throw new Error(`Unsafe plugin file path: ${value}`);
      parts.push(part);
    }
    const normalized=parts.join('/');
    if(!normalized||normalized.length>220)throw new Error(`Invalid plugin file path: ${value}`);
    return normalized;
  }
  function normalize(input){
    const pkg=typeof input==='string'?JSON.parse(input):input;
    if(!pkg||typeof pkg!=='object'||Array.isArray(pkg))throw new Error('Plugin package must be an object.');
    if(Number(pkg.schema)!==1)throw new Error(`Unsupported plugin package schema: ${pkg.schema}`);
    const raw=pkg.manifest;
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Plugin package manifest is missing.');
    const id=String(raw.id||'').trim(),name=String(raw.name||'').trim(),version=String(raw.version||'').trim();
    const apiVersion=String(raw.apiVersion||'1.0.0').trim(),pluginType=String(raw.pluginType||'extension').trim().toLowerCase();
    if(!validId(id)||id.startsWith('builtin.'))throw new Error(`Invalid or reserved plugin id: ${id}`);
    if(!name||!version)throw new Error('Plugin manifest.name and version are required.');
    if(!apiVersion.startsWith('1.'))throw new Error(`Unsupported Plugin API: ${apiVersion}`);
    if(!TYPES.has(pluginType))throw new Error(`Unsupported pluginType: ${pluginType}`);
    const entry=fileName(raw.entry||'plugin.js');
    const entries=Object.entries(pkg.files||{});
    if(!entries.length||entries.length>MAX_FILES)throw new Error(`Invalid plugin file count: ${entries.length}`);
    const files={};let total=0;
    for(const [key,value] of entries){
      const normalized=fileName(key);
      if(Object.hasOwn(files,normalized)||typeof value!=='string')throw new Error(`Invalid plugin file: ${normalized}`);
      if(value.length>MAX_FILE_CHARS)throw new Error(`Plugin file is too large: ${normalized}`);
      total+=value.length;if(total>MAX_TOTAL_CHARS)throw new Error('Plugin package is too large.');
      files[normalized]=value;
    }
    const scripts=Array.isArray(raw.scripts)&&raw.scripts.length?raw.scripts.map(fileName):[entry];
    if(!scripts.includes(entry))scripts.push(entry);
    const styles=Array.isArray(raw.styles)?raw.styles.map(fileName):[];
    for(const script of scripts)if(!Object.hasOwn(files,script)||!script.toLowerCase().endsWith('.js'))throw new Error(`Plugin script is missing or invalid: ${script}`);
    for(const style of styles)if(!Object.hasOwn(files,style)||!style.toLowerCase().endsWith('.css'))throw new Error(`Plugin stylesheet is missing or invalid: ${style}`);
    if(pluginType==='tool'){
      const activity=String(raw.workspace?.activity||'').trim();
      if(String(raw.workspace?.role||'').toLowerCase()!=='top'||!validId(activity)||String(raw.window?.activity||'')!==activity){
        throw new Error('Tool plugins require matching workspace.role=top and window.activity contracts.');
      }
    }
    const manifest={...raw,id,name,version,apiVersion,pluginType,entry,scripts:[...new Set(scripts)],styles:[...new Set(styles)],source:'external',enabled:raw.enabled!==false};
    return {schema:1,manifest,files,installedAt:pkg.installedAt||null};
  }
  window.DKDSMobilePluginPackage=Object.freeze({normalize,validId,fileName});
})();
