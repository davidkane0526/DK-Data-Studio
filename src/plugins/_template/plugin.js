(() => {
  const requiresCore=['status','capabilities','state','data.types','data.model','data.formula','workflow','ui.dom','ui.components','ui.workspace','ui.actions','ui.interaction','ui.pages'];
  DKDSPlugins.define({
    id:'example.plugin',pluginType:'developer',name:'Example Plugin',version:'0.4.0',apiVersion:'1.10.0',requiresCore,order:900,
    capabilities:['ui.page','ui.analysis-workbench','ui.primary','ui.prime','runtime.capabilities','ui.dynamic-actions','ui.interaction','data.types','state.store','workflow.processor']
  }, async ctx => {
    const dom=ctx.ui.dom;
    const store=ctx.state.create({schema:1,lastRun:null},{projectSlice:'settings'});

    ctx.data.types.register('example.result',{
      title:'Example derived result',parents:['result.analysis','data.point'],kind:'result',
      key:value=>value?.id,
      selection:value=>({id:value?.id,ref:{resultId:value?.id},value:{id:value?.id,label:value?.label,x:value?.x,y:value?.y}})
    });
    const interaction=ctx.ui.interaction.create('example',{selection:{multiple:true,defaultType:'example.result'}});
    interaction.bind('details',{types:['result.analysis'],onSelection:snapshot=>{
      const focus=snapshot.focus;if(focus)ctx.status.set(`Selected ${ctx.data.types.describe(focus.type,focus.value)}`);
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
    ctx.capabilities.register('example.summary',{kind:'example.service',title:'Example Summary',methods:{summary:()=>({lastRun:store.get().lastRun})}});

    const page=ctx.ui.pages.add({
      id:'example-page',label:'示例插件',title:'Example plugin page',order:900,
      html:'<div class="analysis-page-header"><div><h2>示例插件</h2><div class="analysis-subtitle">领域逻辑由插件声明，布局、交互、组件与生命周期由 Core 管理。</div></div></div><div class="analysis-page-body"><div class="example-workbench-root"></div></div>'
    });
    const root=dom.query('.example-workbench-root',page);
    const wb=ctx.ui.analysisWorkbench.create(root,{header:false,activity:'example'});
    wb.mountPrimary({id:'main',label:'主界面',mount:({main})=>ctx.ui.components.mount(main,{type:'stack',children:[{type:'text',text:'PRIMARY · Plugin domain content'}]})});
    wb.registerPrime({id:'details',label:'详情',title:'示例 PRIME',defaultPlacement:'right',placements:['inline','right','bottom','float'],mount:({container})=>ctx.ui.components.mount(container,{type:'stack',children:[{type:'text',text:'PRIME · Domain details'}]})});
    const actions=dom.create('div',{className:'dkds-plugin-header-actions'});
    dom.append(dom.query('.analysis-page-header',page),actions);
    ctx.ui.actions.mount(actions,{actions:[
      {id:'run',label:'运行',shortcut:'Ctrl+Enter',onInvoke:()=>{store.patch({lastRun:Date.now()});ctx.status.set('Example command executed.');}},
      {id:'details',label:'详情',onInvoke:()=>wb.togglePrime('details')}
    ]});
    return {deactivate(){wb.dispose?.();}};
  });
})();
