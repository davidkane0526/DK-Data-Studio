(() => {
  if (window.electronAPI) return;

  window.__DKDS_WEB_CLIENT__ = true;
  document.documentElement.classList.add('web-client');

  const fileStore = new Map();
  const projectFileHandles = new Map();
  const nativePending = new Map();
  const nativeBridge = window.ReactNativeWebView?.postMessage
    ? window.ReactNativeWebView
    : null;

  function nativeCall(type,payload={}){
    if(!nativeBridge)return null;
    const id=`native-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        nativePending.delete(id);
        reject(new Error(`Native bridge timeout: ${type}`));
      },30000);
      nativePending.set(id,{resolve,reject,timer});
      nativeBridge.postMessage(JSON.stringify({id,type,payload}));
    });
  }

  window.__DKDS_NATIVE_RESOLVE__=(id,ok,value)=>{
    const row=nativePending.get(id);
    if(!row)return;
    clearTimeout(row.timer);
    nativePending.delete(id);
    if(ok)row.resolve(value);
    else row.reject(new Error(String(value||'Native operation failed')));
  };

  function receiveNativeMessage(event){
    let msg;
    try{msg=JSON.parse(String(event?.data||''));}catch{return;}
    if(!msg?.__dkdsNativeResponse)return;
    window.__DKDS_NATIVE_RESOLVE__(msg.id,msg.ok,msg.value);
  }
  window.addEventListener('message',receiveNativeMessage);
  document.addEventListener('message',receiveNativeMessage);

  if(nativeBridge){
    document.documentElement.classList.add('react-native-client');
    setTimeout(()=>nativeCall('ready',{href:location.href}).catch(()=>{}),0);
  }

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function chooseFiles({ multiple=true, accept='' }={}) {
    return new Promise(resolve => {
      const input=document.createElement('input');
      input.type='file';
      input.multiple=multiple;
      input.accept=accept;
      input.style.display='none';
      document.body.appendChild(input);
      input.onchange=()=>{
        const files=[...(input.files||[])];
        input.remove();
        resolve(files);
      };
      input.oncancel=()=>{input.remove();resolve([]);};
      input.click();
    });
  }

  function encodingAlias(enc) {
    const s=String(enc||'auto').toLowerCase();
    return ({
      auto:'utf-8',utf8:'utf-8',gbk:'gb18030',gb2312:'gb18030',
      sjis:'shift_jis','shift-jis':'shift_jis',latin1:'windows-1252',
      'iso-8859-1':'windows-1252'
    })[s]||s;
  }

  function base64Bytes(base64){
    const bin=atob(String(base64||''));
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return bytes;
  }

  function decodeBytes(bytes,encoding='auto'){
    let enc=encodingAlias(encoding);
    if(String(encoding).toLowerCase()==='auto'){
      if(bytes.length>=3&&bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)enc='utf-8';
      else if(bytes.length>=2&&bytes[0]===0xff&&bytes[1]===0xfe)enc='utf-16le';
      else if(bytes.length>=2&&bytes[0]===0xfe&&bytes[1]===0xff)enc='utf-16be';
      else{
        try{
          return {text:new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,''),encoding:'utf-8'};
        }catch{enc='gb18030';}
      }
    }
    try{
      return {text:new TextDecoder(enc,{fatal:false}).decode(bytes).replace(/^\uFEFF/,''),encoding:enc};
    }catch{
      return {text:new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/^\uFEFF/,''),encoding:'utf-8'};
    }
  }

  async function decodeFile(file,encoding='auto') {
    const buf=await file.arrayBuffer();
    const bytes=new Uint8Array(buf);
    return decodeBytes(bytes,encoding);
  }

  function registerFile(file) {
    const path=`webfile://${uuid()}/${encodeURIComponent(file.name)}`;
    fileStore.set(path,file);
    return {path,name:file.name,size:file.size};
  }

  function downloadBlob(blob,name) {
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=name||'download';
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1000);
    return true;
  }

  function projectPathForHandle(handle) {
    return `webfs://${handle?.name||'dk_data_project.dkds.json'}`;
  }

  async function writeProjectHandle(handle, content) {
    const writable=await handle.createWritable();
    await writable.write(content);
    await writable.close();
    const path=projectPathForHandle(handle);
    projectFileHandles.set(path,handle);
    return path;
  }

  function canUseFileSystemAccess() {
    return !!(window.isSecureContext && window.showSaveFilePicker && window.showOpenFilePicker);
  }

  async function copyText(text) {
    if(nativeBridge){
      return await nativeCall('copyText',{text:String(text??'')});
    }
    try{
      await navigator.clipboard.writeText(String(text??''));
      return true;
    }catch{
      const ta=document.createElement('textarea');
      ta.value=String(text??'');
      ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();
      const ok=document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  window.electronAPI = {
    isWebClient:true,

    openDataFiles: async()=>{
      if(nativeBridge){
        const assets=await nativeCall('openFiles',{multiple:true,type:'*/*'});
        for(const asset of assets||[])fileStore.set(asset.path,{...asset,native:true});
        return (assets||[]).map(({path,name,size})=>({path,name,size}));
      }
      const files=await chooseFiles({multiple:true,accept:'.csv,.txt,.dat,.tsv,.asc,.xy,.iv,.prn,.out,.log,text/*'});
      return files.map(registerFile);
    },

    readDataText: async payload=>{
      const file=fileStore.get(payload?.path);
      if(!file)throw new Error('当前会话中的源文件引用已失效，请重新选择该文件。');
      const decoded=file.native
        ? decodeBytes(base64Bytes(file.base64),payload?.encoding||'auto')
        : await decodeFile(file,payload?.encoding||'auto');
      return {path:payload.path,name:file.name,size:file.size,text:decoded.text,encoding:decoded.encoding};
    },

    openCsvFiles: async()=>{
      if(nativeBridge){
        const assets=await nativeCall('openFiles',{multiple:true,type:'*/*'});
        const out=[];
        for(const asset of assets||[]){
          fileStore.set(asset.path,{...asset,native:true});
          const decoded=decodeBytes(base64Bytes(asset.base64),'auto');
          out.push({path:asset.path,name:asset.name,size:asset.size,text:decoded.text});
        }
        return out;
      }
      const files=await chooseFiles({multiple:true,accept:'.csv,.txt,.dat,.tsv,.asc,.xy,.iv,text/*'});
      const out=[];
      for(const file of files){
        const meta=registerFile(file);
        const decoded=await decodeFile(file,'auto');
        out.push({...meta,text:decoded.text});
      }
      return out;
    },

    copyText,

    saveText: async payload=>{
      if(nativeBridge){
        return await nativeCall('saveText',{
          name:payload?.defaultName||'data.txt',
          content:String(payload?.content??''),
          mimeType:payload?.mimeType||'text/plain'
        });
      }
      downloadBlob(new Blob([String(payload?.content??'')],{type:'text/plain;charset=utf-8'}),payload?.defaultName||'data.txt');
      return true;
    },

    saveBase64: async payload=>{
      if(nativeBridge){
        return await nativeCall('saveBase64',{
          name:payload?.defaultName||'image.png',
          base64:String(payload?.base64||''),
          mimeType:payload?.mimeType||'image/png'
        });
      }
      const raw=String(payload?.base64||'').replace(/^data:[^;]+;base64,/,'');
      const bin=atob(raw);
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      downloadBlob(new Blob([bytes]),payload?.defaultName||'image.png');
      return payload?.defaultName||'image.png';
    },

    saveProject: async payload=>{
      const mode=payload?.mode==='saveAs'?'saveAs':'current';
      const path=String(payload?.path||'');
      const rawName=(path.split(/[\\/]/).pop()||payload?.defaultName||'dk_data_project.dkds.json');
      const name=decodeURIComponent(rawName.replace(/^(?:web|webfs|native):\/\//,''));
      const content=window.DKDSProjectFormat?.serializeProject
        ? window.DKDSProjectFormat.serializeProject(payload?.project||{})
        : JSON.stringify(payload?.project||{},null,2);
      if(nativeBridge){
        const uri=await nativeCall('saveText',{
          name,
          content,
          mimeType:'application/json'
        });
        return `native://${uri||name}`;
      }

      const currentHandle=mode==='current'?projectFileHandles.get(path):null;
      if(currentHandle){
        try{return await writeProjectHandle(currentHandle,content);}
        catch(err){console.warn('[DKDS web project overwrite]',err);}
      }

      if(canUseFileSystemAccess()){
        try{
          const handle=await window.showSaveFilePicker({
            suggestedName:name,
            types:[{description:'DK Data Studio Project',accept:{'application/json':['.json']}}]
          });
          return await writeProjectHandle(handle,content);
        }catch(err){
          if(err?.name==='AbortError')return null;
          console.warn('[DKDS web project save picker]',err);
        }
      }

      // Plain HTTP LAN pages cannot normally use File System Access API. In
      // that browser security model the closest safe equivalent is downloading
      // the same complete project JSON with the current file name.
      downloadBlob(new Blob([content],{type:'application/json;charset=utf-8'}),name);
      return `web://${name}`;
    },

    openProject: async()=>{
      if(nativeBridge){
        const assets=await nativeCall('openFiles',{multiple:false,type:['application/json','text/*']});
        const asset=assets?.[0];
        if(!asset)return null;
        const decoded=decodeBytes(base64Bytes(asset.base64),'auto');
        const project=window.DKDSProjectFormat?.parseProjectText?window.DKDSProjectFormat.parseProjectText(decoded.text):JSON.parse(decoded.text);
        return {path:asset.path,project};
      }
      if(canUseFileSystemAccess()){
        try{
          const [handle]=await window.showOpenFilePicker({
            multiple:false,
            types:[{description:'DK Data Studio Project',accept:{'application/json':['.json']}}]
          });
          if(!handle)return null;
          const file=await handle.getFile();
          const path=projectPathForHandle(handle);
          projectFileHandles.set(path,handle);
          const bytes=new Uint8Array(await file.arrayBuffer());
          const project=window.DKDSProjectFormat?.parseProjectBytes?window.DKDSProjectFormat.parseProjectBytes(bytes).project:JSON.parse(new TextDecoder().decode(bytes));
          return {path,project};
        }catch(err){
          if(err?.name==='AbortError')return null;
          console.warn('[DKDS web project open picker]',err);
        }
      }
      const files=await chooseFiles({multiple:false,accept:'.json,.dkds.json,application/json'});
      const file=files[0];
      if(!file)return null;
      const bytes=new Uint8Array(await file.arrayBuffer());
      const project=window.DKDSProjectFormat?.parseProjectBytes?window.DKDSProjectFormat.parseProjectBytes(bytes).project:JSON.parse(new TextDecoder().decode(bytes));
      return {path:`web://${file.name}`,project};
    },

    getRuntimeStatus: async()=>{
      const memory=performance?.memory||{};
      return {
        runtime:nativeBridge?'android':'web',
        platform:navigator.platform||'',
        isPackaged:false,
        processCount:1,
        memory:{
          workingSetBytes:Number(memory.usedJSHeapSize)||0,
          jsHeapUsedBytes:Number(memory.usedJSHeapSize)||0,
          jsHeapLimitBytes:Number(memory.jsHeapSizeLimit)||0
        }
      };
    },

    pluginExternalList: async()=>({packages:[],errors:[],unsupported:true}),
    pluginInstallPackage: async()=>{throw new Error('浏览器 / Android 模式暂不允许安装可执行插件包；请在桌面版安装，或使用内置插件与 Recipe。');},
    pluginRestorePackage: async()=>false,
    pluginUninstall: async()=>false,
    pluginOpenFolder: async()=>false,

    updateGetStatus: async()=>({
      phase:'disabled',message:nativeBridge?'Android React Native 壳层不执行桌面程序热更新。':'网页版由局域网桌面端提供，不执行桌面程序热更新。',
      currentVersion:document.querySelector('.version')?.textContent?.replace(/^v/,'')||'web',
      availableVersion:null,serverUrl:location.origin,canApply:false,isPackaged:false,isPortable:false,
      autoDiscover:false,autoDownload:false
    }),
    updateGetSettings: async()=>({serverUrl:'',autoDiscover:false,autoDownload:false,checkIntervalMinutes:30}),
    updateSetSettings: async()=>({serverUrl:'',autoDiscover:false,autoDownload:false,checkIntervalMinutes:30}),
    updateCheckNow: async()=>null,
    updateDownloadNow: async()=>false,
    updateInstallNow: async()=>false,
    onUpdateStatus: ()=>()=>{},

    lanWebGetStatus: async()=>({running:true,noKey:true,key:'',urls:[location.origin],pairedClients:1,webClient:true}),
    lanWebMakeQr: async()=>null,
    lanWebGetSettings: async()=>({enabled:true,noKey:true,port:Number(location.port)||80}),
    lanWebSetSettings: async()=>null,
    lanWebStart: async()=>null,
    lanWebStop: async()=>null,
    lanWebRegenerateKey: async()=>null,
    onLanWebStatus: ()=>()=>{}
  };
})();
