(() => {
  if (window.electronAPI) return;

  window.__GRS_WEB_CLIENT__ = true;
  document.documentElement.classList.add('web-client');

  const fileStore = new Map();

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

  async function decodeFile(file,encoding='auto') {
    const buf=await file.arrayBuffer();
    const bytes=new Uint8Array(buf);
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

  async function copyText(text) {
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
      const files=await chooseFiles({multiple:true,accept:'.csv,.txt,.dat,.tsv,.asc,.xy,.iv,.prn,.out,.log,text/*'});
      return files.map(registerFile);
    },

    readDataText: async payload=>{
      const file=fileStore.get(payload?.path);
      if(!file)throw new Error('浏览器中的源文件引用已失效，请重新选择该文件。');
      const decoded=await decodeFile(file,payload?.encoding||'auto');
      return {path:payload.path,name:file.name,size:file.size,text:decoded.text,encoding:decoded.encoding};
    },

    openCsvFiles: async()=>{
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
      downloadBlob(new Blob([String(payload?.content??'')],{type:'text/plain;charset=utf-8'}),payload?.defaultName||'data.txt');
      return true;
    },

    saveBase64: async payload=>{
      const raw=String(payload?.base64||'').replace(/^data:[^;]+;base64,/,'');
      const bin=atob(raw);
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      downloadBlob(new Blob([bytes]),payload?.defaultName||'image.png');
      return payload?.defaultName||'image.png';
    },

    saveProject: async payload=>{
      const name=(String(payload?.path||'').split(/[\\/]/).pop()||payload?.defaultName||'graphene_resonance_project.grs.json')
        .replace(/^web:\/\//,'');
      downloadBlob(new Blob([JSON.stringify(payload?.project||{},null,2)],{type:'application/json;charset=utf-8'}),name);
      return `web://${name}`;
    },

    openProject: async()=>{
      const files=await chooseFiles({multiple:false,accept:'.json,.grs.json,application/json'});
      const file=files[0];
      if(!file)return null;
      const text=await file.text();
      return {path:`web://${file.name}`,project:JSON.parse(text)};
    },

    updateGetStatus: async()=>({
      phase:'disabled',message:'网页版由局域网桌面端提供，不执行桌面程序热更新。',
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
