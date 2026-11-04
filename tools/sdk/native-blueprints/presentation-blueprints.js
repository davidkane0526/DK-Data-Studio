'use strict';

const surface=(id,kind,role,priority,collapsible=true,extra={})=>Object.freeze({id,kind,role,priority,collapsible,...extra});
const contribution=(kind,id,side,order,extra={})=>Object.freeze({kind,id,side,order,...extra});
const blueprint=(surfaces=[],contributions=[])=>Object.freeze({surfaces:Object.freeze(surfaces),contributions:Object.freeze(contributions)});

const NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS=Object.freeze({
  '_template':blueprint(),
  'aurora-pop-theme':blueprint(),
  'connectivity-center':blueprint([], [contribution('status','smb-browser','right',31),contribution('status','ai-agent','right',32)]),
  'data-center':blueprint([
    surface('main','primary','data-primary',100,false),surface('data-control','prime','data-control',94,true),surface('chart-preview','prime','scientific-secondary',60,true)
  ]),
  'flexible-import':blueprint(),
  'pulse-analysis':blueprint([
    surface('main','primary','scientific-primary',100,false),surface('data-control','prime','data-control',92,true)
  ]),
  'pulse-import':blueprint(),
  'pulse-sampler-tool':blueprint([
    surface('main','primary','utility-primary',100,false),surface('parameters','prime','data-control',96,true,{embedded:true})
  ]),
  'resonance-detector-robust':blueprint(),
  'resonance-workbench':blueprint([
    surface('main','primary','scientific-primary',100,false),surface('data-control','prime','data-control',95,true),surface('curve-inspector','prime','inspector',90,true),surface('group-analysis','prime','scientific-secondary',70,true),
    surface('physics','sub','scientific-secondary',60,true),surface('spacing','sub','scientific-secondary',50,true),surface('gate-analysis','sub','scientific-secondary',40,true)
  ],[
    contribution('status','main-summary','left',1,{activity:'resonance',presentationOnly:true}),contribution('toolbar','res-settings','UTILITY',980,{activity:'resonance',priority:10})
  ]),
  'scientific-data-contracts':blueprint(),
  'shell-navigation':blueprint(),
  'standard-transport-algorithms':blueprint(),
  'status-monitor':blueprint([], [contribution('status','theme','right',10),contribution('status','memory','right',20),contribution('status','devtools','right',25),contribution('status','lan-web','right',30)]),
  'ter-analysis':blueprint([
    surface('main','primary','scientific-primary',100,false),surface('data-control','prime','data-control',90,true)
  ]),
  'thin-glass-theme':blueprint(),
  'transfer-vth-lab':blueprint([
    surface('vth-main','primary','scientific-primary',100,false),surface('data-control','prime','data-control',90,true)
  ]),
  'workspace-safeguards':blueprint()
});

module.exports=Object.freeze({NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS});
