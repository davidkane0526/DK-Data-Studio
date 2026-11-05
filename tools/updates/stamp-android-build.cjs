#!/usr/bin/env node
'use strict';
// Keep Android versionName equal to the stable application version.
// Only versionCode changes per Actions run so a manually downloaded APK can
// replace an older APK with the same Vx.y.z app version.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const run=Number(process.env.GITHUB_RUN_NUMBER||'');
if(!Number.isSafeInteger(run)||run<1||run>1000000)
  throw Error('GITHUB_RUN_NUMBER must be an integer between 1 and 1000000');
const source=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const match=/^(\d+)\.(\d+)\.(\d+)$/.exec(source);
if(!match)throw Error('Invalid source application version: '+source);
const version=source;
const versionCode=100000+run;
if(process.argv.includes('--print')){process.stdout.write(version);process.exit(0);}
const appFile=path.join(root,'mobile','app.json');
const app=JSON.parse(fs.readFileSync(appFile,'utf8'));
if(app.expo?.android?.package!=='com.dk.datastudio')throw Error('Unexpected Android app identity');
app.expo.version=version;
app.expo.android.versionCode=versionCode;
fs.writeFileSync(appFile,JSON.stringify(app,null,2)+'\n');
const packFile=path.join(root,'mobile','package.json');
const pack=JSON.parse(fs.readFileSync(packFile,'utf8'));
pack.version=version;
fs.writeFileSync(packFile,JSON.stringify(pack,null,2)+'\n');
if(process.env.GITHUB_ENV)
  fs.appendFileSync(process.env.GITHUB_ENV,
    'DKDS_ANDROID_APP_VERSION='+version+'\n'+
    'DKDS_ANDROID_VERSION_CODE='+versionCode+'\n');
console.log('Stamped DKDS Android app version V'+version+' (versionCode '+versionCode+')');
