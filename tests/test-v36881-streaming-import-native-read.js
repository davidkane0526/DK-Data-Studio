'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');

function science(){
  const c={console};c.window=c;c.globalThis=c;vm.createContext(c);
  for(const f of ['src/science/common.js','src/science/import.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
  return c.DKDSScience;
}
(async()=>{
  const S=science();
  const text=['preamble','Vd(V),Id(A),I2(A)',...Array.from({length:1200},(_,i)=>`${i/100},${i*1e-9},${i*2e-9}`),''].join('\n');
  const file={name:'Vg=7.csv',path:'/tmp/Vg=7.csv',text,encoding:'utf-8'};
  const options={...S.defaultImportOptions(),skipRows:1,layout:'sharedX',xCol:0,yCols:[1,2]};
  const inspection=S.inspectDataText(file,options),sync=S.parseFlexibleData(file,options);
  const stream=S.createFlexibleDataStream({...file,text:text.slice(0,4096)},options,inspection);
  const lines=text.split('\n');
  for(let i=0;i<lines.length;i+=37)await stream.pushLines(lines.slice(i,i+37),{startLine:i+1,endLine:Math.min(lines.length,i+37)});
  const streamed=stream.finish({encoding:'utf-8',lineCount:lines.length});
  const compact=v=>v.datasets.map(d=>{const points=Array.isArray(d.points)?d.points:[],columnar=d.columnar||null;return {name:d.name,path:d.path,vg:d.vg,v:columnar?.v||points.map(p=>p.v),i:columnar?.i||points.map(p=>p.i),sourceLine:columnar?.sourceLine||points.map(p=>p.sourceLine),importSpec:d.importSpec};});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(compact(streamed))),JSON.parse(JSON.stringify(compact(sync))),'streaming flexible parse must match full-text parse');

  let active=0,maxActive=0,closed=0,readCalls=0;
  const bytes=Buffer.from(Array.from({length:700000},(_,i)=>String(i%10)).join(''));
  const bridge={
    openDataRead:async()=>({token:'t',name:'big.txt',size:bytes.length,maxChunkBytes:512*1024}),
    readDataChunk:async({offset,length})=>{active++;maxActive=Math.max(maxActive,active);readCalls++;await new Promise(r=>setTimeout(r,3));const part=bytes.subarray(offset,Math.min(bytes.length,offset+length));active--;return {base64:part.toString('base64'),bytesRead:part.length,nextOffset:offset+part.length,eof:offset+part.length>=bytes.length};},
    closeDataRead:async()=>{closed++;return true;}
  };
  const classList={contains:()=>false};
  const context={console,TextDecoder,TextEncoder,Uint8Array,DOMException,AbortController,Blob,URL,atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),navigator:{},document:{documentElement:{classList},body:{classList},baseURI:'file:///app/',currentScript:{src:'file:///app/core/host/io-runtime.js'}},window:{electronAPI:bridge}};
  Object.assign(context.window,{window:context.window,document:context.document,navigator:context.navigator,TextDecoder,TextEncoder,Uint8Array,DOMException,AbortController,Blob,URL,atob:context.atob,btoa:context.btoa});context.globalThis=context.window;
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src','core','host','io-runtime.js'),'utf8'),context,{filename:'io-runtime.js'});
  let consumed=0;const meta=await context.window.DKDSIO.readDataChunks({path:'/big.txt',onChunk:async chunk=>{consumed+=chunk.length;await new Promise(r=>setTimeout(r,2));}});
  assert.strictEqual(consumed,bytes.length);assert.strictEqual(meta.bytesRead,bytes.length);assert(maxActive<=2,`desktop in-flight chunks exceeded 2: ${maxActive}`);assert(readCalls>=3);assert.strictEqual(closed,1);

  const controller=new AbortController();let seen=0;
  await assert.rejects(()=>context.window.DKDSIO.readDataChunks({path:'/big.txt',signal:controller.signal,onChunk:async()=>{seen++;controller.abort('test-cancel');}}),err=>err&&err.name==='AbortError');
  assert(seen===1,'abort must stop consumer after the first delivered chunk');assert.strictEqual(closed,2,'aborted read must close its token session');

  const workbench=fs.readFileSync(path.join(root,'src','app','modules','import-workbench.js'),'utf8');
  const streamRuntime=fs.readFileSync(path.join(root,'src','app','modules','import-stream-runtime.js'),'utf8');
  assert(streamRuntime.includes("typeof provider?.createStreamParser==='function'"),'Import runtime must detect streaming importers.');
  assert(streamRuntime.includes('window.DKDSIO.readDataLines'),'Import runtime must use Core line streaming.');
  assert(workbench.includes('residentSource:true')&&streamRuntime.includes('!item.residentSource'),'Resident/base64 seeds must not be forced through a missing file token.');
  assert(workbench.includes('registerDataDocument')&&!workbench.includes('readDataDocument'),'Android folder import must register SAF URIs and reuse bounded Core reads instead of materializing Base64 files.');
  const flexible=fs.readFileSync(path.join(root,'src','plugins','flexible-import','plugin.js'),'utf8');
  assert(flexible.includes('createStreamParser(file,options,inspection)'),'Flexible Import must implement streaming parser contract.');
  const pulseImport=fs.readFileSync(path.join(root,'src','plugins','pulse-import','plugin.js'),'utf8');assert(pulseImport.includes('createStreamParser(file,options'),'Pulse Import must implement streaming parser contract.');

  const android=fs.readFileSync(path.join(root,'mobile','plugins','withDkdsAndroidNativeHost.js'),'utf8');
  assert(android.includes('data class DataReadSession'),'Android host must keep a native read session.');
  assert(android.includes('openDocumentRead(')&&android.includes('readDocumentReadChunk(')&&android.includes('closeDocumentRead('),'Android native read session methods missing.');
  const chunkBody=android.slice(android.indexOf('@ReactMethod fun readDocumentReadChunk'),android.indexOf('@ReactMethod fun closeDocumentRead'));
  assert(!chunkBody.includes('context.contentResolver.openInputStream(Uri.parse('),'Android sequential chunks must not reopen from the file head for every chunk.');
  const web=fs.readFileSync(path.join(root,'src','web-bridge.js'),'utf8');
  assert(web.includes("nativeCall('openFileRead'")&&web.includes("nativeCall('readFileReadChunk'")&&web.includes("nativeCall('closeFileRead'"),'Mobile Web bridge must use native token sessions.');
  assert(web.includes("nativeCall('registerDocumentUri'")&&!web.includes('readDataDocument:'),'Directory SAF documents must enter the same tokenized file store without a full Base64 bridge.');
  const dts=fs.readFileSync(path.join(root,'sdk','plugin-api.d.ts'),'utf8');
  assert(dts.includes('createStreamParser?:')&&dts.includes('DKDSDataImporterStreamParser'),'SDK must publish the streaming importer contract.');
  console.log(`v3.68.81 streaming import/native read OK: flexible parser parity, Core in-flight<=2 (${maxActive}), cancellation closes tokens, Android keeps sequential native sessions.`);
})().catch(err=>{console.error(err);process.exit(1);});
