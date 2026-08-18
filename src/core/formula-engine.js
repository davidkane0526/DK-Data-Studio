(() => {
  const D=window.DKDSData;
  const FUNCTIONS={
    abs:Math.abs,sqrt:Math.sqrt,exp:Math.exp,ln:Math.log,log:Math.log,log10:Math.log10,
    sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,
    floor:Math.floor,ceil:Math.ceil,round:Math.round,sign:Math.sign,
    min:Math.min,max:Math.max,pow:Math.pow,
    clamp:(x,a,b)=>Math.min(Math.max(x,a),b),
    ifelse:(condition,a,b)=>condition?a:b,
    isfinite:x=>Number.isFinite(x)?1:0
  };
  const CONSTANTS={PI:Math.PI,E:Math.E,NaN:NaN};

  function tokenize(source){
    const s=String(source||'');const tokens=[];let i=0;
    const isStart=c=>/[A-Za-z_]/.test(c)||(/[^\x00-\x7F]/.test(c)&&!/[\s\[\](){}+\-*\/%^<>=!&|,]/.test(c));
    const isBody=c=>/[A-Za-z0-9_.]/.test(c)||(/[^\x00-\x7F]/.test(c)&&!/[\s\[\](){}+\-*\/%^<>=!&|,]/.test(c));
    while(i<s.length){
      const c=s[i];
      if(/\s/.test(c)){i++;continue;}
      if(c==='['){let j=i+1,name='';while(j<s.length&&s[j]!==']'){name+=s[j++];}if(j>=s.length)throw new Error('公式中的 [列名] 缺少 ]。');tokens.push({type:'column',value:name.trim(),pos:i});i=j+1;continue;}
      const num=s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if(num){tokens.push({type:'number',value:Number(num[0]),pos:i});i+=num[0].length;continue;}
      if(isStart(c)){let j=i+1;while(j<s.length&&isBody(s[j]))j++;tokens.push({type:'identifier',value:s.slice(i,j),pos:i});i=j;continue;}
      const two=s.slice(i,i+2);if(['<=','>=','==','!=','&&','||'].includes(two)){tokens.push({type:'op',value:two,pos:i});i+=2;continue;}
      if('+-*/%^<>()!,'.includes(c)){tokens.push({type:'op',value:c,pos:i});i++;continue;}
      throw new Error(`无法识别公式字符“${c}”（位置 ${i+1}）。`);
    }
    tokens.push({type:'eof',value:'',pos:s.length});return tokens;
  }

  const PRECEDENCE={'||':1,'&&':2,'==':3,'!=':3,'<':4,'<=':4,'>':4,'>=':4,'+':5,'-':5,'*':6,'/':6,'%':6,'^':7};
  function parse(source){
    const tokens=tokenize(source);let p=0;const peek=()=>tokens[p],take=()=>tokens[p++];
    function primary(){
      const t=take();
      if(t.type==='number')return {type:'number',value:t.value};
      if(t.type==='column')return {type:'column',name:t.value};
      if(t.type==='identifier'){
        if(peek().value==='('){
          take();const args=[];
          if(peek().value!==')')while(true){args.push(expr(0));if(peek().value===','){take();continue;}break;}
          if(take().value!==')')throw new Error(`函数 ${t.value} 缺少 )。`);
          return {type:'call',name:t.value,args};
        }
        return {type:'identifier',name:t.value};
      }
      if(t.value==='('){const e=expr(0);if(take().value!==')')throw new Error('公式缺少 )。');return e;}
      if(t.value==='+'||t.value==='-'||t.value==='!')return {type:'unary',op:t.value,arg:expr(PRECEDENCE['^'])};
      throw new Error(`公式在位置 ${t.pos+1} 缺少数值、列名或函数。`);
    }
    function expr(minPrec){
      let left=primary();
      while(true){
        const t=peek(),prec=PRECEDENCE[t.value];if(prec===undefined||prec<minPrec)break;take();
        const right=expr(t.value==='^'?prec:prec+1);left={type:'binary',op:t.value,left,right};
      }
      return left;
    }
    const ast=expr(0);if(peek().type!=='eof')throw new Error(`公式位置 ${peek().pos+1} 存在多余内容。`);return ast;
  }

  function collectReferences(ast,out=new Set()){
    if(!ast)return out;if(ast.type==='column'||(ast.type==='identifier'&&!Object.prototype.hasOwnProperty.call(CONSTANTS,ast.name)))out.add(ast.name);
    if(ast.arg)collectReferences(ast.arg,out);if(ast.left)collectReferences(ast.left,out);if(ast.right)collectReferences(ast.right,out);
    for(const a of ast.args||[])collectReferences(a,out);return out;
  }

  function compile(source,table=null){
    const ast=parse(source);const colMap=new Map();
    for(const c of table?.columns||[]){colMap.set(c.key,c);colMap.set(c.name,c);colMap.set(c.id,c);}
    function evalNode(node,rowIndex,rowObject){
      if(node.type==='number')return node.value;
      if(node.type==='column'){
        const c=colMap.get(node.name);if(!c)throw new Error(`未找到列“${node.name}”。`);return c.values[rowIndex];
      }
      if(node.type==='identifier'){
        if(Object.prototype.hasOwnProperty.call(CONSTANTS,node.name))return CONSTANTS[node.name];
        const c=colMap.get(node.name);if(c)return c.values[rowIndex];
        if(rowObject&&Object.prototype.hasOwnProperty.call(rowObject,node.name))return rowObject[node.name];
        throw new Error(`未定义变量或列“${node.name}”。`);
      }
      if(node.type==='unary'){
        const a=evalNode(node.arg,rowIndex,rowObject);if(node.op==='+')return +a;if(node.op==='-')return -a;if(node.op==='!')return !a?1:0;
      }
      if(node.type==='call'){
        const fn=FUNCTIONS[node.name.toLowerCase()];if(!fn)throw new Error(`不支持函数 ${node.name}()。`);
        return fn(...node.args.map(a=>evalNode(a,rowIndex,rowObject)));
      }
      if(node.type==='binary'){
        const a=evalNode(node.left,rowIndex,rowObject);if(node.op==='&&'&&!a)return 0;if(node.op==='||'&&a)return 1;
        const b=evalNode(node.right,rowIndex,rowObject);
        switch(node.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '%':return a%b;case '^':return Math.pow(a,b);case '<':return a<b?1:0;case '<=':return a<=b?1:0;case '>':return a>b?1:0;case '>=':return a>=b?1:0;case '==':return a==b?1:0;case '!=':return a!=b?1:0;case '&&':return a&&b?1:0;case '||':return a||b?1:0;}
      }
      return NaN;
    }
    return {source:String(source||''),ast,references:[...collectReferences(ast)],evaluate:(rowIndex,rowObject)=>evalNode(ast,rowIndex,rowObject)};
  }

  function deriveColumn(table,{name,key=null,formula,unit='',role='',replace=false,providerId='core.formula',pluginId='builtin.data-center',version='1.0.0'}={}){
    if(table?.kind!=='data.table')throw new Error('公式派生列需要 DataTable 输入。');
    const columnName=String(name||'Derived').trim();if(!columnName)throw new Error('派生列名称不能为空。');
    const columnKey=String(key||columnName).trim();const compiled=compile(formula,table);const values=[];let nonFinite=0;
    for(let r=0;r<table.rowCount;r++){let v;try{v=Number(compiled.evaluate(r));}catch(err){err.message=`第 ${r+1} 行：${err.message}`;throw err;}if(!Number.isFinite(v))nonFinite++;values.push(v);}
    const out=D.derive(table,{name:`${table.name} · ${columnName}`,metadata:{derivedFrom:table.id},patch:{}},{type:'formula',label:`Derived column: ${columnName}`,providerId,pluginId,version,parameters:{name:columnName,key:columnKey,formula,unit,role,replace},note:nonFinite?`${nonFinite} values are non-finite.`:''});
    const existing=out.columns.findIndex(c=>c.key===columnKey||c.name===columnName);
    const col={id:`col:${D.hashString(`${out.id}:${columnKey}`)}`,key:columnKey,name:columnName,unit:String(unit||''),dtype:'number',role:String(role||''),values,metadata:{formula:String(formula),references:compiled.references}};
    if(existing>=0){if(!replace)throw new Error(`列“${columnKey}”已存在；请选择替换或使用新名称。`);out.columns.splice(existing,1,col);}else out.columns.push(col);
    out.rowCount=table.rowCount;return {table:out,column:col,nonFinite,references:compiled.references};
  }

  window.DKDSFormula={FUNCTIONS:Object.keys(FUNCTIONS),CONSTANTS:Object.keys(CONSTANTS),tokenize,parse,compile,collectReferences,deriveColumn};
})();
