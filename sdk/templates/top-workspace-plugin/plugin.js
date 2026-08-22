(() => {
  const manifest={
    id:'com.example.top-workspace',name:'SDK TOP Workspace Example',version:'1.0.0',apiVersion:'1.15.0',entry:'plugin.js',scripts:['plugin.js'],styles:['plugin.css'],enabled:true,order:910,
    description:'Reference external TOP workbench with a dedicated window, scoped project sources and bounded scientific layout.',pluginType:'workbench',
    requiresCore:['status','events','workspace','data.sources','data.artifacts','ui.dom','ui.workspace','ui.scientific-plot','ui.activities','ui.top-workspace','ui.pages'],
    capabilities:['ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot','data.scoped-sources'],
    workspace:{role:'top',activity:'sdk-top-example',icon:'◇',title:'SDK TOP Example'},
    window:{activity:'sdk-top-example',title:'SDK TOP Example',width:1280,height:820,minWidth:860,minHeight:560,dependencies:['plotly'],prewarm:false,reuse:true,persistence:'project',artifactHydration:'live'},
    data:{accepts:['science.transport.iv']},compatibility:{app:'>=3.61.17 <4.0.0',pluginApi:'^1.15.0'}
  };
  DKDSPlugins.define(manifest, async ctx => {
    let workbench=null;
    let surface=null;
    let summary=null;
    const readSources=()=>{const rows=ctx.data.sources.list();return Array.isArray(rows)?rows:[];};
    const refresh=()=>{if(summary)summary.textContent=`当前工作台可见数据：${readSources().length} 组`;surface?.requestRender?.('sources');};

    ctx.ui.activities.add({
      id:'sdk-top-example',label:'SDK TOP',contextLabel:'SDK TOP Example',icon:'◇',order:910,primary:true,openMode:'window',artifactHydration:'live',
      description:'Plugin API TOP workspace reference',
      onActivate:()=>{ctx.workspace.openPage('sdkTopExamplePage');refresh();}
    });

    const page=ctx.ui.pages.add({
      id:'sdk-top-example-page',pageId:'sdkTopExamplePage',activity:'sdk-top-example',label:'SDK TOP',title:'SDK TOP Workspace Example',toolbar:false,
      html:'<div class="analysis-page-header"><div><h2>SDK TOP Workspace Example</h2><div class="sdk-top-subtitle">Dedicated TOP · scoped data · bounded plot</div></div><div data-dkds-slot="workbench-import"></div></div><div class="analysis-page-body"><div class="sdk-top-workbench"></div></div>'
    });
    const host=ctx.ui.dom.query('.sdk-top-workbench',page);
    workbench=ctx.ui.pluginWorkspace.create(host,{header:false,activity:'sdk-top-example',primaryScroll:'contained'});
    workbench.mountPrimary({
      id:'main',label:'主界面',scroll:'contained',mount:({main})=>{
        const shell=ctx.ui.dom.create('div',{className:'sdk-top-main'});
        summary=ctx.ui.dom.create('div',{className:'sdk-top-summary'});
        const plot=ctx.ui.dom.create('div',{className:'sdk-top-plot'});
        ctx.ui.dom.append(shell,summary,plot);ctx.ui.dom.append(main,shell);
        surface=ctx.ui.scientificPlot.create(plot,{minHeight:220,xTitle:'X',yTitle:'Y',getCurves:()=>[],getMarkers:()=>[]});
        refresh();
        return()=>{surface?.dispose?.();surface=null;summary=null;};
      }
    });

    ctx.ui.topWorkspace.register({
      id:'sdk-top-example',activity:'sdk-top-example',label:'SDK TOP',icon:'◇',
      layout:{mode:'native',root:{selector:'#sdkTopExamplePage .dkds-plugin-workspace'},primary:{id:'main',role:'analysis-primary'},prime:[],sub:[]}
    });
    const off=ctx.events?.on?.('data:artifacts-changed',refresh);
    return{deactivate(){off?.();surface?.dispose?.();workbench?.dispose?.();}};
  });
})();
