#!/usr/bin/env node
'use strict';
// Export a source-only, dependency-audited 4200 bundle for eventual standalone migration.
// This does NOT produce a working independent APK or EXE.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const manifestPath='src/plugins/keithley-4200/extraction-manifest.json';
const manifest=JSON.parse(fs.readFileSync(path.join(root,manifestPath),'utf8'));
const groups=['coreIndependentModules','embeddedPlugin','desktopTransportAdapters','androidTransportAdapters','standaloneReadOnlyCli'];
const files=[manifestPath,'src/plugins/keithley-4200/EXTRACTION.md',...groups.flatMap(key=>{
  if(!Array.isArray(manifest[key]))throw Error('Missing extraction group '+key);
  return manifest[key];
})];
const safe=(p)=>typeof p==='string'&&p.length>0&&p===p.replaceAll('\\','/')&&
  !path.posix.isAbsolute(p)&&!p.split('/').includes('..')&&!p.includes('\0');
const unique=[...new Set(files)];
for(const p of unique){
  if(!safe(p))throw Error('Unsafe extraction path: '+p);
  const source=path.join(root,p);
  if(!fs.existsSync(source)||!fs.lstatSync(source).isFile())throw Error('Regular source file is missing: '+p);
  if(!fs.realpathSync(source).startsWith(root+path.sep))throw Error('Source escapes repo: '+p);
}
const argIndex=process.argv.indexOf('--output');
const dryRun=process.argv.includes('--verify');
if(argIndex<0&&!dryRun)throw Error('Specify --verify or --output PATH');
if(argIndex>=0){
  const out=path.resolve(process.argv[argIndex+1]||'');
  if(!out||out===root||out.startsWith(root+path.sep))throw Error('Output must be a separate external empty folder.');
  if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Output directory must be empty.');
  for(const p of unique){
    const dest=path.join(out,p);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(path.join(root,p),dest);
  }
}
console.log('4200 source-only extraction verified: '+unique.length+' files'+(argIndex>=0?'; copied to '+process.argv[argIndex+1]:''));
console.log('Requires standalone host adapters and further real-device verification; not a distributable app.');
