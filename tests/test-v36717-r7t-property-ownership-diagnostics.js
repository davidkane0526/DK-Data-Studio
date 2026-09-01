const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const schema=read('src/styles/structure/schema-and-plugin-ui.css');
const workbench=read('src/styles/structure/workbench-components.css');
const interaction=read('src/styles/structure/workspace-interaction.css');
const themeContract=read('src/styles/theme/contract.css');
const shellPresentation=read('src/styles/presentation/shell.css');
const dialogPresentation=read('src/styles/presentation/dialogs.css');
const debugRuntime=read('src/core/theme/debug-runtime.js');
const validator=read('scripts/validate-styles.js');

assert(/button:not\(:is\([\s\S]*\.plugin-manager-page button[\s\S]*\.dkds-settings-dialog button[\s\S]*\.dkds-dialog button[\s\S]*\.dkds-scientific-nav-tools>button[\s\S]*\)\)/.test(schema),'Generic button fallback must exclude specialized Core action owners.');
assert(schema.includes(':not(.plugin-manager-page *)'),'Generic field fallback must exclude Plugin Manager fields.');
assert(schema.includes('--dkds-plugin-manager-toolbar-action-height:34px')&&schema.includes('--dkds-plugin-card-action-height:var(--plugin-control-height,32px)'),'Plugin Manager actions must own slot-driven hit geometry.');
assert(workbench.includes('--dkds-settings-header-action-size:28px')&&workbench.includes('--dkds-settings-footer-action-height:31px')&&workbench.includes('--dkds-dialog-action-height:32px'),'Settings/Dialog actions must own explicit hit geometry slots.');

assert(schema.includes('.floating-panel:not(.dkds-portable-view){'),'Legacy FloatingPanel geometry must exclude PortableView.');
assert(workbench.includes('.group-panel:not(.dkds-portable-view){')&&workbench.includes('.inspector-panel:not(.dkds-portable-view){'),'Legacy generic panels must exclude PortableView geometry ownership.');
assert(interaction.includes('.inspector-panel.docked-right:not(.dkds-portable-view){'),'Legacy docked inspector geometry must exclude PortableView.');

assert(themeContract.includes('Standard Core controls are stationary'),'Standard control motion must be centrally owned.');
assert(themeContract.includes(':where(button,.dkds-action-button,.project-tab-close):is(:hover,:active,:focus-visible)'),'Theme Contract must own stationary interaction transform.');
assert(!/button[^{}]*(?:hover|active|focus-visible)[^{]*\{[^}]*transform\s*:/s.test(shellPresentation),'Shell Presentation must not own interactive button transforms.');
assert(!/button[^{}]*(?:hover|active|focus-visible)[^{]*\{[^}]*transform\s*:/s.test(dialogPresentation),'Dialog Presentation must not own interactive button transforms.');

assert(debugRuntime.includes('function traceOwnership(el,properties=TRACE_DEFAULT_PROPERTIES)'),'Theme debug runtime must expose on-demand computed ownership tracing.');
assert(debugRuntime.includes("geometryOwner:'Core Structure'")&&debugRuntime.includes("paintOwner:'Core Component Appearance / Material Renderer'"),'Ownership trace must report canonical geometry/paint owners.');
assert(debugRuntime.includes('inspect,traceOwnership,isEnabled'),'traceOwnership must be exported through DKDSThemeDebug.');

assert(validator.includes('R7T closes the remaining overlap'),'Style validator must include R7T ownership gates.');
assert(validator.includes('PortableView must never receive legacy FloatingPanel geometry'),'Validator must reject legacy/PortableView dual geometry ownership.');
assert(validator.includes('Standard control motion belongs to theme/contract.css'),'Validator must reject Presentation transform ownership for standard controls.');

console.log('v3.67.17 R7T property ownership and computed diagnostics regression passed.');
