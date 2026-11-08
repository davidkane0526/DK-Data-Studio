'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const text=p=>fs.readFileSync(path.join(root,p),'utf8');
cp.execFileSync(process.execPath,['tools/4200a-generate-brand-icons.cjs'],{cwd:root,stdio:'pipe'});
const icon=fs.readFileSync(path.join(root,'build/icon.ico'));
assert.equal(icon.readUInt16LE(2),1,'legacy Windows ICO file');
assert.equal(icon.readUInt16LE(4),7,'16/24/32/48/64/128/256 Windows icon frames');
const sizes=[16,24,32,48,64,128,256];
for(let i=0;i<7;i++){
 const pos=6+16*i,size=icon[pos]||256,len=icon.readUInt32LE(pos+8),offset=icon.readUInt32LE(pos+12);
 assert.equal(size,sizes[i]);
 assert.equal(icon.subarray(offset,offset+8).toString('hex'),'89504e470d0a1a0a');
 assert.ok(len>50);
}
for(const [density,width] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
 for(const suffix of ['ic_launcher.png','ic_launcher_round.png']){
  const file=fs.readFileSync(path.join(root,'android4200a/app/src/main/res','mipmap-'+density,suffix));
  assert.equal(file.readUInt32BE(16),width);
  assert.equal(file.readUInt32BE(20),width);
  assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
}
const win=text('desktop/4200a-fspro-main.cjs');
const pack=text('scripts/4200a/stage-windows-preview.cjs');
const gradle=text('android4200a/app/build.gradle');
const manifest=text('android4200a/app/src/main/AndroidManifest.xml');
const preload=text('desktop/4200a-fspro-preload.cjs');
const html=text('src/4200a-fspro/index.html');
assert.match(win,/app\.setAppUserModelId\('studio\.dk\.test'\)/);
assert.match(win,/frame:false/);
assert.match(win,/build\/icon\.ico/);
assert.match(win,/dkts:4200a:window/);
assert.match(win,/event\.senderFrame!==win\.webContents\.mainFrame/);
assert.match(pack,/const native='0\.3\.13'/);
assert.match(pack,/icon:'build\/icon\.ico'/);
assert.match(pack,/productName:'DK Test Studio'/);
assert.doesNotMatch(pack,/signAndEditExecutable:false/,'allow Electron Builder to stamp Windows resources');
assert.match(gradle,/versionName '0\.3\.13'/);
assert.match(gradle,/versionCode 24/);
assert.match(manifest,/android:icon="@mipmap\/ic_launcher"/);
assert.match(manifest,/android:roundIcon="@mipmap\/ic_launcher_round"/);
assert.match(preload,/DKTSWindow/);
assert.match(html,/fs-window-actions/);
assert.match(html,/fs-version-badge/);
assert.match(html,/fs-language-switch/);
assert.doesNotMatch(html,/id="fs-main-menu"/);
assert.match(html,/class="fs-title-actions"/);
assert.match(html,/id="fs-plot-layout"/);
assert.match(html,/id="fs-instrument-settings"/);
assert.ok(html.indexOf('<footer class="fs-status"')<html.indexOf('id="fs-language-switch"'));
assert.match(html,/src="numeric-keypad.js"/);
assert.match(html,/src="ui-controls.js"/);
assert.ok(html.indexOf('</nav>')<html.indexOf('</header>'));
console.log('4200A legacy icon and titlebar: 7 Windows ICO sizes, 10 Android mipmaps, V0.3.13, win taskbar, frameless IPC');
