'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const walk=(dir,out=[])=>{if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&e.name.endsWith('.css'))out.push(p);}return out;};

const core=read('src/core.css');
const motion=read('src/styles/motion/recipes.css');
const expected='@layer dkds.foundation, dkds.plugin, dkds.plugin-platform, dkds.structure, dkds.presentation, dkds.theme, dkds.motion, dkds.platform, dkds.window, dkds.utility;';
assert(core.startsWith(expected),'Motion must be an explicit cascade layer between Theme tokens and Platform configuration.');
assert(core.includes('@import url("./styles/motion/recipes.css") layer(dkds.motion);'),'Core must load exactly one authored Motion Recipes entry.');
assert(motion.includes('Temporal behavior has one authored owner'),'Motion owner contract must be explicit.');
assert(motion.includes('@media(prefers-reduced-motion:reduce)'),'Motion recipes must own reduced-motion behavior.');
assert(motion.includes('[data-dkds-motion-role="control"]')&&motion.includes('[data-dkds-motion-role="interactive-card"]'),'Canonical temporal behavior must consume semantic Motion roles rather than feature selectors.');
assert(motion.includes('--dkds-motion-control-duration:var(--dkui-motion-fast)'),'Motion duration must be configurable through semantic tokens.');
assert(!/(?:\.ter-|\.pulse-|\.dc-|\.respar-|\.reswin-|\.resonance-)/i.test(motion),'Core Motion must stay domain-blind.');

const temporal=/(?:^|[;{])\s*(?:transition(?:-[a-z-]+)?|animation(?:-[a-z-]+)?)\s*:/mi;
for(const file of walk(path.join(root,'src'))){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  if(rel==='src/styles/motion/recipes.css')continue;
  const text=fs.readFileSync(file,'utf8');
  assert(!temporal.test(text)&&!/@keyframes\b/i.test(text),`${rel} must not own transition/animation/keyframes.`);
}
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
const pulseRuntime=read('src/plugins/pulse-analysis/analysis-service.js');
assert(!temporal.test(pulseCss)&&!/@keyframes\b/i.test(pulseCss),'Pulse plugin must not own motion paint.');
assert(pulseRuntime.includes("dkdsMotion:'interactive-card'"),'Pulse dynamic rows may declare the generic interactive-card semantic hint.');
const components=read('src/core/ui/component-runtime.js');
assert(components.includes("[data-dkds-motion=\"interactive-card\"]")&&components.includes("el.dataset.dkdsMotionRole='interactive-card'"),'Component Runtime must project legacy semantic motion hints into the canonical Motion role.');
assert(components.includes("toolbarAction:'control'")&&components.includes("field:'field'"),'Canonical actions and fields must receive Motion roles from their semantic identities.');
const debug=read('src/core/theme/debug-runtime.js');
assert(debug.includes("if(value.includes('/styles/motion/'))return'Core Motion'"),'Style Trace must identify the Motion owner explicitly.');
const validator=read('scripts/validate-styles.js');
assert(validator.includes('Temporal CSS declarations belong only to ${motionOwner}'),'Style build must reject temporal declarations outside Motion Recipes.');
console.log('v3.68.0 Motion single-owner architecture PASS.');
