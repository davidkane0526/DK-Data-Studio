'use strict';
const gate=globalThis.DKDSStyleGate;
if(!gate)throw new Error('DKDSStyleGate must be initialized before UI Infrastructure.');
module.exports=gate;
