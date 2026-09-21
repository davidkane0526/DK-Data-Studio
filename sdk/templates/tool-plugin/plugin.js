(() => {
  const manifest={
    id:'com.example.tool-workspace',name:'SDK Tool Workspace Example',version:'1.1.0',apiVersion:'1.19.0',entry:'plugin.js',scripts:['plugin.js'],
    platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}},enabled:true,order:920,
    description:'Unit-first Tool Workspace using the same shared Unit composition and dedicated-window contract as TOP.',
    pluginType:'tool',
    requiresCore:['workspace','ui.workspace','ui.unit-templates','ui.scientific-plot','ui.activities','ui.top-workspace','ui.pages'],
    capabilities:['ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot'],
    workspace:{role:'top',activity:'sdk-tool-example',icon:'⌁',title:'SDK Tool Example'},
    window:{activity:'sdk-tool-example',title:'SDK Tool Example',width:1080,height:720,minWidth:760,minHeight:520,dependencies:['scientific-renderer'],prewarm:false,reuse:true,persistence:'project',artifactHydration:'live'}
  };
  DKDSPlugins.define(manifest, async ctx => {
    const units=ctx.ui.unitTemplates;
    let workbench=null,surface=null;
    ctx.ui.activities.add({id:'sdk-tool-example',label:'SDK Tool',icon:'⌁',order:920,primary:true,openMode:'window',artifactHydration:'live',onActivate:()=>ctx.workspace.openPage('sdkToolExamplePage')});
    const page=ctx.ui.pages.add({id:'sdk-tool-example-page',pageId:'sdkToolExamplePage',activity:'sdk-tool-example',label:'SDK Tool',title:'SDK Tool Workspace Example',toolbar:false,html:''});
    units.pageHeader.create(page,{variant:'page-owned',activity:'sdk-tool-example',title:'SDK Tool Workspace Example',subtitle:'Tool category · Unit-first composition'});
    const body=units.page.create(page,{variant:'tool'}).element;
    const workspaceHost=units.layout.create(body,{variant:'identity'});
    workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'sdk-tool-example',primaryScroll:'safe'});

    const main=units.layout.create(null,{variant:'stack-comfortable'});
    units.note.create(main,{variant:'meta',text:'工具内容由领域逻辑提供，布局与视觉由 Unit Templates 提供。'});
    const plotPanel=units.panel.create(main,{variant:'plot-card',header:false,sizing:'content'});
    const plot=units.layout.create(plotPanel.body,{variant:'plot-card-fill'});
    surface=units.scientificPlot.create(plot,{variant:'curve',source:'sdk-tool-example',xTitle:'X',yTitle:'Y',getCurves:()=>[],getMarkers:()=>[]});
    workbench.compose({primary:{id:'main',label:'工具',presentationRole:'utility-primary',scroll:'safe',titlePolicy:'host-only',mainNode:main},primes:[],subs:[]});

    ctx.ui.topWorkspace.register({id:'sdk-tool-example',activity:'sdk-tool-example',label:'SDK Tool',icon:'⌁',layout:{mode:'native',root:{selector:'#sdkToolExamplePage .dkds-plugin-workspace'},primary:{id:'main',role:'analysis-primary',presentationRole:'utility-primary',priority:100,collapsible:false},prime:[],sub:[]}});
    return{deactivate(){surface?.dispose?.();workbench?.dispose?.();}};
  });
})();
