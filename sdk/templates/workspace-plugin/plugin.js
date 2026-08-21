(() => {
  const requiresCore=['status','state','project','data.types','ui.dom','ui.components','ui.workspace','ui.actions','ui.pages'];
  DKDSPlugins.define({
    id:'com.example.workspace',pluginType:'workbench',name:'SDK Workspace Example',version:'1.0.0',apiVersion:'1.10.0',entry:'plugin.js',scripts:['plugin.js'],enabled:true,order:900,
    description:'Standalone SDK example using Core workbench/state/data-type APIs.',requiresCore,
    capabilities:['ui.page','ui.analysis-workbench','state.store','data.types'],
    compatibility:{app:'>=3.60.0 <4.0.0',pluginApi:'^1.10.0'}
  }, async ctx => {
    const state=ctx.state.create({runs:0},{projectSlice:'settings'});
    ctx.data.types.register('example.workspace.result',{title:'SDK example result',parents:['result.analysis'],kind:'result',key:v=>v?.id});
    const page=ctx.ui.pages.add({
      id:'sdk-workspace',label:'SDK 示例',title:'SDK Workspace Example',order:900,
      html:'<div class="analysis-page-header"><div><h2>SDK Workspace Example</h2></div></div><div class="analysis-page-body"><div class="sdk-example-root"></div></div>'
    });
    const root=ctx.ui.dom.query('.sdk-example-root',page);
    const wb=ctx.ui.analysisWorkbench.create(root,{header:false,activity:'sdk-example'});
    wb.mountPrimary({id:'main',label:'主界面',mount:({main})=>ctx.ui.components.mount(main,{type:'stack',children:[{type:'text',text:'This plugin was built without application source code.'}]})});
    const actions=ctx.ui.dom.create('div',{className:'dkds-plugin-header-actions'});
    ctx.ui.dom.append(ctx.ui.dom.query('.analysis-page-header',page),actions);
    ctx.ui.actions.mount(actions,{actions:[{id:'run',label:'运行',onInvoke:()=>{state.patch({runs:state.get().runs+1});ctx.status.set(`SDK example run ${state.get().runs}`);}}]});
    return {deactivate(){wb.dispose?.();}};
  });
})();
