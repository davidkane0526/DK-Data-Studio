'use strict';

const PRESENTATION_ROLE_POLICIES=Object.freeze({
  'scientific-primary':Object.freeze({kind:'primary',mobileRegion:'main',navigation:'primary'}),
  'data-primary':Object.freeze({kind:'primary',mobileRegion:'main',navigation:'primary'}),
  'utility-primary':Object.freeze({kind:'primary',mobileRegion:'main',navigation:'primary'}),
  'data-control':Object.freeze({kind:'prime',mobileRegion:'drawer',navigation:'context'}),
  'inspector':Object.freeze({kind:'prime',mobileRegion:'companion-right',navigation:'context'}),
  'scientific-secondary':Object.freeze({kind:'prime-or-sub',mobileRegion:'companion-bottom',dataPrimaryMobileRegion:'workspace-inline',navigation:'context-or-secondary'})
});

module.exports=Object.freeze({PRESENTATION_ROLE_POLICIES});
