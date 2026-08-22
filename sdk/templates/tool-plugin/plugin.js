(() => {
  const requiresCore=['io','ui.menus'];
  DKDSPlugins.define({id:'com.example.tool',pluginType:'tool',name:'SDK Tool Example',version:'1.0.0',apiVersion:'1.15.0',entry:'plugin.js',scripts:['plugin.js'],enabled:true,order:500,description:'Standalone SDK example for a lightweight Core Tools-menu utility.',requiresCore,capabilities:['ui.tool-menu'],compatibility:{app:'>=3.61.11 <4.0.0',pluginApi:'^1.15.0'}}, async ctx => {
    ctx.commands.register('com.example.tool.copy-timestamp',()=>ctx.io.clipboard.writeText(new Date().toISOString()));
    ctx.ui.menus.add({id:'copy-timestamp',label:'复制当前时间戳',order:20,command:'com.example.tool.copy-timestamp'});
    return {};
  });
})();
