#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=require('../package.json');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const versionAtLeast=(value,min)=>{
  const a=String(value||'').split('.').map(Number),b=String(min||'').split('.').map(Number);
  for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x>y)return true;if(x<y)return false;}return true;
};

assert(versionAtLeast(pkg.version,'3.68.1'),`Application version must remain >= 3.68.1, got ${pkg.version}`);

const gate=read('src/core/theme/style-ownership-gate-runtime.js');
const uiRuntime=read('src/core/ui/modules/runtime.js');
const themeDebug=read('src/core/theme/debug-runtime.js');
assert(/const VERSION='1\.8\.0'/.test(gate),'Style Ownership Gate runtime must be 1.8.0.');
assert(!/observeUnauthorizedRuntimeStyles\?\.\(\)/.test(uiRuntime),'Normal UI runtime must not auto-enable document-wide Gate bypass observation.');
assert(/acquireRuntimeAudit\?\.\('theme-inspector'\)/.test(themeDebug),'Theme Inspector must explicitly acquire Gate runtime audit.');
assert(/gateAuditRelease\?\.\(\)/.test(themeDebug),'Theme Inspector must release Gate runtime audit.');

const renderer=read('src/core/theme/material-renderer.js');
const rendererCss=read('src/styles/theme/material-renderer.css');
const jsVersion=(renderer.match(/const VERSION='([^']+)'/)||[])[1]||'';
const cssVersion=(rendererCss.match(/--dkds-material-renderer-version:\s*\"([^\"]+)\"/)||[])[1]||'';
assert(jsVersion&&cssVersion&&jsVersion===cssVersion,`Material Renderer JS/CSS version mismatch: JS=${jsVersion} CSS=${cssVersion}`);
assert(versionAtLeast(jsVersion,'3.10.0'),`Material Renderer must retain Theme Contract 3.10 support, got ${jsVersion}`);
assert(/capabilityCacheHits/.test(renderer)&&/capabilityCacheKey/.test(renderer),'Material Renderer must cache capability probes.');
assert(/invalidateCapabilities\(\)/.test(renderer),'Material Renderer must invalidate capability cache on theme changes.');

const automation=read('src/diagnostics/automation-test-runtime.js');
const automationVisual=read('src/diagnostics/automation-visual-cases.js');
assert(/versionAtLeast\(caps\?\.version,'3\.10\.0'\)/.test(automation),'Windows automation must accept compatible Material Renderer revisions >= 3.10.0.');
assert(/versionAtLeast\(Appearance\?\.version,'3\.0\.0'\)/.test(automationVisual),'Visual automation must accept compatible Component Appearance revisions >= 3.0.0.');
assert(/runtimeAuditEnabled/.test(automationVisual),'Theme performance automation must verify that Gate runtime audit is off on the normal hot path.');
assert(/capabilityCacheHits/.test(automationVisual),'Theme performance automation must verify Material capability-cache reuse.');

const chrome=read('src/app/modules/window-chrome.js');
assert(!/\.title\s*=/.test(chrome),'Window chrome must not reintroduce browser-native title tooltips after Core tooltip normalization.');
assert(/removeAttribute\('title'\)/.test(chrome),'Window chrome must explicitly clear any stale native title tooltip.');

console.log('v3.68.1 Gate performance + Theme runtime recovery PASS: diagnostic-only Gate observer, cached renderer capabilities, coherent Material Renderer version, compatible automation checks, and no late native window tooltip.');
