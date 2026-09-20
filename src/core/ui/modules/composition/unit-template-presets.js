'use strict';

/*
 * Presets are data-only compositions of public Unit Templates.  They are not
 * a second UI runtime.  The generic composer below may only call public Unit
 * facade methods and may not create DOM, write CSS, or inspect plugin IDs.
 */
const PRESET_DEFINITIONS=Object.freeze({
  'accepted-scientific-v1':Object.freeze({
    id:'accepted-scientific-v1',
    primary:Object.freeze([
      Object.freeze({id:'main',unit:'layout',method:'create',parent:null,spec:Object.freeze({variant:'accepted-main-area'})}),
      Object.freeze({id:'workspace',unit:'layout',method:'create',parent:'main',spec:Object.freeze({variant:'accepted-main-workspace'})}),
      Object.freeze({id:'plotWrap',unit:'layout',method:'create',parent:'workspace',spec:Object.freeze({variant:'accepted-plot-wrap'})}),
      Object.freeze({id:'header',unit:'layout',method:'create',parent:'plotWrap',spec:Object.freeze({variant:'accepted-main-header'})}),
      Object.freeze({id:'tools',unit:'floatingChrome',method:'create',parent:'header',spec:Object.freeze({variant:'accepted-main'}),contentFrom:'tools'}),
      Object.freeze({id:'legend',unit:'legend',method:'create',parent:'header',spec:Object.freeze({variant:'accepted-main'}),contentFrom:'legend'}),
      Object.freeze({id:'plot',unit:'layout',method:'create',parent:'plotWrap',spec:Object.freeze({variant:'accepted-main-plot'}),contentFrom:'content'}),
      Object.freeze({id:'status',unit:'status',method:'create',parent:'main',spec:Object.freeze({variant:'accepted-summary'})}),
      Object.freeze({id:'summary',unit:'layout',method:'create',parent:'status',spec:Object.freeze({variant:'accepted-summary'}),textFrom:'status'})
    ]),
    primeTemplates:Object.freeze({
      'data-control':Object.freeze({unit:'prime',method:'build',variant:'accepted-scientific-data-control'}),
      inspector:Object.freeze({unit:'prime',method:'build',variant:'accepted-scientific-inspector'}),
      'plot-group':Object.freeze({unit:'plotGroup',method:'buildPrime',variant:'accepted-scientific'})
    })
  })
});
function nodeOf(value){return value?.element||value;}
function unitMethod(units,unit,method){const fn=units?.[unit]?.[method];if(typeof fn!=='function')throw new Error(`UNIT_PRESET_RUNTIME_MISSING: ${unit}.${method}`);return fn;}
function composePresetPrimary(units,presetId,spec={}){
  const def=PRESET_DEFINITIONS[presetId];if(!def)throw new Error(`UNIT_PRESET_UNKNOWN: ${presetId}`);const refs={};
  for(const step of def.primary){const parent=step.parent===null?null:nodeOf(refs[step.parent]);if(step.parent!==null&&!parent)throw new Error(`UNIT_PRESET_PARENT_MISSING: ${presetId}:${step.parent}`);const next={...step.spec};if(step.contentFrom&&spec[step.contentFrom]!==undefined)next.content=spec[step.contentFrom];const result=unitMethod(units,step.unit,step.method)(parent,next);refs[step.id]=result;if(step.textFrom&&spec[step.textFrom]!==undefined){const target=nodeOf(result);target.textContent=String(typeof spec[step.textFrom]==='function'?spec[step.textFrom]():spec[step.textFrom]??'');}}
  const main=nodeOf(refs.main);if(main)main.__dkdsScientificReference=Object.freeze({workspace:nodeOf(refs.workspace),plotWrap:nodeOf(refs.plotWrap),header:nodeOf(refs.header),tools:nodeOf(refs.tools),legend:nodeOf(refs.legend),plot:nodeOf(refs.plot),status:nodeOf(refs.status),summary:nodeOf(refs.summary)});return main;
}
function composePresetPrime(units,presetId,spec={}){
  if(spec.existingNode||spec.node)return spec;const def=PRESET_DEFINITIONS[presetId];if(!def)throw new Error(`UNIT_PRESET_UNKNOWN: ${presetId}`);const template=String(spec.template||(spec.presentationRole==='scientific-secondary'?'plot-group':spec.presentationRole)||'inspector'),row=def.primeTemplates[template]||def.primeTemplates.inspector;return unitMethod(units,row.unit,row.method)({...spec,variant:row.variant});
}
module.exports=Object.freeze({PRESET_DEFINITIONS,composePresetPrimary,composePresetPrime});
