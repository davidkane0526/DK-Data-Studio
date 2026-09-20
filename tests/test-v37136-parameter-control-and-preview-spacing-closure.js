'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=require('../package.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.36'),'v3.71.36+ source required.');

const parameter=read('src/core/data/parameter-schema.js');
const schemaCss=read('src/styles/structure/schema-and-plugin-ui.css');
const semanticCss=read('src/styles/structure/sdk-semantic-surfaces.css');
const nativeCss=read('src/styles/platform/native-client-shell.css');
const dc=read('src/plugins/data-center/unit-presentation.js');
const dcCss=read('src/plugins/data-center/plugin.css');
const dcMobile=read('src/plugins/data-center/mobile.css');
const shadow=read('examples/sdk151-unit-data-center-shadow/plugin.js');

// Static ownership / contract pass.
assert(parameter.includes("const selectLike=['select','column','multiselect','columns'].includes(String(field.type||''));"),'Disclosure chrome must be restricted to select-like fields.');
assert(parameter.includes('disclosure:selectLike&&(!input.multiple||popupMulti)'),'Checkbox/text/number/formula fields must never receive a select disclosure shell.');
assert(schemaCss.includes('.panel-header-actions>button,.dkds-plot-view-actions>button,.dkds-field-control'),'Semantic Field proxy buttons must be excluded from generic button geometry.');
assert(semanticCss.includes('.dkds-field-control{')&&semanticCss.includes('line-height:var(--dkds-field-control-line-height,1.15);'),'Native select and popup proxy must consume the same canonical Field density owner.');
assert(!semanticCss.includes('.schema-parameter-panel.auto-fit.compact .schema-param-field :where(select.dkds-field-control,.dkds-multiselect-trigger.dkds-field-control){'),'Canonical Field density must not be re-owned by a select/proxy subtype selector.');
assert(schemaCss.includes('.dkds-multiselect-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;width:100%;overflow:hidden}')&&!/\.dkds-multiselect-trigger\{[^}]*?(?:min-height|padding-block|padding-inline)/.test(schemaCss),'Multi-select proxy anatomy must not re-own canonical Field height/padding.');
assert(!nativeCss.includes('.schema-parameter-panel.auto-fit.compact .schema-param-field :where(select.dkds-field-control,.dkds-multiselect-trigger.dkds-field-control){'),'Platform CSS must not duplicate that exact box owner.');
assert(dc.includes("rowGap:'4px',columnGap:'12px'"),'Data chart control row must retain visible Unit-owned field spacing in every placement.');
assert(shadow.includes("rowGap:'4px',columnGap:'12px'"),'SDK shadow must express the same generic Layout geometry.');
assert(dc.includes("padding:'0 20px 4px 12px'"),'Preview row-count note must keep a clearly visible Unit-owned right inset.');
assert(!dcCss.includes('.dc-preview-note-row{')&&!dcCss.includes('.dc-chart-params.schema-parameter-panel.auto-fit.compact{'),'Data Center CSS must not re-own preview-note or chart-grid geometry.');
assert(!/\.dc-chart-params[^}]*?\.dkds-field-control[^}]*?(?:height|min-height)\s*:/.test(dcMobile),'Data Center Mobile may tune Field density tokens but must not re-own rendered Field height.');

// Runtime DOM pass: prove the generic renderer only adds disclosure chrome to select-like fields.
class ClassList{
  constructor(owner){this.owner=owner;this.set=new Set();}
  add(...rows){for(const row of rows)for(const token of String(row||'').split(/\s+/).filter(Boolean))this.set.add(token);this.owner._className=[...this.set].join(' ');}
  toggle(token,force){const on=force===undefined?!this.set.has(token):!!force;if(on)this.set.add(token);else this.set.delete(token);this.owner._className=[...this.set].join(' ');return on;}
  contains(token){return this.set.has(token);}
}
class FakeElement{
  constructor(tag,width=0){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.clientWidth=width;this.children=[];this.parentNode=null;this.parentElement=null;this.dataset={};this.attributes={};this.classList=new ClassList(this);this._className='';this._text='';this._inner='';this.value='';this.checked=false;this.multiple=false;this.selected=false;this.disabled=false;this.tabIndex=0;this._style={};}

  set className(value){this.classList.set=new Set(String(value||'').split(/\s+/).filter(Boolean));this._className=[...this.classList.set].join(' ');} get className(){return this._className;}
  appendChild(node){node.parentNode=this;node.parentElement=this;this.children.push(node);return node;} append(...nodes){for(const node of nodes)this.appendChild(node);}
  setAttribute(name,value){this.attributes[name]=String(value);} getAttribute(name){return this.attributes[name]??null;}
  addEventListener(){}
  set textContent(value){this._text=String(value??'');} get textContent(){return this._text;}
  set innerHTML(value){this._inner=String(value??'');if(value==='')this.children=[];} get innerHTML(){return this._inner;}
  get options(){return this.tagName==='SELECT'?this.children.filter(x=>x.tagName==='OPTION'):[];}
  get selectedOptions(){return this.options.filter(x=>x.selected);}
}
const document={createElement:tag=>new FakeElement(tag),querySelector:()=>null};
global.document=document;global.window={document,addEventListener(){},removeEventListener(){}};
delete require.cache[require.resolve('../src/core/data/parameter-schema.js')];
require('../src/core/data/parameter-schema.js');
const host=new FakeElement('div');
window.DKDSParameters.render(host,{fields:[
  {id:'x',type:'column',label:'X 列',required:true},
  {id:'ys',type:'columns',label:'Y 列',required:true},
  {id:'mode',type:'select',label:'绘图模式',options:[{value:'lines',label:'折线'}]},
  {id:'legend',type:'boolean',label:'显示图例',default:true}
]},{value:{x:'vd',ys:['id'],mode:'lines',legend:true},context:{table:{columns:[{key:'vd',name:'vd(V)',unit:'V'},{key:'id',name:'id(0.0)',unit:'A'}]}},compact:true,autoFit:true});
const fields=host.children[0]?.classList.contains('schema-param-group')?host.children[0].children:[];
const byId=id=>fields.find(row=>row?.dataset?.paramId===id);
for(const id of ['x','ys','mode']){
  const field=byId(id);assert(field,`missing ${id} field`);
  assert(field.children.some(child=>child.classList?.contains('dkds-select-control-shell')),`${id} must have one disclosure shell`);
}
const legend=byId('legend');assert(legend,'missing legend field');
assert(!legend.children.some(child=>child.classList?.contains('dkds-select-control-shell')),'Boolean checkbox must not receive a disclosure shell.');
assert(!legend.children.some(child=>child.classList?.contains('dkds-select-caret')),'Boolean checkbox must not receive a dropdown caret.');
const yShell=byId('ys').children.find(child=>child.classList?.contains('dkds-select-control-shell'));
const yProxy=yShell.children.find(child=>child.classList?.contains('dkds-multiselect-trigger'));
assert(yProxy?.classList.contains('dkds-field-control'),'Y popup proxy must remain the same canonical Field control as X/mode selects.');

// Runtime Unit geometry pass: prove the generic Layout Unit, not Data Center CSS,
// owns the accepted control gaps and preview-note inset.
const styleGate={
  set(node,property,value){node._style[property]=String(value);},
  remove(node,property){delete node._style[property];},
  snapshot(){return{};}
};
global.DKDSStyleGate=styleGate;window.DKDSStyleGate=styleGate;
const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
const cleanups=[],layoutRuntime=new LayoutUnitRuntime({track(fn){cleanups.push(fn);}});
const layoutHost=new FakeElement('div',900);
const chartRow=layoutRuntime.createLayout(layoutHost,{variant:'identity',geometry:{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(72px,.55fr)',justifyContent:'stretch',alignItems:'end',rowGap:'4px',columnGap:'12px',minWidth:'0'}});
assert.strictEqual(chartRow._style['row-gap'],'4px','Chart control row runtime must preserve the accepted vertical gap.');
assert.strictEqual(chartRow._style['column-gap'],'12px','Chart control row runtime must preserve the accepted horizontal gap.');
const noteRow=layoutRuntime.createLayout(layoutHost,{variant:'row',geometry:{justifyContent:'flex-end',boxSizing:'border-box',width:'100%',padding:'0 20px 4px 12px'}});
assert.strictEqual(noteRow._style.padding,'0 20px 4px 12px','Preview-note runtime must preserve the accepted 20 px right inset.');
for(const fn of cleanups.reverse())fn();

console.log('v3.71.36 Parameter control parity / disclosure / spacing closure PASS');
