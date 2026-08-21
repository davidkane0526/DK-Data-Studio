(() => {
  DKDSPlugins.define({
    id:'builtin.resonance-workbench',
    name:'Resonance Workbench',
    version:'3.60.0',
    apiVersion:'1.10.0',requiresCore:["runtime","events","status","io","science","performance","services","modules","capabilities","project","workspace","parameters","data.artifacts","data.entities","data.types","data.reactive","data.pipeline","data.transforms","analysis.algorithms","charts","ui.dom","ui.workspace","ui.actions","ui.selection","ui.interaction","ui.menus","ui.context-menus","ui.activities","ui.top-workspace","ui.toolbar","ui.shortcuts","ui.pages","ui.styles","ui.edit","ui.scientific-plot","ui.settings"],
    algorithmCategories:['peak-detector','peak-metrics','transport-transform','transport-scalar-field','ter-analysis'],
    description:'Reference PluginWorkspace implementation: GRS parity on Core ScientificCurveSurface with host-invariant SUPER/TOP composition.',
    source:'builtin',
    order:100,
    capabilities:['ui.activity','ui.sidebar','ui.inspector','ui.group-charts','ui.main-tools','analysis.resonance','chart.trend','ui.top-workspace','ui.prime','ui.sub','ui.infrastructure','ui.views','ui.analysis-workbench','ui.primary','runtime.capabilities','ui.analysis-surface','runtime.capabilities.v2','ui.interaction','data.types','data.artifacts','data.pipeline','ui.plugin-workspace','ui.scientific-plot','ui.settings'],
    workspace:{role:'top',activity:'resonance',icon:'∿',title:'共振分析'}
  }, async ctx => {
    const shared=ctx.modules.require('workbench-shared');
    // Domain types live with the shared feature contract, not with the shell.
    shared.registerDataTypes?.(ctx);
    const interactionRuntime=ctx.ui.interaction?.create?.('resonance',{selection:{multiple:true,defaultType:'resonance.peak'},defaultType:'resonance.peak'});
    const interactionSelection=interactionRuntime?.selection||ctx.ui.selection.model('resonance:interaction',{multiple:true,defaultType:'resonance.peak'});
    let runtime=null;
    let service=null;
    if(ctx.runtime.isAuxiliaryWindow){
      service=ctx.services.require('builtin.resonance-workbench.runtime');
    }else{
      const feature=ctx.modules.require('feature-runtime');
      runtime=await feature.createTop({
        project:ctx.project.create?.()||{},
        artifacts:ctx.data.artifacts,
        setStatus:ctx.status.set,
        scheduleSnapshot:()=>ctx.project.capture?.(),
        copyTextToClipboard:text=>ctx.io.clipboard.writeText(text),
        savePlotlyImage:(plotId,baseName,format)=>ctx.ui.scientificPlot.saveImage(plotId,baseName,format),
        io:ctx.io,charts:ctx.ui.scientificPlot,dom:ctx.ui.dom,performance:ctx.performance,pipeline:ctx.data.pipeline,transforms:ctx.data.transforms,algorithms:ctx.analysis.algorithms,reactive:ctx.data.reactive,
        adapter:{mode:'super',root:ctx.ui.dom.query('#app')}
      });
      service=runtime.service;
    }
    if(!service)throw new Error('Resonance service is unavailable.');
    const pluginSettings=ctx.ui.settings?.define?.('defaults',{
      title:'共振分析默认设置',description:'仅保存插件级默认布局，不改变科学算法或工程数据。',
      defaults:{inspectPlacement:'right',groupPlacement:'bottom',groupColumns:'auto'},
      fields:[
        {id:'inspectPlacement',label:'“检查”默认位置',type:'select',options:[{value:'right',label:'右侧'},{value:'left',label:'左侧'},{value:'bottom',label:'底部'},{value:'float',label:'窗口内悬浮'},{value:'global',label:'全局悬浮'}]},
        {id:'groupPlacement',label:'“组图”默认位置',type:'select',options:[{value:'bottom',label:'底部'},{value:'right',label:'右侧'},{value:'left',label:'左侧'},{value:'float',label:'窗口内悬浮'},{value:'global',label:'全局悬浮'}]},
        {id:'groupColumns',label:'组图每行列数',type:'select',options:['auto','1','2','3','4','5','6'].map(value=>({value,label:value==='auto'?'自动':`${value} 列`}))}
      ],onApply:value=>service.setUserDefaults?.(value,{applyCurrent:true})
    });
    service.setUserDefaults?.(pluginSettings?.get?.()||{},{applyCurrent:false});
    service.setInteractionRuntime?.({runtime:interactionRuntime,selection:interactionSelection,dataTypes:ctx.data.types,contextMenus:ctx.ui.contextMenus});
    const controller=shared.createController(service,{
      mode:ctx.runtime.isAuxiliaryWindow?'top':'super',
      science:ctx.science
    });
    const views=ctx.modules.require('view-components');
    if(ctx.runtime.isAuxiliaryWindow)return views.mountTop(ctx,controller);
    const layout=ctx.modules.require('super-layout');
    return layout.mount(ctx,controller);
  });
})();
