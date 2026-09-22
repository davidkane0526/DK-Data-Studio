(() => {
  const manifest={
    id:'com.example.top-workspace',name:'SDK TOP Workspace Example',version:'1.1.0',apiVersion:'1.19.0',entry:'plugin.js',scripts:['plugin.js'],
    platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}},enabled:true,order:910,
    description:'Unit-first reference TOP workbench with one shared Unit composition across dedicated TOP and SUPER hosts.',
    pluginType:'workbench',
    requiresCore:['status','events','workspace','data.sources','data.artifacts','ui.workspace','ui.unit-templates','ui.scientific-plot','ui.activities','ui.top-workspace','ui.pages'],
    capabilities:['ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot','data.scoped-sources'],
    workspace:{role:'top',activity:'sdk-top-example',icon:'◇',title:'SDK TOP Example'},
    window:{activity:'sdk-top-example',title:'SDK TOP Example',width:1280,height:820,minWidth:860,minHeight:560,dependencies:['scientific-renderer'],prewarm:false,reuse:true,persistence:'project',artifactHydration:'live'},
    data:{accepts:['science.transport.iv']}
  };
  DKDSPlugins.define(manifest, async ctx => {
    const units=ctx.ui.unitTemplates;
    let workbench=null,surface=null,summary=null;
    const readSources=()=>{const rows=ctx.data.sources.list();return Array.isArray(rows)?rows:[];};
    const refresh=()=>{if(summary)summary.textContent=`当前工作台可见数据：${readSources().length} 组`;surface?.requestRender?.('sources');};

    ctx.ui.activities.add({id:'sdk-top-example',label:'SDK TOP',contextLabel:'SDK TOP Example',icon:'◇',order:910,primary:true,openMode:'window',artifactHydration:'live',description:'Unit-first Plugin API TOP workspace reference',onActivate:()=>{ctx.workspace.openPage('sdkTopExamplePage');refresh();}});
    const page=ctx.ui.pages.add({id:'sdk-top-example-page',pageId:'sdkTopExamplePage',activity:'sdk-top-example',label:'SDK TOP',title:'SDK TOP Workspace Example',toolbar:false,html:''});
    const pageHeader=units.pageHeader.create(page,{variant:'page-owned',activity:'sdk-top-example',title:'SDK TOP Workspace Example',subtitle:'Dedicated TOP · shared Unit composition'});
    units.layout.create(pageHeader.actions,{tagName:'span',variant:'identity',dataset:{dkdsSlot:'workbench-import'}});
    const body=units.page.create(page,{variant:'analysis'}).element;
    const workspaceHost=units.layout.create(body,{variant:'identity'});
    workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'sdk-top-example',primaryScroll:'safe'});

    const main=units.layout.create(null,{variant:'stack-comfortable'});
    summary=units.note.create(main,{variant:'meta',text:'当前工作台可见数据：0 组'});
    const plotPanel=units.panel.create(main,{variant:'plot-card',header:false,sizing:'content'});
    const plot=units.layout.create(plotPanel.body,{variant:'plot-card-fill'});
    surface=units.scientificPlot.create(plot,{variant:'curve',source:'sdk-top-example',xTitle:'X',yTitle:'Y',getCurves:()=>[],getMarkers:()=>[]});
    workbench.compose({primary:{id:'main',label:'主界面',presentationRole:'scientific-primary',scroll:'safe',titlePolicy:'host-only',mainNode:main},primes:[],subs:[]});

    ctx.ui.topWorkspace.register({id:'sdk-top-example',activity:'sdk-top-example',label:'SDK TOP',icon:'◇',layout:{mode:'native',root:{selector:'#sdkTopExamplePage .dkds-plugin-workspace'},primary:{id:'main',role:'analysis-primary',presentationRole:'scientific-primary',priority:100,collapsible:false},prime:[],sub:[]}});
    const off=ctx.events?.on?.('data:artifacts-changed',refresh);refresh();
    return{deactivate(){off?.();surface?.dispose?.();workbench?.dispose?.();}};
  });
})();
