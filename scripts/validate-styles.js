'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const authored=[];
function collect(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())collect(p);else if(e.isFile()&&e.name.endsWith('.css'))authored.push(p);}}
collect(path.join(root,'src','styles'));
for(const rel of ['src/mobile.css','src/plugin-window/style.css']){const p=path.join(root,rel);if(fs.existsSync(p))authored.push(p);}
const plugins=path.join(root,'src','plugins');
if(fs.existsSync(plugins))for(const e of fs.readdirSync(plugins,{withFileTypes:true})){if(!e.isDirectory())continue;const p=path.join(plugins,e.name,'plugin.css');if(fs.existsSync(p))authored.push(p);}
function structuralBalance(text,file){
  let depth=0,quote='',comment=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
    if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'){depth--;if(depth<0)throw new Error(`${file}: unexpected }`);}
  }
  if(comment)throw new Error(`${file}: unterminated comment`);
  if(quote)throw new Error(`${file}: unterminated string`);
  if(depth!==0)throw new Error(`${file}: unbalanced braces (${depth})`);
}
const violations=[];
// CSS override debt must not hide inside runtime template strings.
const runtimeText=[];
for(const base of ['src/core','src/app','src/plugins']){
  const dir=path.join(root,base);if(!fs.existsSync(dir))continue;
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&/\.(?:js|inc)$/.test(e.name))runtimeText.push(p);}};walk(dir);
}
for(const file of runtimeText){const text=fs.readFileSync(file,'utf8');if(/!important\b/i.test(text))violations.push(`${path.relative(root,file)}: !important is forbidden in runtime-injected CSS.`);if(/setProperty\([^)]*['\"]important['\"]/i.test(text))violations.push(`${path.relative(root,file)}: inline style priority 'important' is forbidden; layered CSS and normal inline state must suffice.`);}
for(const file of authored){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const css=fs.readFileSync(file,'utf8');
  try{structuralBalance(css,rel);}catch(err){violations.push(err.message);}
  if(/!important\b/i.test(css))violations.push(`${rel}: !important is forbidden; use cascade ownership layers.`);
}
for(const legacy of ['src/styles/base','src/styles/modern'])if(fs.existsSync(path.join(root,legacy)))violations.push(`${legacy}: legacy specificity directory must not return.`);
const coreCss=authored.filter(p=>p.includes(`${path.sep}src${path.sep}styles${path.sep}`));
const pluginIdentity=/(?:\.ter-|\.pulse-|\.dc-|\.respar-|\.reswin-|\.resonance-|#ter\w*|#pulse\w*|#resonance\w*)/i;
for(const file of coreCss){const css=fs.readFileSync(file,'utf8');if(pluginIdentity.test(css))violations.push(`${path.relative(root,file)}: Core CSS contains plugin identity selector.`);}
const entry=fs.readFileSync(path.join(root,'src','core.css'),'utf8');
for(const layer of ['foundation','plugin','structure','presentation','theme','platform','window'])if(!entry.includes(`dkds.${layer}`))violations.push(`src/core.css: missing dkds.${layer} cascade layer.`);
if(violations.length){console.error(violations.join('\n'));process.exit(1);}
console.log(`Style architecture OK: ${authored.length} authored CSS files, 0 !important, layered ownership active.`);
