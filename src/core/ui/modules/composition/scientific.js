'use strict';
const {resolveElement}=require('../foundation/shortcuts');
const {GroupAreaController}=require('../grid/controller');
const {BASE_METRICS}=require('./unit-template-spec');

const SECTION_ROLES=new Set(['workflow','primary-plot','plot-group','result','warning','controls']);
const DENSITIES=new Set(['compact','regular','comfortable']);
const REFERENCE_PROFILE='accepted-scientific-v1';
const REFERENCE_PROFILE_GEOMETRY=Object.freeze({
  leftWidth:BASE_METRICS.acceptedScientific.leftWidthPx,
  leftMin:BASE_METRICS.acceptedScientific.leftMinPx,
  canvasLeftWidth:BASE_METRICS.acceptedScientific.canvasLeftWidthPx,
  canvasRightWidth:BASE_METRICS.acceptedScientific.canvasRightWidthPx,
  canvasBottomHeight:BASE_METRICS.acceptedScientific.canvasBottomHeightPx,
  primaryScroll:'contained',
  dataControlInset:BASE_METRICS.acceptedScientific.dataControlInsetPx,
  panelBodyInset:BASE_METRICS.acceptedScientific.panelBodyInsetPx,
  groupGap:BASE_METRICS.acceptedScientific.groupGapPx
});
let nextPlotGroupId=1;

class ScientificSection {
  constructor(scope,host,spec={}){
    this.scope=scope;this.spec={...spec};this.host=resolveElement(host);this.disposed=false;
    if(!this.host)throw new Error('ScientificSection host not found.');
    const role=String(spec.role||'').trim();if(!SECTION_ROLES.has(role))throw new Error(`Unknown ScientificSection role: ${role||'(empty)'}`);
    const density=DENSITIES.has(String(spec.density||''))?String(spec.density):'regular';
    const section=document.createElement('section');section.className='dkds-scientific-section';section.dataset.dkdsScientificSection=String(spec.id||role);section.dataset.dkdsScientificSectionRole=role;section.dataset.dkdsScientificDensity=density;
    if(spec.title||spec.subtitle){const head=document.createElement('header');head.className='dkds-scientific-section-head';if(spec.title){const title=document.createElement('h3');title.className='analysis-section-title dkds-scientific-section-title';title.textContent=String(spec.title);head.appendChild(title);}if(spec.subtitle){const sub=document.createElement('div');sub.className='dkds-scientific-section-subtitle dkds-meta';sub.textContent=String(spec.subtitle);head.appendChild(sub);}section.appendChild(head);this.header=head;}
    const body=document.createElement('div');body.className='dkds-scientific-section-body';section.appendChild(body);this.element=section;this.body=body;this.host.appendChild(section);
  }
  setContent(node){const value=resolveElement(node)||node;if(value?.nodeType===1){this.body.replaceChildren(value);return value;}return null;}
  append(node){const value=resolveElement(node)||node;if(value?.nodeType===1){this.body.appendChild(value);return value;}return null;}
  dispose(){if(this.disposed)return;this.disposed=true;this.element?.remove?.();}
}

class PlotGroup {
  constructor(scope,host,spec={}){
    this.scope=scope;this.host=resolveElement(host);this.spec={...spec};this.views=new Map();this.disposed=false;this.id=String(spec.id||`plot-group-${nextPlotGroupId++}`);this.profile=String(spec.profile||'');
    if(!this.host)throw new Error('PlotGroup host not found.');
    const density=DENSITIES.has(String(spec.density||''))?String(spec.density):'regular';
    this.autoColumns=Math.max(1,Number(spec.columns??(typeof spec.preferredColumns==='number'?spec.preferredColumns:3))||3);this.columnPreference='auto';
    this.host.dataset.dkdsPlotGroup='true';this.host.dataset.dkdsPlotGroupId=this.id;this.host.dataset.dkdsGroupDensity=density;
    if(this.profile===REFERENCE_PROFILE){this.host.dataset.dkdsScientificProfile=REFERENCE_PROFILE;this.host.classList.add('dkds-scientific-reference-group-grid');}
    this.area=new GroupAreaController(scope,this.host,{columns:spec.columns??spec.preferredColumns??3,preferredColumns:spec.preferredColumns,maxColumns:spec.maxColumns??6,minItemWidth:spec.minItemWidth??290,responsive:spec.responsive!==false,orientationPolicy:spec.orientationPolicy});
  }
  addPlot(spec={}){
    const id=String(spec.id||`plot-${this.views.size+1}`).trim();if(!id)throw new Error('PlotGroup plot id required.');if(this.views.has(id))throw new Error(`Duplicate PlotGroup plot id: ${id}`);if(this.spec.responsive!==false&&(spec.height!==undefined||spec.contentHeight!==undefined))throw new Error(`RESPONSIVE_GROUP_FIXED_CONTENT_HEIGHT: ${id}`);
    const card=document.createElement('section');card.className='analysis-chart-card dkds-surface';card.dataset.dkdsPlotGroupChild='true';card.dataset.dkdsPlotGroupOwner=this.id;card.dataset.dkdsPlotViewId=id;card.dataset.dkdsScientificCard='true';
    if(this.profile===REFERENCE_PROFILE)card.classList.add('dkds-scientific-reference-group-card');
    const titleless=spec.titleless===true||spec.header===false;
    if(!titleless){const head=document.createElement('header');head.className='analysis-chart-title';head.dataset.dkdsPlotHeader='true';const title=document.createElement('span');title.className='dkds-plot-view-title';title.textContent=String(spec.title||id);const actions=document.createElement('span');actions.className='dkds-plot-view-actions dkds-integrated-action-group';actions.dataset.dkdsPlotActions='true';head.append(title,actions);card.appendChild(head);}
    const plot=document.createElement('div');plot.className='analysis-chart dkds-scientific-chart-host';if(this.profile===REFERENCE_PROFILE)plot.classList.add('dkds-scientific-reference-group-plot');plot.dataset.dkdsPlot='true';card.appendChild(plot);this.host.appendChild(card);
    const view=this.scope.plotViewRegistry.bind(id,card,{...spec,titleless,plot,header:titleless?false:'[data-dkds-plot-header]',actionsHost:titleless?false:'[data-dkds-plot-actions]',surface:'scientific-card',portable:spec.portable!==false,placements:spec.placements||['home','left','right','bottom','float','global'],defaultPlacement:spec.defaultPlacement||'home'});
    view.plotHost=plot;view.group=this;this.views.set(id,view);
    try{spec.render?.(plot,view);}catch(err){this.removePlot(id);throw err;}
    this.area.apply();return view;
  }
  adoptPlot(id,card,spec={}){
    const key=String(id||'').trim();const node=resolveElement(card);if(!key||!node)throw new Error('PlotGroup adoptPlot requires id and card.');if(this.views.has(key))throw new Error(`Duplicate PlotGroup plot id: ${key}`);const priorOwner=String(node.dataset?.dkdsPlotGroupOwner||'');if(priorOwner&&priorOwner!==this.id)throw new Error(`PLOTVIEW_DUPLICATE_GROUP_OWNER: ${key}`);if(this.spec.responsive!==false&&(spec.height!==undefined||spec.contentHeight!==undefined))throw new Error(`RESPONSIVE_GROUP_FIXED_CONTENT_HEIGHT: ${key}`);
    node.dataset.dkdsPlotGroupChild='true';node.dataset.dkdsPlotGroupOwner=this.id;node.dataset.dkdsPlotViewId=key;node.dataset.dkdsScientificCard='true';if(node.parentElement!==this.host)this.host.appendChild(node);
    const view=this.scope.plotViewRegistry.bind(key,node,{...spec,surface:'scientific-card'});view.group=this;this.views.set(key,view);this.area.apply();return view;
  }
  removePlot(id){const key=String(id||'');const view=this.views.get(key);if(!view)return false;this.views.delete(key);const card=view.card;view.dispose?.();card?.remove?.();this.area.apply();return true;}
  setColumns(value){const raw=String(value??'auto');if(raw==='auto'){this.columnPreference='auto';return this.area.setColumns(this.autoColumns);}const n=Math.max(1,Number(value)||1);this.columnPreference=String(n);return this.area.setColumns(n);}
  getColumns(){return this.area.getColumns();}
  getColumnPreference(){return this.columnPreference;}
  getAppliedColumns(){return this.area.getAppliedColumns();}
  getOrientation(){return this.area.getOrientation();}
  validate(){const issues=[];for(const child of [...this.host.children]){if(child===this.area.stickyRail)continue;if(child.dataset?.dkdsPlotGroupChild!=='true'||!child.classList?.contains('dkds-plot-view'))issues.push({code:'GROUP_CHILD_MISSING_PLOTVIEW',id:child.id||child.dataset?.dkdsPlotViewId||''});else if(String(child.dataset?.dkdsPlotGroupOwner||'')!==this.id)issues.push({code:'PLOTVIEW_DUPLICATE_GROUP_OWNER',id:child.id||child.dataset?.dkdsPlotViewId||''});}return Object.freeze(issues);}
  dispose(){if(this.disposed)return;this.disposed=true;for(const view of [...this.views.values()]){const card=view.card;view.dispose?.();card?.remove?.();}this.views.clear();this.area?.dispose?.();delete this.host.dataset.dkdsPlotGroup;delete this.host.dataset.dkdsPlotGroupId;delete this.host.dataset.dkdsGroupDensity;delete this.host.dataset.dkdsScientificProfile;}
}


class ScientificWorkbenchComposer {
  constructor(scope,sections,plotGroups){this.scope=scope;this.sections=sections;this.plotGroups=plotGroups;this.profiles=Object.freeze({acceptedScientificV1:Object.freeze({id:REFERENCE_PROFILE,geometry:REFERENCE_PROFILE_GEOMETRY})});}
  profileWorkspace(spec={}){
    const profile=String(spec.profile||'');if(profile!==REFERENCE_PROFILE)return {...(spec.workspace||{})};
    return {header:false,primaryScroll:REFERENCE_PROFILE_GEOMETRY.primaryScroll,leftWidth:REFERENCE_PROFILE_GEOMETRY.leftWidth,leftMin:REFERENCE_PROFILE_GEOMETRY.leftMin,canvasLeftWidth:REFERENCE_PROFILE_GEOMETRY.canvasLeftWidth,canvasRightWidth:REFERENCE_PROFILE_GEOMETRY.canvasRightWidth,canvasBottomHeight:REFERENCE_PROFILE_GEOMETRY.canvasBottomHeight,...(spec.workspace||{})};
  }
  buildReferencePrimary(primarySpec={}){
    const units=this.scope.unitTemplates;if(!units?.compositions?.acceptedScientificV1)throw new Error('accepted-scientific-v1 requires Unit Templates.');
    return units.compositions.acceptedScientificV1.primary(primarySpec);
  }
  buildReferencePrime(prime={}){
    const units=this.scope.unitTemplates;if(!units?.compositions?.acceptedScientificV1)throw new Error('accepted-scientific-v1 requires Unit Templates.');
    return units.compositions.acceptedScientificV1.prime(prime);
  }
  create(root,spec={}){
    const profile=String(spec.profile||'');const workspaceSpec=this.profileWorkspace(spec);const wb=this.scope.pluginWorkspace.create(root,{...workspaceSpec,id:spec.id||workspaceSpec.id,activity:spec.activity||workspaceSpec.activity,header:workspaceSpec.header??false});
    if(profile===REFERENCE_PROFILE){wb.shell?.setAttribute('data-dkds-scientific-profile',REFERENCE_PROFILE);wb.referenceProfile=Object.freeze({id:REFERENCE_PROFILE,geometry:REFERENCE_PROFILE_GEOMETRY});}
    const primarySpec=spec.primary||{};let mainNode=resolveElement(primarySpec.mainNode)||null;
    if(!mainNode&&profile===REFERENCE_PROFILE&&primarySpec.template==='analysis-main')mainNode=this.buildReferencePrimary(primarySpec);
    if(!mainNode){mainNode=document.createElement('div');mainNode.className='dkds-scientific-primary-flow';for(const row of primarySpec.sections||[]){const section=this.sections.create(mainNode,row);if(row.node)section.setContent(row.node);else if(row.kind==='plot'||row.role==='primary-plot'){this.scope.plotViews.create(String(row.plot?.id||row.id||`plot-${mainNode.children.length}`),section.body,{title:row.plot?.title||row.title,...(row.plot||{}),surface:'scientific-card'});}else if(row.kind==='plot-group'||row.role==='plot-group'){const group=this.plotGroups.create(section.body,row.group||row);for(const plot of row.plots||[])group.addPlot(plot);}}}
    const primes=profile===REFERENCE_PROFILE?(spec.primes||[]).map(row=>this.buildReferencePrime(row)):(spec.primes||[]);
    wb.compose({primary:{id:primarySpec.id||'main',label:primarySpec.label,scroll:primarySpec.scroll||workspaceSpec.primaryScroll||'safe',titlePolicy:primarySpec.titlePolicy||'auto',mainNode},primes,subs:spec.subs||[]});
    return wb;
  }
}

function createScientificCompositionRuntime(scope){
  const sections={create:(host,spec={})=>scope.trackObject(new ScientificSection(scope,host,spec))};
  const plotGroups={create:(host,spec={})=>scope.trackObject(new PlotGroup(scope,host,spec))};
  const scientificWorkbench=new ScientificWorkbenchComposer(scope,sections,plotGroups);
  return Object.freeze({sections,plotGroups,scientificWorkbench});
}

module.exports=Object.freeze({ScientificSection,PlotGroup,ScientificWorkbenchComposer,createScientificCompositionRuntime,SECTION_ROLES,DENSITIES,REFERENCE_PROFILE,REFERENCE_PROFILE_GEOMETRY});
