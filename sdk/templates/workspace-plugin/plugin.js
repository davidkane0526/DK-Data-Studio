(() => {
  const manifest={
    id:'com.example.workspace',name:'SDK Workspace Example',version:'1.1.0',apiVersion:'1.19.0',entry:'plugin.js',scripts:['plugin.js'],
    platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}},enabled:true,order:900,
    description:'Unit-first standalone SDK workbench using scoped data, Unit Templates, Core scientific plotting and command infrastructure.',
    requiresCore:['status','state','project','data.types','data.sources','ui.workspace','ui.unit-templates','ui.actions','ui.scientific-plot','ui.interaction-behavior','ui.pages'],
    capabilities:['ui.page','ui.interaction-behavior','ui.scientific-plot','state.store','data.types','data.sources','ui.plugin-workspace'],
    pluginType:'workbench',data:{accepts:['science.transport.iv']}
  };
  DKDSPlugins.define(manifest, async ctx => {
    const units=ctx.ui.unitTemplates;
    const state=ctx.state.create({runs:0},{projectSlice:'settings'});
    const run=()=>{state.patch({runs:state.get().runs+1});summary.textContent=`运行次数：${state.get().runs}`;ctx.status.set(`SDK example run ${state.get().runs}`);return true;};
    ctx.commands.register('com.example.workspace.run',run);
    ctx.ui.interactionBehaviors.create('workspace-example-keys',{activity:'sdk-example',bindings:[{gesture:'key',target:'keyboard',chord:'Ctrl+Enter',command:'com.example.workspace.run'}]});
    ctx.data.types.register('example.workspace.result',{title:'SDK example result',parents:['result.analysis'],kind:'result',key:v=>v?.id});

    const page=ctx.ui.pages.add({id:'sdk-workspace',label:'SDK 示例',title:'SDK Workspace Example',order:900,html:''});
    units.pageHeader.create(page,{variant:'page-owned',title:'SDK Workspace Example',subtitle:'Unit-first standalone workbench',actions:[
      {id:'run',label:'运行',variant:'primary',onInvoke:()=>ctx.commands.run('com.example.workspace.run')}
    ]});
    const body=units.page.create(page,{variant:'analysis'}).element;
    const workspaceHost=units.layout.create(body,{variant:'identity'});
    const workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'sdk-example',primaryScroll:'safe'});

    const main=units.layout.create(null,{variant:'stack-comfortable'});
    const summary=units.note.create(main,{variant:'meta',text:'运行次数：0'});
    const sourceNote=units.note.create(main,{variant:'meta',text:`当前工作台可见数据：${ctx.data.sources.list().length} 组`});
    const plotPanel=units.panel.create(main,{variant:'plot-card',header:false,sizing:'content'});
    const plot=units.layout.create(plotPanel.body,{variant:'plot-card-fill'});
    const surface=units.scientificPlot.create(plot,{variant:'curve',source:'sdk-workspace-example',xTitle:'X',yTitle:'Y',getCurves:()=>[],getMarkers:()=>[]});

    workbench.compose({
      primary:{id:'main',label:'主界面',presentationRole:'scientific-primary',scroll:'safe',titlePolicy:'host-only',mainNode:main},
      primes:[],subs:[]
    });
    return {deactivate(){surface?.dispose?.();workbench?.dispose?.();void sourceNote;}};
  });
})();
