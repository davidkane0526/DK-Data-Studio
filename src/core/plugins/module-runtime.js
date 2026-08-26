(() => {
  if(window.DKDSPluginModules)return;
  const VERSION='1.0.0';
  const plugins=new Map();
  const norm=(value,label)=>{const text=String(value||'').trim();if(!text)throw new Error(`${label} is required.`);return text;};
  function bucket(pluginId){const id=norm(pluginId,'plugin id');if(!plugins.has(id))plugins.set(id,new Map());return plugins.get(id);}
  function define(pluginId,name,value,{replace=false}={}){
    const id=norm(pluginId,'plugin id'),key=norm(name,'module name'),rows=bucket(id);
    if(rows.has(key)&&!replace)throw new Error(`Plugin module already defined: ${id}/${key}`);
    rows.set(key,value);return value;
  }
  function get(pluginId,name){return plugins.get(String(pluginId||''))?.get(String(name||''))??null;}
  function requireModule(pluginId,name){const value=get(pluginId,name);if(value==null)throw new Error(`Plugin module unavailable: ${pluginId}/${name}`);return value;}
  function list(pluginId){const rows=plugins.get(String(pluginId||''));return rows?[...rows.keys()]:[];}
  function createScope(pluginId){const id=norm(pluginId,'plugin id');return Object.freeze({version:VERSION,pluginId:id,get:name=>get(id,name),require:name=>requireModule(id,name),list:()=>list(id)});}
  window.DKDSPluginModules=Object.freeze({VERSION,define,get,require:requireModule,list,createScope});
})();
