const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'desktop','main.js'),'utf8');
const auxiliary=fs.readFileSync(path.join(root,'desktop','main-modules','auxiliary-window-runtime.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

const closeStart=auxiliary.indexOf('function closeAuxiliaryWindowForReal(win)');
const closeEnd=auxiliary.indexOf('function waitForAuxiliaryWindowClosed',closeStart);
assert(closeStart>=0&&closeEnd>closeStart,'Dedicated close helpers must exist.');
const closeBody=auxiliary.slice(closeStart,closeEnd);
assert(closeBody.indexOf('removeAuxiliaryWindowReferences(win);')>=0,'Real close must synchronously evict the BrowserWindow from the reuse registry before win.close().');
assert(closeBody.indexOf('removeAuxiliaryWindowReferences(win);')<closeBody.indexOf('win.close();'),'Reuse registry eviction must happen before asynchronous BrowserWindow.close().');
const diagClose=auxiliary.indexOf('closeAuxiliaryWindowForReal(win);');
const diagWait=auxiliary.indexOf('await waitForAuxiliaryWindowClosed(win,1800);',diagClose);
assert(diagClose>=0&&diagWait>diagClose,'Back-to-back TOP diagnostics must wait for the previous renderer to fully close.');
console.log('v3.61.65 TOP window reuse-race regression passed.');
