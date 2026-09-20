'use strict';

const NATIVE_PLUGIN_SERVICE_BLUEPRINTS=Object.freeze({
  '_template':Object.freeze({services:['actions','components','dom','interaction','interactionBehaviors','pages','workspaceSurface'],migrations:[Object.freeze({from:'workspaceSurface.create',to:'workspace',count:1}),Object.freeze({from:'actions.mount',to:'actionRow',count:1}),Object.freeze({from:'components.mount',to:'componentTree',count:2})]}),
  'aurora-pop-theme':Object.freeze({services:['theme'],migrations:[]}),
  'connectivity-center':Object.freeze({services:['dom','layout','menus','statusBar'],migrations:[Object.freeze({from:'layout.move',to:'movableWindow',count:2}),Object.freeze({from:'menus.add',to:'menu',count:2}),Object.freeze({from:'statusBar.add',to:'status',count:2})]}),
  'data-center':Object.freeze({services:['activities','contextMenus','dialogs','dom','interaction','interactionBehaviors','menus','pages','parameters','scientificPlot','selection','topWorkspace','unitTemplates'],migrations:[Object.freeze({from:'menus.add',to:'menu',count:1}),Object.freeze({from:'dialogs.confirm',to:'dialog',count:1}),Object.freeze({from:'dialogs.prompt',to:'dialog',count:1}),Object.freeze({from:'parameters.render',to:'parameterForm',count:1})]}),
  'flexible-import':Object.freeze({services:[],migrations:[]}),
  'pulse-analysis':Object.freeze({services:['activities','dom','interaction','menus','pages','portable','scientificPlot','selection','topWorkspace','unitTemplates'],migrations:[Object.freeze({from:'menus.add',to:'menu',count:1}),Object.freeze({from:'portable.create',to:'portable',count:1})]}),
  'pulse-import':Object.freeze({services:[],migrations:[]}),
  'pulse-sampler-tool':Object.freeze({services:['activities','dom','pages','topWorkspace','unitTemplates'],migrations:[]}),
  'resonance-detector-robust':Object.freeze({services:[],migrations:[]}),
  'resonance-workbench':Object.freeze({services:['actions','activities','contextMenus','dialogs','dom','edit','interaction','interactionBehaviors','menus','pages','scientificPlot','selection','series','settings','statusBar','toolbar','topWorkspace','unitTemplates','parameters'],migrations:[Object.freeze({from:'toolbar.add',to:'toolbar',count:1}),Object.freeze({from:'statusBar.add',to:'status',count:1}),Object.freeze({from:'menus.add',to:'menu',count:1}),Object.freeze({from:'parameters.render',to:'parameterForm',count:1})]}),
  'scientific-data-contracts':Object.freeze({services:[],migrations:[]}),
  'shell-navigation':Object.freeze({services:[],migrations:[]}),
  'standard-transport-algorithms':Object.freeze({services:[],migrations:[]}),
  'status-monitor':Object.freeze({services:['dom','statusBar'],migrations:[Object.freeze({from:'statusBar.add',to:'status',count:4}),Object.freeze({from:'dom.style',to:'meter',count:1})]}),
  'ter-analysis':Object.freeze({services:['activities','dom','interaction','menus','pages','portable','scientificPlot','selection','shortcuts','topWorkspace','unitTemplates'],migrations:[Object.freeze({from:'menus.add',to:'menu',count:1}),Object.freeze({from:'portable.create',to:'portable',count:1})]}),
  'thin-glass-theme':Object.freeze({services:['theme'],migrations:[]}),
  'transfer-vth-lab':Object.freeze({services:['activities','dom','interactionBehaviors','pages','settings','topWorkspace','unitTemplates'],migrations:[]}),
  'workspace-safeguards':Object.freeze({services:[],migrations:[]})
});

module.exports=Object.freeze({NATIVE_PLUGIN_SERVICE_BLUEPRINTS});
