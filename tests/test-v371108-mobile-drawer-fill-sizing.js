'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const ProjectionContract=require('../src/core/ui/modules/presentation/mobile-web-projection-contract');
const classes={contains(){return false;}};
const fillNode={dataset:{dkdsPortableSizing:'fill'},classList:classes};
const contentNode={dataset:{dkdsPortableSizing:'content'},classList:classes};
const parameterNode={dataset:{dkdsPortableSizing:'content',dkdsPresentationPurpose:'parameters'},classList:classes};

const fillProjection=ProjectionContract.styleValues(fillNode,'drawer','');
assert.strictEqual(fillProjection.fillDrawer,true,'A Unit PRIME with sizing=fill must retain fill intent in a Mobile Drawer.');
assert.strictEqual(fillProjection.values.height,'100%','Mobile Presenter must map fill Drawer sizing to a definite block size.');
assert.strictEqual(ProjectionContract.styleValues(contentNode,'drawer','').values.height,'auto','Content-sized Drawer surfaces must keep intrinsic block size.');
assert.strictEqual(ProjectionContract.styleValues(parameterNode,'drawer','parameters').values.height,'100%','Parameter Drawer must remain viewport-fill.');

const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const css=read('src/styles/platform/native-workspace-presentation.css');
const dcUnit=read('src/plugins/data-center/unit-presentation.js');
const dcMobile=read('src/plugins/data-center/mobile.css');

assert(presenter.includes("dkdsMobileSurfaceSizing',text(node?.dataset?.dkdsPortableSizing||'content')"),'Presenter frame must carry the Unit sizing contract across reparenting.');
assert(css.includes('[data-dkds-mobile-surface-sizing="fill"]>.dkds-mobile-drawer-scroll>.dkds-mobile-drawer-content{height:100%;min-height:100%}'),'Fill Drawer wrapper must expose a definite 100% containing block to its projected Unit.');
assert(dcUnit.includes("existingNode:objects.element,sizing:'fill'"),'Data Center data-control must request fill through the canonical PRIME sizing parameter.');
assert(!/\\.dc-artifact-pane\\{[^}]*height:100%/.test(dcMobile),'Data Center must not privately own projected Drawer block-size after declaring PRIME sizing=fill.');

console.log('v3.71.108 Mobile Drawer fill sizing PASS: Unit fill intent survives Presenter reparenting and owns Data Center list viewport without plugin height CSS.');
