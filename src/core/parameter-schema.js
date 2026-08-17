(() => {
  const $create=(tag,cls='')=>{const el=document.createElement(tag);if(cls)el.className=cls;return el;};
  function clone(v){return window.DKDSData?.deepClone?.(v)??JSON.parse(JSON.stringify(v));}
  function fieldsOf(schema){
    if(Array.isArray(schema?.fields))return schema.fields.map(f=>({...f}));
    if(schema?.properties&&typeof schema.properties==='object')return Object.entries(schema.properties).map(([id,f])=>({id,...f}));
    return [];
  }
  function defaultValues(schema,initial={}){
    const out={...clone(initial||{})};for(const f of fieldsOf(schema))if(out[f.id]===undefined&&f.default!==undefined)out[f.id]=clone(f.default);return out;
  }
  function visible(field,values){
    const rule=field.visibleWhen;if(!rule)return true;
    if(typeof rule==='function')return !!rule(values);
    if(typeof rule==='object')return Object.entries(rule).every(([k,v])=>Array.isArray(v)?v.includes(values[k]):values[k]===v);
    return true;
  }
  function resolveOptions(field,context,values){
    let options=typeof field.options==='function'?field.options({context,values}):field.options;
    if(field.type==='column'||field.type==='columns')options=(context?.table?.columns||[]).map(c=>({value:c.key,label:`${c.name}${c.unit?` (${c.unit})`:''}`}));
    return (options||[]).map(o=>typeof o==='object'?o:{value:o,label:String(o)});
  }
  function coerce(field,value){
    if(field.type==='number')return value===''?null:Number(value);
    if(field.type==='integer')return value===''?null:Math.round(Number(value));
    if(field.type==='boolean')return !!value;
    if(field.type==='multiselect'||field.type==='columns')return Array.isArray(value)?value:[value].filter(Boolean);
    return value;
  }
  function validate(schema,values,context={}){
    const errors={};
    for(const f of fieldsOf(schema)){
      if(!visible(f,values))continue;const v=values[f.id];
      if(f.required&&(v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length))){errors[f.id]=`${f.label||f.id} 为必填项。`;continue;}
      if((f.type==='number'||f.type==='integer')&&v!==null&&v!==undefined&&v!==''){
        const n=Number(v);if(!Number.isFinite(n))errors[f.id]=`${f.label||f.id} 必须是有效数字。`;else if(f.min!==undefined&&n<f.min)errors[f.id]=`${f.label||f.id} 不能小于 ${f.min}。`;else if(f.max!==undefined&&n>f.max)errors[f.id]=`${f.label||f.id} 不能大于 ${f.max}。`;
      }
      if(f.pattern&&typeof v==='string'&&!new RegExp(f.pattern).test(v))errors[f.id]=f.patternMessage||`${f.label||f.id} 格式不正确。`;
      if(typeof f.validate==='function'){const message=f.validate(v,{values,context});if(message)errors[f.id]=String(message);}
    }
    return {ok:!Object.keys(errors).length,errors,values};
  }

  function render(container,schema,{value={},context={},onChange=null,compact=false}={}){
    if(typeof container==='string')container=document.querySelector(container);if(!container)throw new Error('Parameter panel container not found.');
    let values=defaultValues(schema,value);const controls=new Map();container.innerHTML='';container.classList.add('schema-parameter-panel');if(compact)container.classList.add('compact');

    function inputFor(field){
      const options=resolveOptions(field,context,values);let input;
      if(field.type==='boolean'){input=$create('input');input.type='checkbox';input.checked=!!values[field.id];}
      else if(['select','column','multiselect','columns'].includes(field.type)){
        input=$create('select');if(field.type==='multiselect'||field.type==='columns')input.multiple=true;
        if(!field.required&&!(field.type==='multiselect'||field.type==='columns')){const o=$create('option');o.value='';o.textContent=field.placeholder||'—';input.appendChild(o);}
        for(const opt of options){const o=$create('option');o.value=String(opt.value);o.textContent=String(opt.label??opt.value);input.appendChild(o);}
        if(input.multiple){const set=new Set(values[field.id]||[]);for(const o of input.options)o.selected=set.has(o.value);}else input.value=values[field.id]??'';
      }else if(field.type==='textarea'||field.type==='formula'){input=$create('textarea');input.rows=field.rows||3;input.value=values[field.id]??'';input.placeholder=field.placeholder||'';}
      else{input=$create('input');input.type=field.type==='number'||field.type==='integer'?'number':field.type==='color'?'color':'text';input.value=values[field.id]??'';if(field.placeholder)input.placeholder=field.placeholder;if(field.min!==undefined)input.min=field.min;if(field.max!==undefined)input.max=field.max;if(field.step!==undefined)input.step=field.step;}
      input.id=`schema-param-${String(field.id).replace(/[^a-z0-9_-]/gi,'-')}`;input.dataset.paramId=field.id;return input;
    }

    function readInput(field,input){
      let raw;if(field.type==='boolean')raw=input.checked;else if(input.multiple)raw=[...input.selectedOptions].map(o=>o.value);else raw=input.value;return coerce(field,raw);
    }

    function rerenderVisibility(){for(const [id,row] of controls){const f=row.field;row.wrap.classList.toggle('hidden',!visible(f,values));}}
    function updateErrors(result){for(const [id,row] of controls){row.wrap.classList.toggle('has-error',!!result.errors[id]);row.error.textContent=result.errors[id]||'';}}

    const groups=new Map();
    for(const field of fieldsOf(schema)){
      const groupName=field.group||'';let group=groups.get(groupName);
      if(!group){group=$create('div','schema-param-group');if(groupName){const title=$create('div','schema-param-group-title');title.textContent=groupName;group.appendChild(title);}container.appendChild(group);groups.set(groupName,group);}
      const wrap=$create('label',`schema-param-field type-${String(field.type||'text').replace(/[^a-z0-9_-]/gi,'-')}`);wrap.dataset.paramId=field.id;const head=$create('div','schema-param-label');head.textContent=field.label||field.id;if(field.required){const req=$create('span','required');req.textContent=' *';head.appendChild(req);}wrap.appendChild(head);
      const input=inputFor(field);wrap.appendChild(input);if(field.description){const help=$create('div','schema-param-help');help.textContent=field.description;wrap.appendChild(help);}const error=$create('div','schema-param-error');wrap.appendChild(error);group.appendChild(wrap);controls.set(field.id,{field,input,wrap,error});
      input.addEventListener('input',()=>{values[field.id]=readInput(field,input);rerenderVisibility();const result=validate(schema,values,context);updateErrors(result);onChange?.(clone(values),result);});
      input.addEventListener('change',()=>{values[field.id]=readInput(field,input);rerenderVisibility();const result=validate(schema,values,context);updateErrors(result);onChange?.(clone(values),result);});
    }
    rerenderVisibility();updateErrors(validate(schema,values,context));
    return {
      getValue(){for(const {field,input} of controls.values())values[field.id]=readInput(field,input);return clone(values);},
      setValue(next){values=defaultValues(schema,next||{});for(const [id,{field,input}] of controls){const v=values[id];if(field.type==='boolean')input.checked=!!v;else if(input.multiple){const set=new Set(v||[]);for(const o of input.options)o.selected=set.has(o.value);}else input.value=v??'';}rerenderVisibility();updateErrors(validate(schema,values,context));},
      validate(){const result=validate(schema,this.getValue(),context);updateErrors(result);return result;},
      destroy(){container.innerHTML='';controls.clear();},
      schema,context
    };
  }
  window.DKDSParameters={fieldsOf,defaultValues,validate,render};
})();
