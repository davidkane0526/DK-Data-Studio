(() => {
  DKDSPlugins.define({
    id:'example.plugin',name:'Example Plugin',version:'0.2.0',apiVersion:'1.4.0',order:900,
    capabilities:['ui.page','ui.infrastructure','ui.portable','ui.dynamic-actions','ui.shortcuts','state.store','workflow.processor']
  }, async ctx => {
    const store=ctx.state.create({schema:1,lastRun:null},{projectSlice:'settings'});

    ctx.workflow.processors.register('example.scale-column',{
      name:'Example: scale column',inputKinds:['data.table'],outputKinds:['data.table'],
      parameterSchema:{fields:[
        {id:'column',type:'column',label:'Column',required:true},
        {id:'factor',type:'number',label:'Factor',default:1,required:true},
        {id:'name',type:'text',label:'Output column',default:'Scaled',required:true}
      ]},
      run({inputs,parameters}){
        const table=inputs.input||inputs.table;const source=ctx.data.model.column(table,parameters.column);
        if(!source)throw new Error('Column not found.');
        return ctx.data.formula.deriveColumn(table,{name:parameters.name,formula:`[${source.name}] * ${Number(parameters.factor)}`,unit:source.unit,providerId:'example.scale-column',pluginId:ctx.manifest.id,version:ctx.manifest.version}).table;
      }
    });

    const page=ctx.ui.pages.add({
      id:'example-page',label:'示例插件',title:'Example plugin page',order:900,
      html:`<div class="analysis-page-header"><div><h2>示例插件</h2><div class="analysis-subtitle">插件负责领域功能，布局、状态、快捷键和可移动视图由 core 提供。</div></div><div id="exampleActions"></div></div><div class="analysis-page-body"><section id="exampleCard" class="analysis-chart-card"><div class="analysis-chart-title">示例可移动视图</div><div style="padding:20px">Plugin content</div></section></div>`
    });
    const card=page.querySelector('#exampleCard');
    ctx.ui.portable.create('example-card',card,{useTargetAsWrapper:true,handle:'.analysis-chart-title',placements:['home','right','bottom','float']});
    ctx.ui.actions.mount(page.querySelector('#exampleActions'),{actions:[{id:'run',label:'运行',shortcut:'Ctrl+Enter',onInvoke:()=>{store.patch({lastRun:Date.now()});ctx.host.setStatus('Example command executed.');}}]});
    return {deactivate(){}};
  });
})();
