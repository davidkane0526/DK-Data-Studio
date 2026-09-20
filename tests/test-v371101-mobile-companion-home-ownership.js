'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const versionNumber=value=>String(value).split('.').reduce((n,part)=>n*1000+(Number(part)||0),0);

const pkg=json('package.json'),app=json('mobile/app.json');
assert(versionNumber(pkg.version)>=versionNumber('3.71.101'));
assert.strictEqual(app.expo.version,pkg.version);

// Resolve Core-internal absolute module aliases exactly as the bundled/runtime build does.
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);
require('module').Module._initPaths();
// Load the real Presenter class with only the infrastructure globals it needs.
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(){},setToken(){},remove(){}};
global.window=global.window||{addEventListener(){},removeEventListener(){}};
global.document=global.document||{documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:()=>true}}};
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface.js');
const presenter=new MobileWebSurfacePresenter();
const node=(role,placement,source='user',extra=[])=>({
  dataset:{dkdsPresentationRole:role,placement,dkdsPortablePlacementSource:source},
  classList:{contains:name=>name==='dkds-portable-view'||extra.includes(name)}
});

// Regression: old persisted user:right / user:bottom records describe the same
// visible semantic home as a fresh default. They must not select a second Mobile
// height contract merely because the user moved the panel sometime in the past.
assert.strictEqual(presenter.portableOwnsPlacement(node('inspector','right','user',['is-docked'])),false,'user:right Inspector must return to the canonical companion-right lane.');
assert.strictEqual(presenter.portableOwnsPlacement(node('scientific-secondary','bottom','user',['is-docked'])),false,'user:bottom scientific-secondary must return to the canonical companion-bottom lane.');
assert.strictEqual(presenter.portableOwnsPlacement(node('inspector','home','user')),false,'Inspector home must remain semantic Presenter geometry.');
assert.strictEqual(presenter.portableOwnsPlacement(node('scientific-secondary','home','user')),false,'Scientific-secondary home must remain semantic Presenter geometry.');

// Genuine alternate user intent is still respected. This is not a blanket reset
// of PortableView freedom; only semantic-home ownership is normalized.
assert.strictEqual(presenter.portableOwnsPlacement(node('inspector','bottom','user',['is-docked'])),true,'Inspector explicitly moved to bottom must remain PortableView-owned.');
assert.strictEqual(presenter.portableOwnsPlacement(node('scientific-secondary','right','user',['is-docked'])),true,'Scientific-secondary explicitly moved to right must remain PortableView-owned.');
assert.strictEqual(presenter.portableOwnsPlacement(node('inspector','global','user',['is-global-floating'])),true,'Global floating Inspector must remain PortableView-owned.');
assert.strictEqual(presenter.portableOwnsPlacement(node('scientific-secondary','float','user',['is-floating'])),true,'Floating scientific-secondary must remain PortableView-owned.');

const source=read('src/core/ui/modules/presentation/mobile-web-surface.js');
assert(!/resonance-workbench|ter-analysis|pulse-sampler-tool|transfer-vth/i.test(source),'Home-lane ownership repair must remain domain-blind.');
assert(source.includes('Ownership follows the effective placement'),'Presenter must document effective-placement ownership instead of gesture-history ownership.');

console.log('v3.71.101 Mobile companion semantic-home ownership PASS.');
