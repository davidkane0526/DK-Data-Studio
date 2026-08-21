(() => {
  const requiresCore=['status','state','project','data.types','data.sources','data.import-workbench','ui.scientific-plot','ui.dom','ui.components','ui.workspace','ui.actions','ui.interaction-behavior','ui.pages'];
  DKDSPlugins.define({
    id:'com.example.workspace',pluginType:'workbench',name:'SDK Workspace Example',version:'1.0.0',apiVersion:'1.13.0',entry:'plugin.js',scripts:['plugin.js'],enabled:true,order:900,
    description:'Standalone SDK workbench example using scoped data, Core scientific plotting, Command and Interaction Behavior APIs.',requiresCore,
    capabilities:['ui.page','ui.analysis-workbench','ui.interaction-behavior','ui.scientific-plot','state.store','data.types','data.sources','data.import-workbench'],
    data:{accepts:['science.transport.iv']},
    compatibility:{app:'>=3.61.6 <4.0.0',pluginApi:'^1.13.0'}
  }, async ctx => {
    const state=ctx.state.create({runs:0},{projectSlice:'settings'});
    const run=()=>{state.patch({runs:state.get().runs+1});ctx.status.set(`SDK example run ${state.get().runs}`);return true;};
    ctx.commands.register('com.example.workspace.run',run);
    ctx.ui.interactionBehaviors.create('workspace-example-keys',{activity:'sdk-example',bindings:[{gesture:'key',target:'keyboard',chord:'Ctrl+Enter',command:'com.example.workspace.run'}]});
    ctx.data.types.register('example.workspace.result',{title:'SDK example result',parents:['result.analysis'],kind:'result',key:v=>v?.id});
    const page=ctx.ui.pages.add({
      id:'sdk-workspace',label:'SDK 示例',title:'SDK Workspace Example',order:900,
      html:'<div class="analysis-page-header"><div><h2>SDK Workspace Example</h2></div></div><div class="analysis-page-body"><div class="sdk-example-root"></div></div>'
    });
    const root=ctx.ui.dom.query('.sdk-example-root',page);
    const wb=ctx.ui.analysisWorkbench.create(root,{header:false,activity:'sdk-example'});
    wb.mountPrimary({id:'main',label:'主界面',mount:({main})=>{const wrap=ctx.ui.dom.create('div',{className:'sdk-example-main'}),summary=ctx.ui.dom.create('div',{className:'sdk-example-summary'}),plot=ctx.ui.dom.create('div',{className:'sdk-example-plot'});ctx.ui.dom.append(wrap,summary,plot);ctx.ui.dom.append(main,wrap);const sources=ctx.data.sources.list();summary.textContent=`当前工作台可见数据：${sources.length} 组`;const surface=ctx.ui.scientificPlot.create(plot,{xTitle:'X',yTitle:'Y',getCurves:()=>[],getMarkers:()=>[]});surface.requestRender('sdk-example');return()=>surface.dispose?.();}});
    const actions=ctx.ui.dom.create('div',{className:'dkds-plugin-header-actions'});
    ctx.ui.dom.append(ctx.ui.dom.query('.analysis-page-header',page),actions);
    ctx.ui.actions.mount(actions,{actions:[{id:'import',label:'导入数据',onInvoke:()=>ctx.data.importWorkbench.open()},{id:'run',label:'运行',onInvoke:()=>ctx.commands.run('com.example.workspace.run')} ]});
    return {deactivate(){wb.dispose?.();}};
  });
})();
