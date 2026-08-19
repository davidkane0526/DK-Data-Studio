(() => {
  DKDSPlugins.define({
    id:'example.plugin',name:'Example Plugin',version:'0.3.0',apiVersion:'1.7.0',order:900,
    capabilities:['ui.page','ui.analysis-workbench','ui.primary','ui.prime','runtime.capabilities','ui.dynamic-actions','ui.shortcuts','ui.interaction','data.types','state.store','workflow.processor']
  }, async ctx => {
    const store=ctx.state.create({schema:1,lastRun:null},{projectSlice:'settings'});

    // Domain data/result types belong to plugins. Keep selections compact: the
    // canonical data can be arbitrarily large and remains in the artifact or
    // project store while the interaction document carries an id/ref/preview.
    ctx.data.types.register('example.result',{
      title:'Example derived result',parents:['result.analysis','data.point'],kind:'result',
      key:value=>value?.id,
      selection:value=>({id:value?.id,ref:{resultId:value?.id},value:{id:value?.id,label:value?.label,x:value?.x,y:value?.y}})
    });
    const interaction=ctx.ui.interaction.create('example',{selection:{multiple:true,defaultType:'example.result'}});
    interaction.bind('details',{types:['result.analysis'],onSelection:snapshot=>{
      const focus=snapshot.focus;if(focus)ctx.host.setStatus(`Selected ${ctx.data.types.describe(focus.type,focus.value)}`);
    }});

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

    // Capabilities are usable from dedicated TOP windows without loading this
    // plugin's renderer a second time.
    ctx.capabilities.register('example.summary',{
      kind:'example.service',title:'Example Summary',methods:{summary:()=>({lastRun:store.get().lastRun})}
    });

    const page=ctx.ui.pages.add({
      id:'example-page',label:'示例插件',title:'Example plugin page',order:900,
      html:`<div class="analysis-page-header"><div><h2>示例插件</h2><div class="analysis-subtitle">插件提供领域内容；Core 管理 PRIMARY / PRIME / SUB、Dock、快捷键与状态。</div></div></div><div class="analysis-page-body"><div id="exampleWorkbench" style="width:100%;height:100%"></div></div>`
    });
    const wb=(ctx.ui.pluginWorkspace||ctx.ui.analysisWorkbench).create(page.querySelector('#exampleWorkbench'),{header:false,activity:'example'});
    wb.mountPrimary({id:'main',label:'主界面',mainHtml:'<section class="analysis-chart-card"><div class="analysis-chart-title">PRIMARY</div><div style="padding:20px">Plugin content</div></section>'});
    wb.registerPrime({id:'details',label:'详情',title:'示例 PRIME',defaultPlacement:'right',placements:['inline','right','bottom','float'],mount:({container})=>{container.innerHTML='<div style="padding:12px">PRIME content</div>';}});
    const actions=document.createElement('div');actions.className='dkds-plugin-header-actions';page.querySelector('.analysis-page-header')?.appendChild(actions);
    ctx.ui.actions.mount(actions,{actions:[{id:'run',label:'运行',shortcut:'Ctrl+Enter',onInvoke:()=>{store.patch({lastRun:Date.now()});ctx.host.setStatus('Example command executed.');}},{id:'details',label:'详情',onInvoke:()=>wb.togglePrime('details')}]});
    return {deactivate(){wb.dispose?.();}};
  });
})();
