(() => {
  GRSPlugins.define({
    id:'example.plugin',
    name:'Example Plugin',
    version:'0.1.0',
    apiVersion:'1.1.0',
    order:900,
    capabilities:['ui.page','workflow.processor']
  }, async ctx => {
    ctx.workflow.processors.register('example.scale-column',{
      name:'Example: scale column',
      inputKinds:['data.table'],
      outputKinds:['data.table'],
      parameterSchema:{fields:[
        {id:'column',type:'column',label:'Column',required:true},
        {id:'factor',type:'number',label:'Factor',default:1,required:true},
        {id:'name',type:'text',label:'Output column',default:'Scaled',required:true}
      ]},
      run({inputs,parameters}){
        const table=inputs.input||inputs.table;
        const source=ctx.data.model.column(table,parameters.column);
        if(!source)throw new Error('Column not found.');
        return ctx.data.formula.deriveColumn(table,{
          name:parameters.name,
          formula:`[${source.name}] * ${Number(parameters.factor)}`,
          unit:source.unit,
          providerId:'example.scale-column',
          pluginId:ctx.manifest.id,
          version:ctx.manifest.version
        }).table;
      }
    });

    ctx.ui.pages.add({
      id:'example-page',
      label:'示例插件',
      title:'Example plugin page',
      order:900,
      html:`
        <div class="analysis-page-header">
          <div><h2>示例插件</h2><div class="analysis-subtitle">新插件优先注册 Processor / Analyzer / Chart / Recipe，而不是修改 app.js。</div></div>
          <button class="analysis-page-close">返回主图</button>
        </div>
        <div class="analysis-page-body">
          <div class="analysis-control-card">See docs/PLUGIN_API.md and docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md.</div>
        </div>`
    });

    ctx.project.registerSlice('settings',{
      serialize:()=>({schema:1,example:true}),
      restore:data=>console.debug('[example.plugin] restore',data),
      reset:()=>{}
    });

    return {deactivate(){}};
  });
})();
