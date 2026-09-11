(function(root,factory){
  const api=factory();
  root.DKDSScientificUnits=api;
  root.DKDSScience=root.DKDSScience||{};
  root.DKDSScience.units=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const VERSION='1.0.0';
  const BASES=Object.freeze(['L','M','T','I','Th','N','J']);
  const zero=()=>BASES.map(()=>0);
  const vector=(values={})=>BASES.map(key=>Number(values[key]||0));
  const keyOf=values=>values.map((value,index)=>value?`${BASES[index]}${value}`:'').filter(Boolean).join('.')||'1';
  const sameVector=(left,right)=>Array.isArray(left)&&Array.isArray(right)&&left.length===BASES.length&&right.length===BASES.length&&left.every((value,index)=>value===right[index]);

  const DIMENSION_SPECS=[
    ['dimensionless',{}],
    ['length',{L:1}],['area',{L:2}],['volume',{L:3}],
    ['mass',{M:1}],['time',{T:1}],['frequency',{T:-1}],
    ['electric-current',{I:1}],['electric-charge',{I:1,T:1}],
    ['voltage',{M:1,L:2,T:-3,I:-1}],
    ['resistance',{M:1,L:2,T:-3,I:-2}],
    ['conductance',{M:-1,L:-2,T:3,I:2}],
    ['capacitance',{M:-1,L:-2,T:4,I:2}],
    ['inductance',{M:1,L:2,T:-2,I:-2}],
    ['energy',{M:1,L:2,T:-2}],['power',{M:1,L:2,T:-3}],
    ['pressure',{M:1,L:-1,T:-2}],['temperature',{Th:1}],
    ['magnetic-flux',{M:1,L:2,T:-2,I:-1}],['magnetic-flux-density',{M:1,T:-2,I:-1}],
    ['angle',{}],['amount',{N:1}],['luminous-intensity',{J:1}],
    ['current-density',{I:1,L:-2}],['electric-field',{M:1,L:1,T:-3,I:-1}],
    ['charge-density',{I:1,T:1,L:-2}],['resistivity',{M:1,L:3,T:-3,I:-2}],
    ['conductivity',{M:-1,L:-3,T:3,I:2}]
  ];
  const dimensions=new Map();
  const dimensionByKey=new Map();
  for(const [id,spec] of DIMENSION_SPECS){
    const values=Object.freeze(vector(spec)),row=Object.freeze({id,vector:values,key:keyOf(values)});
    dimensions.set(id,row);if(!dimensionByKey.has(row.key))dimensionByKey.set(row.key,row);
  }
  const DIMENSION_ALIASES=Object.freeze({
    current:'electric-current',charge:'electric-charge',potential:'voltage',electricPotential:'voltage',
    ohmicResistance:'resistance',siemens:'conductance',temp:'temperature',field:'electric-field',
    currentDensity:'current-density',chargeDensity:'charge-density'
  });

  const atomicUnits=new Map(),aliases=new Map();
  function addUnit(symbol,dimension,scale=1,offset=0,unitAliases=[]){
    const dim=dimensions.get(dimension);if(!dim)throw new Error(`Unknown unit dimension ${dimension}`);
    const row=Object.freeze({symbol,dimension:dim.id,dimensionKey:dim.key,vector:dim.vector,scale:Number(scale),offset:Number(offset)||0,affine:true});
    atomicUnits.set(symbol,row);aliases.set(symbol,symbol);for(const alias of unitAliases)aliases.set(String(alias),symbol);return row;
  }
  addUnit('1','dimensionless',1,0,['ratio','unitless']);
  addUnit('%','dimensionless',0.01,0,['percent']);
  addUnit('m','length',1,0,['meter','metre']);
  addUnit('g','mass',1e-3,0,['gram']);
  addUnit('kg','mass',1,0,['kilogram']);
  addUnit('s','time',1,0,['sec','second']);
  addUnit('A','electric-current');
  addUnit('K','temperature');
  addUnit('°C','temperature',1,273.15,['degC','Celsius']);
  addUnit('mol','amount');
  addUnit('cd','luminous-intensity');
  addUnit('rad','angle');
  addUnit('°','angle',Math.PI/180,0,['deg','degree']);
  addUnit('Hz','frequency');
  addUnit('C','electric-charge');
  addUnit('V','voltage');
  addUnit('Ω','resistance',1,0,['Ω','ohm','Ohm']);
  addUnit('S','conductance');
  addUnit('F','capacitance');
  addUnit('H','inductance');
  addUnit('J','energy');
  addUnit('eV','energy',1.602176634e-19);
  addUnit('W','power');
  addUnit('Pa','pressure');
  addUnit('Wb','magnetic-flux');
  addUnit('T','magnetic-flux-density');

  const PREFIXES=Object.freeze([
    ['da',1e1],['Y',1e24],['Z',1e21],['E',1e18],['P',1e15],['T',1e12],['G',1e9],['M',1e6],['k',1e3],['h',1e2],
    ['d',1e-1],['c',1e-2],['m',1e-3],['µ',1e-6],['μ',1e-6],['u',1e-6],['n',1e-9],['p',1e-12],['f',1e-15],['a',1e-18],['z',1e-21],['y',1e-24]
  ]);
  const PREFIXABLE=new Set(['m','g','s','A','K','mol','cd','rad','Hz','C','V','Ω','S','F','H','J','eV','W','Pa','Wb','T']);
  const cleanText=value=>String(value??'').trim();
  function normalizeSuperscripts(value){
    const map={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
    return String(value).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,token=>`^${[...token].map(char=>map[char]).join('')}`);
  }
  function normalizeExpression(value){
    let text=normalizeSuperscripts(cleanText(value)).replace(/Ω/g,'Ω').replace(/[⋅·×]/g,'*').replace(/μ/g,'µ');
    text=text.replace(/\s+/g,'*').replace(/\*+/g,'*').replace(/^\*|\*$/g,'');
    return text;
  }
  function resolveAtomic(token){
    const raw=cleanText(token);if(!raw)return null;
    const alias=aliases.get(raw);if(alias)return atomicUnits.get(alias)||null;
    for(const [prefix,factor] of PREFIXES){
      if(!raw.startsWith(prefix)||raw.length<=prefix.length)continue;
      const baseToken=raw.slice(prefix.length),baseAlias=aliases.get(baseToken),base=atomicUnits.get(baseAlias||baseToken);
      if(!base||!PREFIXABLE.has(base.symbol)||base.offset!==0)continue;
      return Object.freeze({symbol:`${prefix==='μ'?'µ':prefix}${base.symbol}`,dimension:base.dimension,dimensionKey:base.dimensionKey,vector:base.vector,scale:factor*base.scale,offset:0,affine:true});
    }
    return null;
  }
  function parseFactor(value){
    const match=String(value||'').match(/^([^\^]+?)(?:\^([+-]?\d+))?$/);if(!match)return null;
    const unit=resolveAtomic(match[1]),power=Number(match[2]??1);if(!unit||!Number.isInteger(power)||Math.abs(power)>12)return null;
    return {unit,power};
  }
  function resolveUnit(value){
    const expression=normalizeExpression(value);if(!expression)return null;
    const direct=resolveAtomic(expression);if(direct)return Object.freeze({...direct,input:cleanText(value),canonical:direct.symbol,known:true});
    if(/[()]/.test(expression))return null;
    const vectorValue=zero();let scale=1,denominator=false,seen=0;const canonical=[];
    const sections=expression.split('/');
    for(let sectionIndex=0;sectionIndex<sections.length;sectionIndex++){
      const section=sections[sectionIndex];if(!section)return null;if(sectionIndex>0)denominator=true;
      for(const rawFactor of section.split('*')){
        const factor=parseFactor(rawFactor);if(!factor||factor.unit.offset!==0)return null;
        const signedPower=factor.power*(denominator?-1:1);seen++;
        for(let i=0;i<vectorValue.length;i++)vectorValue[i]+=factor.unit.vector[i]*signedPower;
        scale*=Math.pow(factor.unit.scale,signedPower);
        canonical.push(`${denominator?'/':'*'}${factor.unit.symbol}${Math.abs(factor.power)===1?'':`^${factor.power}`}`);
      }
    }
    if(!seen||!Number.isFinite(scale)||scale<=0)return null;
    const key=keyOf(vectorValue),dim=dimensionByKey.get(key);
    return Object.freeze({symbol:expression,canonical:canonical.join('').replace(/^\*/,''),dimension:dim?.id||`si:${key}`,dimensionKey:key,vector:Object.freeze(vectorValue),scale,offset:0,affine:true,input:cleanText(value),known:true});
  }
  function normalizeDimension(value){
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      if(Array.isArray(value.vector)&&value.vector.length===BASES.length&&value.vector.every(Number.isInteger)){
        const values=Object.freeze(value.vector.map(Number)),key=keyOf(values),known=dimensionByKey.get(key);return Object.freeze({id:known?.id||`si:${key}`,vector:values,key,known:true});
      }
      if(value.id!==undefined)return normalizeDimension(value.id);
    }
    const raw=cleanText(value);if(!raw)return null;const id=DIMENSION_ALIASES[raw]||raw;
    if(dimensions.has(id))return dimensions.get(id);
    if(/^si:/.test(id)){
      const body=id.slice(3),values=zero();if(body==='1')return dimensions.get('dimensionless');
      for(const token of body.split('.')){const match=token.match(/^(L|M|T|I|Th|N|J)(-?\d+)$/);if(!match)return null;values[BASES.indexOf(match[1])]=Number(match[2]);}
      return Object.freeze({id,key:keyOf(values),vector:Object.freeze(values),known:true});
    }
    return null;
  }
  function axis(value={}){
    const source=typeof value==='string'?{unit:value}:(value&&typeof value==='object'?value:{}),rawUnit=cleanText(source.unit),rawDimension=source.dimension===undefined?'':source.dimension;
    let unit=resolveUnit(rawUnit),dimension=normalizeDimension(rawDimension),reason='';
    if(rawDimension!==''&&!dimension)reason='unknown-dimension';
    if(!unit&&rawUnit)reason=reason||'unknown-unit';
    if(!unit&&!rawUnit&&dimension?.id==='dimensionless')unit=resolveUnit('1');
    if(unit&&dimension&&!sameVector(unit.vector,dimension.vector))reason='dimension-unit-conflict';
    if(!dimension&&unit)dimension=Object.freeze({id:unit.dimension,vector:unit.vector,key:unit.dimensionKey,known:true});
    if(!dimension)reason=reason||'unknown-dimension';
    if(!unit)reason=reason||'unknown-unit';
    return Object.freeze({
      known:!reason,reason,dimension:dimension?.id||'',dimensionKey:dimension?.key||'',unit:unit?.canonical||'',unitSymbol:unit?.symbol||'',
      scale:unit?.scale,offset:unit?.offset,quantity:cleanText(source.quantity),name:cleanText(source.name),role:cleanText(source.role)
    });
  }
  function column(column={}){
    const source=column&&typeof column==='object'?column:{};
    return axis({name:source.name||source.key||'',unit:source.unit||'',dimension:source.dimension||source.metadata?.dimension||'',quantity:source.quantity||source.metadata?.quantity||'',role:source.role||''});
  }
  function artifactAxis(artifact={},axisName='x'){
    const source=artifact&&typeof artifact==='object'?artifact:{},raw=cleanText(axisName).toLowerCase();
    const key=raw==='z'||raw==='value'?'value':raw==='y'?'y':'x';
    return axis({name:source[`${key}Name`]||key,unit:source[`${key}Unit`]||'',dimension:source[`${key}Dimension`]||source.metadata?.[`${key}Dimension`]||'',quantity:source[`${key}Quantity`]||source.metadata?.[`${key}Quantity`]||'',role:key});
  }
  function compatibility(source,target){
    const from=axis(source),to=axis(target);
    if(!from.known)return Object.freeze({compatible:false,reason:from.reason||'unknown-source-axis',source:from,target:to});
    if(!to.known)return Object.freeze({compatible:false,reason:to.reason||'unknown-target-axis',source:from,target:to});
    if(from.dimensionKey!==to.dimensionKey)return Object.freeze({compatible:false,reason:'dimension-mismatch',source:from,target:to});
    const scale=Number(from.scale)/Number(to.scale),offset=(Number(from.offset)-Number(to.offset))/Number(to.scale);
    if(!Number.isFinite(scale)||!Number.isFinite(offset))return Object.freeze({compatible:false,reason:'non-convertible-unit',source:from,target:to});
    return Object.freeze({compatible:true,reason:'compatible',dimension:from.dimension,source:from,target:to,conversion:Object.freeze({scale,offset,identity:scale===1&&offset===0})});
  }
  function compatible(source,target){return compatibility(source,target).compatible;}
  function convert(value,fromUnit,toUnit){
    const decision=compatibility({unit:fromUnit},{unit:toUnit});if(!decision.compatible)throw new Error(`Incompatible scientific units: ${decision.reason}`);
    const number=Number(value);if(!Number.isFinite(number))throw new TypeError('Scientific unit conversion requires a finite number.');
    return number*decision.conversion.scale+decision.conversion.offset;
  }
  function convertAxisValue(value,source,target){
    const decision=compatibility(source,target);if(!decision.compatible)throw new Error(`Incompatible scientific axes: ${decision.reason}`);
    const number=Number(value);if(!Number.isFinite(number))throw new TypeError('Scientific axis conversion requires a finite number.');
    return number*decision.conversion.scale+decision.conversion.offset;
  }
  function convertAxisRange(range,source,target){
    if(!Array.isArray(range)||range.length!==2)throw new TypeError('Scientific axis range must contain exactly two values.');
    return Object.freeze(range.map(value=>convertAxisValue(value,source,target)));
  }
  function describeUnit(value){const row=resolveUnit(value);return row?Object.freeze({...row,vector:Object.freeze([...row.vector])}):null;}
  function describeDimension(value){const row=normalizeDimension(value);return row?Object.freeze({...row,vector:Object.freeze([...row.vector])}):null;}

  return Object.freeze({
    version:VERSION,
    bases:BASES,
    axis,
    column,
    artifactAxis,
    unit:describeUnit,
    dimension:describeDimension,
    normalizeUnit:value=>resolveUnit(value)?.canonical||'',
    normalizeDimension:value=>normalizeDimension(value)?.id||'',
    compatibility,
    compatible,
    convert,
    convertAxisValue,
    convertAxisRange
  });
});
