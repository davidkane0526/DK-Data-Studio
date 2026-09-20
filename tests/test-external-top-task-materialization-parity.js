'use strict';
const {spawnSync}=require('child_process');const assert=require('assert');
const result=spawnSync(process.execPath,['tests/test-v3702-packaged-top-task-window-parity.js'],{stdio:'inherit'});assert.strictEqual(result.status,0,'external TOP task package materialization parity failed');console.log('External TOP task materialization parity PASS');
