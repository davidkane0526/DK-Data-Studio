(() => {
  if (window.electronAPI) return;
  const StyleGate=globalThis.DKDSStyleGate;
  if(!StyleGate)throw new Error('DKDSStyleGate must initialize before web bridge.');
  const STYLE_SOURCE='src/web-bridge.js';
  const styleSet=(el,property,value,component='web-bridge')=>StyleGate.set(el,property,value,{owner:'host.web-bridge',component,scope:'runtime-web-bridge',source:STYLE_SOURCE});

  const fileStore = new Map();
  const dataReadSessions = new Map();
  const DATA_READ_CHUNK_MAX=512*1024;
  const projectFileHandles = new Map();
  const nativePending = new Map();
  const pluginInstallPending = new Map();
  const nativeBridge = window.ReactNativeWebView?.postMessage
    ? window.ReactNativeWebView
    : null;
  const NativeUserIntent=window.DKDSNativeUserIntent;
  const nativeUserIntent=nativeBridge&&NativeUserIntent?.createController
    ? NativeUserIntent.createController({report:meta=>console.warn('[DKDS native intent blocked]',meta)})
    : null;
  if(nativeUserIntent)NativeUserIntent.install(nativeUserIntent);
  const nativeIntentBridge=Object.freeze({
    capture:(kind,meta={})=>nativeUserIntent?.capture?.(kind,{source:String(meta?.source||'mobile-shell'),control:String(meta?.control||''),reason:String(meta?.reason||'native-shell-activation')})||null,
    clear:reason=>nativeUserIntent?.clear?.(String(reason||'mobile-shell')),
    snapshot:()=>nativeUserIntent?.snapshot?.()||null
  });
  if(nativeBridge)Object.defineProperty(window,'DKDSNativeIntentBridge',{value:nativeIntentBridge,writable:false,configurable:false});
  const nativePresentationRequested=new URLSearchParams(location.search).has('reactNative');
  const studioReadableMimeTypes=['text/csv','text/plain','text/tab-separated-values','application/json','application/octet-stream'];
  const declaredHost=String(document.documentElement.dataset.dkdsHost||window.__DKDS_HOST_KIND__||'').trim().toLowerCase();
  const mobileHost=declaredHost==='mobile';
  window.__DKDS_WEB_CLIENT__ = !nativeBridge;
  window.__DKDS_NATIVE_CLIENT__ = !!nativeBridge;
  document.documentElement.classList.add(nativeBridge?'native-client':'web-client');

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
    if(msg?.__dkdsNativeResponse){window.__DKDS_NATIVE_RESOLVE__(msg.id,msg.ok,msg.value);return;}
    if(msg?.__dkdsNativeEvent){window.dispatchEvent(new CustomEvent('dkds:native-event',{detail:msg}));}
  }
  window.addEventListener('message',receiveNativeMessage);
  document.addEventListener('message',receiveNativeMessage);

  if((nativeBridge||nativePresentationRequested)&&mobileHost){
    document.documentElement.classList.add('react-native-client');
  }
  if(nativeBridge){
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
      styleSet(input,'display','none','file-input');
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

  async function nativeFileBytes(file){
    const base64=file?.base64||await nativeCall('readFile',{token:file?.token});
    return base64Bytes(base64);
  }

  function mobilePluginDb(){
    if(!nativeBridge)return Promise.reject(new Error('Mobile plugin storage is only available in the Android host.'));
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('dkds-mobile-plugins-v1',1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains('packages'))db.createObjectStore('packages',{keyPath:'manifest.id'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Cannot open mobile plugin storage.'));
    });
  }

  async function mobilePluginStore(mode,operation){
    const db=await mobilePluginDb();
    try{
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction('packages',mode),store=tx.objectStore('packages');
        let request,result=true;
        try{request=operation(store);}catch(err){reject(err);return;}
        if(request&&typeof request.onsuccess!=='undefined'){
          request.onsuccess=()=>{result=request.result;};
          request.onerror=()=>reject(request.error||new Error('Mobile plugin storage request failed.'));
        }
        tx.oncomplete=()=>resolve(result);
        tx.onerror=()=>reject(tx.error||new Error('Mobile plugin storage transaction failed.'));
        tx.onabort=()=>reject(tx.error||new Error('Mobile plugin storage transaction was aborted.'));
      });
    }finally{db.close();}
  }

  const mobilePluginGet=id=>mobilePluginStore('readonly',store=>store.get(String(id||'')));
  const mobilePluginList=()=>mobilePluginStore('readonly',store=>store.getAll());
  const mobilePluginPut=pkg=>mobilePluginStore('readwrite',store=>store.put(pkg));
  const mobilePluginDelete=id=>mobilePluginStore('readwrite',store=>store.delete(String(id||'')));


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
    styleSet(a,'display','none','download-anchor');
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
      const intent=nativeUserIntent?.consume?.('clipboard',{source:'renderer.copyText'});
      if(!intent)return false;
      return await nativeCall('copyText',{text:String(text??''),nativeIntent:intent});
    }
    try{
      await navigator.clipboard.writeText(String(text??''));
      return true;
    }catch{
      const ta=document.createElement('textarea');
      ta.value=String(text??'');
      styleSet(ta,'position','fixed','clipboard-proxy');styleSet(ta,'opacity','0','clipboard-proxy');
      document.body.appendChild(ta);ta.select();
      const ok=document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  window.electronAPI = {
    isWebClient:!nativeBridge,
    isNativeClient:!!nativeBridge,

    openDataFiles: async()=>{
      if(nativeBridge){
        const assets=await nativeCall('openFiles',{multiple:true,type:studioReadableMimeTypes});
        for(const asset of assets||[])fileStore.set(asset.path,{...asset,native:true});
        return (assets||[]).map(({path,name,size})=>({path,name,size}));
      }
      const files=await chooseFiles({multiple:true,accept:'.json,.csv,.txt,.dat,.tsv,.asc,.xy,.iv,.prn,.out,.log,application/json,text/*'});
      return files.map(registerFile);
    },

    openDataDirectory: async()=>{
      if(nativeBridge)return nativeCall('openDirectory',{});
      return null;
    },
    listDataDirectory: async payload=>{
      if(nativeBridge)return nativeCall('listDirectory',payload||{});
      return {entries:[]};
    },
    registerDataDocument: async payload=>{
      if(!nativeBridge)throw new Error('Directory document registration is unavailable in plain web mode.');
      const asset=await nativeCall('registerDocumentUri',payload||{});if(!asset?.path)throw new Error('Android document registration did not return a file token.');
      fileStore.set(asset.path,{...asset,native:true});return {path:asset.path,name:asset.name,size:Number(asset.size)||0,mimeType:String(asset.mimeType||'')};
    },
    smbDiscover: async()=>nativeBridge?nativeCall('smbDiscover',{}):[],
    smbListShares: async connection=>nativeBridge?nativeCall('smbListShares',{connection:connection||{}}):[],
    smbList: async payload=>nativeBridge?nativeCall('smbList',payload||{}):[],
    smbRead: async payload=>nativeBridge?nativeCall('smbRead',payload||{}):[],
    agentGetSecret: async key=>nativeBridge?nativeCall('agentGetSecret',{key:String(key||'default')}):'',
    agentSetSecret: async payload=>nativeBridge?nativeCall('agentSetSecret',payload||{}):false,
    agentHttpJson: async payload=>nativeBridge?nativeCall('agentHttpJson',payload||{}):(()=>{throw new Error('AI Host transport is unavailable in plain web mode.');})(),
    mcpGetStatus: async()=>nativeBridge?nativeCall('mcpStatus',{}):({running:false}),
    mcpStart: async payload=>nativeBridge?nativeCall('mcpStart',payload||{}):({running:false}),
    mcpStop: async()=>nativeBridge?nativeCall('mcpStop',{}):({running:false}),
    mcpRespond: payload=>nativeBridge?nativeCall('mcpRespond',payload||{}):false,
    onMcpRequest: callback=>{
      const handler=event=>{const detail=event?.detail||{};if(detail.event==='mcpRequest')callback(detail.payload||{});};
      window.addEventListener('dkds:native-event',handler);return()=>window.removeEventListener('dkds:native-event',handler);
    },

    openDataRead: async payload=>{
      const path=String(payload?.path||''),file=fileStore.get(path);if(!file)throw new Error('当前会话中的源文件引用已失效，请重新选择该文件。');
      const token=`read-${uuid()}`;let nativeRead=null,size=Number(file.size)||0,maxChunkBytes=DATA_READ_CHUNK_MAX;
      if(file.native){nativeRead=await nativeCall('openFileRead',{token:file.token});size=Number(nativeRead?.size??size)||size;maxChunkBytes=Math.min(DATA_READ_CHUNK_MAX,Number(nativeRead?.maxChunkBytes)||DATA_READ_CHUNK_MAX);}
      dataReadSessions.set(token,{path,file,nativeReadToken:String(nativeRead?.token||''),size,maxChunkBytes});
      return {token,name:file.name||'',size,maxChunkBytes};
    },
    readDataChunk: async payload=>{
      const session=dataReadSessions.get(String(payload?.token||''));if(!session)throw new Error('Data read token is invalid or expired.');const offset=Math.max(0,Math.floor(Number(payload?.offset)||0)),requested=Math.floor(Number(payload?.length)||0),maxChunkBytes=Math.max(1,Number(session.maxChunkBytes)||DATA_READ_CHUNK_MAX);if(!(requested>0&&requested<=maxChunkBytes))throw new Error(`Chunk length must be 1..${maxChunkBytes} bytes.`);const file=session.file,size=Math.max(0,Number(session.size)||Number(file.size)||0),knownSize=size>0;if(knownSize&&offset>=size)return {token:payload.token,offset,nextOffset:offset,size,bytesRead:0,eof:true,base64:''};if(file.native){if(!session.nativeReadToken)throw new Error('Native data-read session is unavailable.');const length=knownSize?Math.min(requested,size-offset):requested,result=await nativeCall('readFileReadChunk',{token:session.nativeReadToken,offset,length}),resolvedSize=Math.max(0,Number(result?.size)||size);if(resolvedSize>0){session.size=resolvedSize;file.size=resolvedSize;}return {token:payload.token,offset,nextOffset:Number(result?.nextOffset??(offset+Number(result?.bytesRead||0))),size:resolvedSize,bytesRead:Number(result?.bytesRead||0),eof:!!result?.eof,base64:String(result?.base64||'')};}const bytes=new Uint8Array(await file.slice(offset,Math.min(size,offset+requested)).arrayBuffer()),nextOffset=offset+bytes.length;let binary='';const step=0x8000;for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,i+step));return {token:payload.token,offset,nextOffset,size,bytesRead:bytes.length,eof:nextOffset>=size,base64:btoa(binary)};
    },
    closeDataRead: async payload=>{const token=String(payload?.token||''),session=dataReadSessions.get(token);if(!session)return false;dataReadSessions.delete(token);if(session.nativeReadToken){try{await nativeCall('closeFileRead',{token:session.nativeReadToken});}catch{}}return true;},

    readDataText: async payload=>{
      const file=fileStore.get(payload?.path);
      if(!file)throw new Error('当前会话中的源文件引用已失效，请重新选择该文件。');
      const decoded=file.native
        ? decodeBytes(await nativeFileBytes(file),payload?.encoding||'auto')
        : await decodeFile(file,payload?.encoding||'auto');
      return {path:payload.path,name:file.name,size:file.size,text:decoded.text,encoding:decoded.encoding};
    },

    openCsvFiles: async()=>{
      if(nativeBridge){
        const assets=await nativeCall('openFiles',{multiple:true,type:studioReadableMimeTypes});
        const out=[];
        for(const asset of assets||[]){
          fileStore.set(asset.path,{...asset,native:true});
          const decoded=decodeBytes(await nativeFileBytes(asset),'auto');
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
        const intent=nativeUserIntent?.consume?.('export',{source:payload?.source||'renderer.saveText'});
        if(!intent)return false;
        return await nativeCall('saveText',{
          name:payload?.defaultName||'data.txt',
          content:String(payload?.content??''),
          mimeType:payload?.mimeType||'text/plain',
          source:String(payload?.source||'renderer.saveText'),
          nativeIntent:intent
        });
      }
      downloadBlob(new Blob([String(payload?.content??'')],{type:'text/plain;charset=utf-8'}),payload?.defaultName||'data.txt');
      return true;
    },

    saveBase64: async payload=>{
      if(nativeBridge){
        const intent=nativeUserIntent?.consume?.('export',{source:payload?.source||'renderer.saveBase64'});
        if(!intent)return false;
        return await nativeCall('saveBase64',{
          name:payload?.defaultName||'image.png',
          base64:String(payload?.base64||''),
          mimeType:payload?.mimeType||'image/png',
          source:String(payload?.source||'renderer.saveBase64'),
          nativeIntent:intent
        });
      }
      const raw=String(payload?.base64||'').replace(/^data:[^;]+;base64,/,'');
      const bin=atob(raw);
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      downloadBlob(new Blob([bytes]),payload?.defaultName||'image.png');
      return payload?.defaultName||'image.png';
    },

    exportSdkBundle: async()=>{
      const reference=await window.DKDSOptionalRuntime?.ensureSdkAuthoringReference?.();
      const sdkVersion=String(reference?.describe?.().sdkVersion||'current');
      const response=await fetch(new URL('generated/dkds-sdk-export.zip',window.location.href),{cache:'no-store'});
      if(!response.ok)throw new Error(`SDK 导出资源读取失败（HTTP ${response.status}）。`);
      const blob=await response.blob();
      const name=`DKDS-SDK-${sdkVersion.replace(/[^0-9A-Za-z._-]/g,'_')}.zip`;
      if(nativeBridge){
        const intent=nativeUserIntent?.consume?.('export',{source:'core.plugin-manager.export-sdk'});
        if(!intent)return null;
        const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';const step=0x8000;
        for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,i+step));
        const uri=await nativeCall('saveBase64',{name,base64:btoa(binary),mimeType:'application/zip',source:'core.plugin-manager.export-sdk',nativeIntent:intent});
        return uri?{name,sdkVersion,uri}:null;
      }
      downloadBlob(blob,name);
      return {name,sdkVersion};
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
        const existingUri=mode==='current'&&path.startsWith('native-document://')
          ? decodeURIComponent(path.slice('native-document://'.length))
          : '';
        const intent=existingUri
          ? Object.freeze({authorized:true,kind:'project-direct',directWrite:true,requestSource:String(payload?.source||'core.project.current')})
          : nativeUserIntent?.consume?.('project',{source:payload?.source||`core.project.${mode}`});
        if(!intent)return null;
        const uri=await nativeCall('saveText',{
          name,
          content,
          mimeType:'application/json',
          uri:existingUri,
          source:String(payload?.source||`core.project.${mode}`),
          nativeIntent:intent
        });
        return uri?`native-document://${encodeURIComponent(uri)}`:null;
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
        const assets=await nativeCall('openFiles',{multiple:false,type:['application/json','text/plain','application/octet-stream']});
        const asset=assets?.[0];
        if(!asset)return null;
        const decoded=decodeBytes(await nativeFileBytes(asset),'auto');
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
      if(nativeBridge){
        try{
          const native=await nativeCall('runtimeStatus');
          if(native?.memory?.workingSetBytes>0)return native;
        }catch{}
      }
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
        },
        components:[{
          id:'web:renderer',type:'renderer',pid:0,label:nativeBridge?'Android WebView JS Heap':'网页 JS Heap',
          pluginId:'',activityId:'',workingSetBytes:Number(memory.usedJSHeapSize)||0,
          peakWorkingSetBytes:Number(memory.totalJSHeapSize)||0,privateBytes:Number(memory.usedJSHeapSize)||0
        }]
      };
    },

    pluginExternalList: async()=>{
      if(!nativeBridge)return {packages:[],errors:[],unsupported:true};
      try{return {packages:await mobilePluginList(),errors:[],unsupported:false};}
      catch(err){return {packages:[],errors:[{file:'Android plugin store',error:err.message}],unsupported:false};}
    },
    pluginSelectPackage: async()=>{
      if(!nativeBridge)return {canceled:true};
      try{
        const assets=await nativeCall('openFiles',{multiple:false,type:['application/json','text/plain','application/octet-stream']});
        const asset=assets?.[0];if(!asset)return {canceled:true};
        const decoded=decodeBytes(await nativeFileBytes(asset),'utf-8');
        const pkg=window.DKDSMobilePluginPackage?.normalize(decoded.text);
        if(!pkg)throw new Error('Mobile plugin package validator is unavailable.');
        const previous=await mobilePluginGet(pkg.manifest.id),token=`plugin-${uuid()}`;
        pluginInstallPending.set(token,{pkg,previous});
        return {ok:true,token,manifest:pkg.manifest,exists:!!previous,previousVersion:previous?.manifest?.version||null};
      }catch(err){return {ok:false,error:{title:'移动端插件包校验失败',message:err.message,code:'mobile-package-invalid'}};}
    },
    pluginCancelInstall: async token=>pluginInstallPending.delete(String(token||'')),
    pluginInstallPackage: async token=>{
      const pending=pluginInstallPending.get(String(token||''));
      if(!pending)return {ok:false,error:{message:'插件安装确认已过期，请重新选择插件包。',code:'mobile-install-token-expired'}};
      pluginInstallPending.delete(String(token||''));
      const installed={...pending.pkg,installedAt:new Date().toISOString()};
      await mobilePluginPut(installed);
      return {ok:true,package:{...installed,previousPackage:pending.previous||null}};
    },
    pluginValidateGeneratedPackage: async raw=>{
      try{
        const pkg=window.DKDSMobilePluginPackage?.normalize(raw);
        if(!pkg)throw new Error('Mobile plugin package validator is unavailable.');
        return {ok:true,package:pkg,manifest:pkg.manifest};
      }catch(err){return {ok:false,error:{title:'生成插件包无效',message:String(err?.message||err),code:'mobile-generated-package-invalid'}};}
    },
    pluginInstallGeneratedPackage: async payload=>{
      if(!nativeBridge)return {ok:false,error:{message:'当前运行环境不支持安装生成插件。'}};
      try{
        const raw=payload?.package||payload;
        const pkg=window.DKDSMobilePluginPackage?.normalize(raw);
        if(!pkg)throw new Error('Mobile plugin package validator is unavailable.');
        const previous=await mobilePluginGet(pkg.manifest.id);
        const installed={...pkg,installedAt:new Date().toISOString(),generatedBy:String(payload?.source||'studio-kernel')};
        await mobilePluginPut(installed);
        return {ok:true,package:{...installed,previousPackage:previous||null}};
      }catch(err){return {ok:false,error:{title:'生成插件安装失败',message:String(err?.message||err),code:'mobile-generated-install-failed'}};}
    },
    pluginRestorePackage: async payload=>{
      if(!nativeBridge)return false;
      const id=String(payload?.id||payload?.package?.manifest?.id||'');
      if(payload?.package)await mobilePluginPut(payload.package);else if(id)await mobilePluginDelete(id);
      return true;
    },
    pluginUninstall: async payload=>{
      if(!nativeBridge)return false;
      await mobilePluginDelete(typeof payload==='string'?payload:payload?.id);
      return true;
    },
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

    lanWebGetStatus: async()=>{
      if(!nativeBridge)return {running:true,noKey:true,key:'',urls:[location.origin],pairedClients:1,webClient:true,nativeClient:false};
      const state=await nativeCall('webStatus')||{};
      const urls=Array.isArray(state.urls)?state.urls.map(String).filter(Boolean):[];
      const url=String(state.url||urls[0]||'');if(url&&!urls.includes(url))urls.unshift(url);
      return {...state,running:!!state.running,enabled:state.enabled!==false,noKey:!!state.noKey,key:String(state.key||''),port:Number(state.port)||45910,url,urls,localhostUrl:String(state.localhostUrl||url),browserUrl:String(state.browserUrl||url),pairedClients:Number(state.pairedClients)||0,webClient:false,nativeClient:true,localOnly:false};
    },
    lanWebMakeQr: async()=>null,
    lanWebGetSettings: async()=>{
      if(!nativeBridge)return {enabled:true,noKey:true,port:Number(location.port)||80};
      const state=await window.electronAPI.lanWebGetStatus();
      return {enabled:state.enabled!==false,noKey:!!state.noKey,port:Number(state.port)||45910,localOnly:false};
    },
    lanWebSetSettings: async settings=>{
      if(!nativeBridge)return null;
      await nativeCall('webApplySettings',{enabled:settings?.enabled!==false,noKey:!!settings?.noKey,port:Number(settings?.port)||45910});
      return window.electronAPI.lanWebGetStatus();
    },
    lanWebStart: async()=>nativeBridge?(await nativeCall('webStart'),window.electronAPI.lanWebGetStatus()):null,
    lanWebStop: async()=>nativeBridge?(await nativeCall('webStop'),window.electronAPI.lanWebGetStatus()):null,
    lanWebOpen: async()=>nativeBridge?nativeCall('webOpen'):false,
    lanWebRegenerateKey: async()=>nativeBridge?(await nativeCall('webRegenerateKey'),window.electronAPI.lanWebGetStatus()):null,
    onLanWebStatus: ()=>()=>{}
  };
})();
