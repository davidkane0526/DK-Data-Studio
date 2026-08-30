'use strict';

const ROLES=Object.freeze({
  SCIENTIFIC_PRIMARY:'scientific-primary',
  DATA_PRIMARY:'data-primary',
  UTILITY_PRIMARY:'utility-primary',
  DATA_CONTROL:'data-control',
  INSPECTOR:'inspector',
  SCIENTIFIC_SECONDARY:'scientific-secondary'
});
const ROLE_VALUES=Object.freeze(Object.values(ROLES));
const ROLE_SET=new Set(ROLE_VALUES);
const isPresentationRole=value=>ROLE_SET.has(String(value??'').trim().toLowerCase());

module.exports=Object.freeze({ROLES,ROLE_VALUES,isPresentationRole});
