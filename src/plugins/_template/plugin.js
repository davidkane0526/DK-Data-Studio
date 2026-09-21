(() => {
  const manifest={
    id:'example.plugin',name:'Example Plugin',version:'0.5.0',apiVersion:'1.19.0',entry:'plugin.js',enabled:true,order:900,
    description:'Unit-first Plugin API 1.19 template. Domain logic is plugin-owned; complete default presentation is composed from public Unit Templates.',
    capabilities:['ui.page','ui.interaction','ui.interaction-behavior','data.types','state.store','workflow.processor','ui.plugin-workspace'],
    requiresCore:['status','capabilities','state','data.types','data.model','data.formula','workflow','ui.workspace','ui.unit-templates','ui.actions','ui.interaction','ui.interaction-behavior','ui.pages'],
    pluginType:'developer',
    platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}}
  };
  DKDSPlugins.define(manifest, async ctx => {
    const units=ctx.ui.unitTemplates;
    const store=ctx.state.create({schema:1,lastRun:null},{projectSlice:'settings'});

    ctx.data.types.register('example.result',{
      title:'Example derived result',parents:['result.analysis','data.point'],kind:'result',
      key:value=>value?.id,
      selection:value=>({id:value?.id,ref:{entityId:String(value?.id||''),resultId:value?.id},meta:{label:value?.label||value?.id}})
    });
    const interaction=ctx.ui.interaction.create('example',{selection:{multiple:true,defaultType:'example.result'}});
    interaction.bind('details',{types:['result.analysis'],onSelection:snapshot=>{
      const focus=snapshot.focus;if(focus)ctx.status.set(`Selected ${ctx.data.types.describe(focus.type,ctx.data.types.resolve(focus.type,focus))}`);
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

    const page=ctx.ui.pages.add({id:'example-page',label:'示例插件',title:'Example plugin page',order:900,html:''});
    let workbench=null;
    const runCommand=()=>{
      const stamp=Date.now();store.patch({lastRun:stamp});status.textContent=`最近运行：${new Date(stamp).toLocaleString()}`;ctx.status.set('Example command executed.');return true;
    };
    ctx.commands.register('example.run',runCommand);
    ctx.ui.interactionBehaviors.create('example-keys',{activity:'example',bindings:[{gesture:'key',target:'keyboard',chord:'Ctrl+Enter',command:'example.run'}]});

    units.pageHeader.create(page,{variant:'page-owned',title:'示例插件',subtitle:'Unit-first · domain logic + public Unit Templates',actions:[
      {id:'run',label:'运行',variant:'primary',onInvoke:()=>ctx.commands.run('example.run')},
      {id:'details',label:'详情',onInvoke:()=>workbench?.togglePrime?.('details')}
    ]});
    const body=units.page.create(page,{variant:'analysis'}).element;
    const workspaceHost=units.layout.create(body,{variant:'identity'});
    workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'example',primaryScroll:'safe'});

    const main=units.layout.create(null,{variant:'stack-comfortable'});
    units.note.create(main,{variant:'normal',text:'PRIMARY · 在这里组合领域内容。'});
    const status=units.note.create(main,{variant:'meta',text:'尚未运行。'});

    const details=units.layout.create(null,{variant:'stack-comfortable'});
    units.note.create(details,{variant:'normal',text:'PRIME · 当前选择与领域详情。'});
    const detailsPrime=units.prime.build({
      id:'details',label:'详情',title:'示例 PRIME',variant:'canonical-header',
      presentationRole:'inspector',semanticKind:'inspector',priority:70,collapsible:true,
      existingNode:details,defaultPlacement:'right',placements:['inline','right','bottom','float'],
      stateVersion:'unit-first-template-v1'
    });

    workbench.compose({
      primary:{id:'main',label:'主界面',presentationRole:'utility-primary',scroll:'safe',titlePolicy:'host-only',mainNode:main},
      primes:[detailsPrime],subs:[]
    });
    return {deactivate(){workbench?.dispose?.();}};
  });
})();
