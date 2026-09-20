'use strict';
const {resolveElement}=require('../foundation/shortcuts');
const {DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS}=require('../tooltip/group-plot');

function element(host,label='host'){const node=resolveElement(host);if(!node)throw new Error(`UnitTemplate ${label} not found.`);return node;}
function parentFor(host,label='host'){if(host==null)return null;return element(host,label);}
function appendResolved(parent,value){if(value==null||!parent)return null;const node=resolveElement(value)||value;if(node?.nodeType===1||node?.nodeType===3){parent.appendChild(node);return node;}return null;}
function appendResolvedMany(parent,value){for(const row of Array.isArray(value)?value:[value])appendResolved(parent,row);}
function assignDataset(el,dataset={}){for(const [key,value] of Object.entries(dataset||{}))if(value!==undefined&&value!==null)el.dataset[key]=String(value);return el;}
function addClasses(el,...values){for(const value of values.flatMap(v=>Array.isArray(v)?v:[v]))for(const token of String(value||'').split(/\s+/).filter(Boolean))el.classList.add(token);return el;}
function markUnitRole(node,role,template,variant=''){if(!node?.dataset)return '';const primary=String(node.dataset.dkdsUnitTemplate||''),unitTemplate=String(template||''),token=String(role||'').trim().replace(/[^a-z0-9]+(.)?/gi,(_m,ch)=>ch?String(ch).toUpperCase():'');if(!token)throw new Error('UNIT_ROLE_MARKER_REQUIRED');const key=`dkdsUnit${token[0].toUpperCase()}${token.slice(1)}`;node.dataset[key]=unitTemplate;if(variant!==undefined&&variant!==null&&String(variant)!=='')node.dataset[`${key}Variant`]=String(variant);const roles=new Set(String(node.dataset.dkdsUnitRoles||'').split(/\s+/).filter(Boolean));roles.add(String(role));node.dataset.dkdsUnitRoles=[...roles].join(' ');if(!primary||primary===unitTemplate){node.dataset.dkdsUnitTemplate=unitTemplate;if(variant!==undefined&&variant!==null&&String(variant)!=='')node.dataset.dkdsUnitVariant=String(variant);}return primary;}
function hasUnitRole(node,role,template=''){if(!node?.dataset)return false;const token=String(role||'').trim().replace(/[^a-z0-9]+(.)?/gi,(_m,ch)=>ch?String(ch).toUpperCase():'');if(!token)return false;const key=`dkdsUnit${token[0].toUpperCase()}${token.slice(1)}`,actual=String(node.dataset[key]||'');if(template)return actual===String(template);return !!actual;}
function nonEmptyTitle(spec={},id='plot'){const title=String(spec.title??'').trim();if(!title)throw new Error(`UNIT_PLOTVIEW_TITLE_REQUIRED: ${id}`);return title;}
function placements(value,defaults){const rows=Array.isArray(value)&&value.length?value:defaults;return [...new Set(rows.map(String))];}
function ensureMovable(rows,id){if(new Set(rows).size<2)throw new Error(`UNIT_PLOTVIEW_POSITION_REQUIRED: ${id}`);}
function ensureExport(spec,id){if(spec.csv===false&&spec.copy===false&&spec.images===false)throw new Error(`UNIT_PLOTVIEW_EXPORT_REQUIRED: ${id}`);}
function modifierKey(binding={}){const mods=Array.isArray(binding.modifiers)?binding.modifiers.map(x=>String(x).toLowerCase()).sort().join('+'):'';return `${String(binding.gesture||'')}|${String(binding.target||'*')}|${mods}|${String(binding.button||'')}`;}
const MANDATORY_INTERACTION_KEYS=new Set(DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS.map(modifierKey));
function validatedExtensions(rows=[]){const out=[];for(const row of Array.isArray(rows)?rows:[]){const key=modifierKey(row);if(MANDATORY_INTERACTION_KEYS.has(key))throw new Error(`UNIT_SCIENTIFIC_INTERACTION_OVERRIDE: ${row?.id||key}`);out.push(row);}return out;}
function cleanupCall(fn){if(typeof fn==='function')try{fn();}catch{}}
module.exports=Object.freeze({resolveElement,element,parentFor,appendResolved,appendResolvedMany,assignDataset,addClasses,markUnitRole,hasUnitRole,nonEmptyTitle,placements,ensureMovable,ensureExport,validatedExtensions,cleanupCall,DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS});
