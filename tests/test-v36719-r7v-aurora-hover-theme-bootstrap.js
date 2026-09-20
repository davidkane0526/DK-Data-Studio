
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const current=String(pkg.version||'0.0.0').split('.').map(Number);
assert(current[0]>3||(current[0]===3&&(current[1]>67||(current[1]===67&&current[2]>=19))),'R7V requires application 3.67.19 or newer.');
const index=read('src/index.html');
const runtime=read('src/core/theme/runtime.js');
const component=read('src/styles/theme/component-appearance.css');
const changelog=read('CHANGELOG.md');

assert(component.includes('--dkds-ca-action-surface-hover:var(--dkui-component-toolbar-group-surface-hover'),'Segmented child hover must resolve from the ToolbarGroup state contract.');
assert(component.includes('--dkds-ca-action-surface-active:var(--dkui-component-toolbar-group-surface-active'),'Segmented child active fill must resolve from the ToolbarGroup state contract.');
assert(component.includes('--dkds-ca-action-surface-selected:var(--dkui-component-toolbar-group-surface-selected'),'Segmented child selected fill must resolve from the ToolbarGroup state contract.');
assert(component.includes('--dkds-ca-action-border-hover:transparent;')&&component.includes('--dkds-ca-action-shadow-hover:none;'),'Segmented transient states must not regain independent edge/depth paint.');

const bootScript=index.indexOf("const BOOT_STATE_KEY='dkds.theme-boot.v1'");
const coreCss=index.indexOf('<link rel="stylesheet" href="core.css"');
assert(bootScript>0&&coreCss>bootScript,'Saved Theme state must be restored in <head> before the authored stylesheet is loaded.');
assert(index.includes("const PROFILE_KEY='dkds.theme-profile.v1';")&&index.includes('parsed.theme===theme&&parsed.profile===profile'),'Boot snapshot must be applied only when both saved mode and saved profile identity still match.');
assert(runtime.includes("const BOOT_STATE_KEY='dkds.theme-boot.v1';")&&runtime.includes('function buildBootState(theme=current)')&&runtime.includes('function persistBootState(theme=current)'),'Theme runtime must own snapshot creation/persistence.');
assert(runtime.includes('const canPreservePendingBoot=theme=>!!pendingProfile'),'Runtime must recognize a restored pending Theme profile during startup.');
assert(runtime.includes('if(!canPreservePendingBoot(next)){applyProfileTokens(next);refreshVisualComposition();}'),'Core must not overwrite a valid restored profile snapshot with builtin.default while the startup-critical Theme plugin is pending.');
assert(runtime.includes("if(!pendingProfile||activeProfile===preferredProfile)persistBootState(theme);"),'Only the resolved preferred profile may replace the persisted first-frame snapshot.');
assert(runtime.includes('resolved:Object.freeze({tokens:resolved.tokens')&&runtime.includes('recipes:computeRecipePolicy(profile,mode)')&&runtime.includes('recipeContexts:profile?.recipes?.contexts'),'Boot snapshot must persist resolved material/appearance plus recipe policy, not CSS variables alone.');
assert(runtime.includes('function pendingBootMatches')&&runtime.includes('bootState?.recipes')&&runtime.includes('const resolved=bootState.resolved||{}'),'Pending Theme composition must consume the cached resolved profile before the selected Theme plugin registers.');
assert(changelog.includes(pkg.version),'Current patch identity must remain explicit in CHANGELOG; obsolete visual-freeze labels are not runtime gates.');
console.log('v3.67.19 R7V Aurora segmented hover + first-frame Theme bootstrap PASS.');
