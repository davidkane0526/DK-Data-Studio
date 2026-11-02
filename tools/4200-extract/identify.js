#!/usr/bin/env node
'use strict';

// Independent, read-only Keithley 4200A KXCI connection check.
// No DKDS, Electron, React Native, administrative permissions or daemon.
// Only sends the verified *IDN? + 00 query. Never sends SMU/output commands.
const {isIP}=require('node:net');
const {createTcpRuntime}=require('../../desktop/main-modules/tcp-runtime.js');
const kxci=require('../../src/plugins/keithley-4200/kxci-protocol.js');

const USAGE=[
  'Keithley 4200A standalone read-only identity checker (Node.js 20+)',
  'Usage:',
  '  node tools/4200-extract/identify.js --identify --host 169.254.111.118 --mode ethernet',
  'Options:',
  '  --host ADDRESS          Instrument IPv4/hostname; required for --identify',
  '  --port PORT             KXCI TCP port (default: 1225)',
  '  --mode MODE             auto | ethernet | wifi | interface (default: auto)',
  '  --interface NAME        Required for --mode interface',
  '  --local-ip IPV4         Optional explicit local IPv4 source binding',
  '  --serial SERIAL         Optional exact instrument serial verification',
  '  --timeout-ms MS         TCP connect / reply timeout (250..10000, default 5000)',
  '  --identify             Execute a single read-only *IDN? + NUL query',
  '  --help                 Show this help without connecting',
  '',
  'No routing/IP changes, no Root, no background service, no data export.',
  'For 169.254.x.x targets, the Ethernet adapter normally needs a 169.254/16 IPv4.',
].join('\n');

function parseArgs(argv){
  const allowed=new Set(['--host','--port','--mode','--interface','--local-ip','--serial','--timeout-ms']);
  const result={};
  for(let i=0;i<argv.length;i++){
    const token=argv[i];
    if(token==='--help'||token==='-h'){result.help=true;continue;}
    if(token==='--identify'){result.identify=true;continue;}
    if(!allowed.has(token))throw Error('Unknown argument: '+token);
    if(Object.prototype.hasOwnProperty.call(result,token))throw Error('Duplicate argument: '+token);
    const value=argv[++i];
    if(!value||value.startsWith('--'))throw Error('Expected value for '+token);
    result[token]=value;
  }
  return result;
}
function integer(v,fallback,label,min,max){
  if(v===undefined)return fallback;
  if(!/^\d+$/.test(v))throw Error(label+' must be an integer');
  const n=Number(v);
  if(n<min||n>max)throw Error(label+' must be between '+min+' and '+max);
  return n;
}

async function main(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.help||!options.identify){
    process.stdout.write(USAGE+'\n');
    return;
  }
  const host=String(options['--host']||'').trim();
  if(!host||host.length>253||/[\s/\\]/.test(host))throw Error('A valid --host is required.');
  const port=integer(options['--port'],1225,'--port',1,65535);
  const timeout=integer(options['--timeout-ms'],5000,'--timeout-ms',250,10000);
  const mode=String(options['--mode']||'auto');
  if(!['auto','ethernet','wifi','interface'].includes(mode))throw Error('Invalid --mode.');
  const interfaceName=String(options['--interface']||'');
  if(mode==='interface'&&!interfaceName)throw Error('--interface NAME is required for --mode interface');
  const localAddress=String(options['--local-ip']||'');
  if(localAddress&&isIP(localAddress)!==4)throw Error('--local-ip must be IPv4.');
  const serial=String(options['--serial']||'');
  if(serial.length>128)throw Error('--serial is too long.');
  const tcp=createTcpRuntime();
  let opened;
  try{
    opened=await tcp.open({
      host,port,networkMode:mode,interfaceName,localAddress,
      connectTimeoutMs:timeout,
      preferLinkLocalEthernet:host.startsWith('169.254.')&&mode==='auto'
    });
    const response=await tcp.exchange({
      sessionId:opened.sessionId,
      base64:Buffer.from(kxci.IDN_REQUEST,'ascii').toString('base64'),
      readTimeoutMs:timeout,idleTimeoutMs:120,maxBytes:8192
    });
    const bytes=Buffer.from(response.base64,'base64');
    const identity=kxci.parseIdentity(bytes.toString('ascii'),serial);
    process.stdout.write('Connection: '+opened.localAddress+' -> '+opened.remoteAddress+':'+opened.remotePort+'\n');
    process.stdout.write('Route: '+(opened.interfaceName||'OS selected')+' ('+opened.routeStrategy+')\n');
    process.stdout.write('Identity: '+identity.raw+'\n');
    process.stdout.write('Verified KI4200A serial: '+identity.serial+'\n');
  }finally{
    if(opened)await tcp.close({sessionId:opened.sessionId}).catch(()=>{});
    tcp.closeAll();
  }
}
if(require.main===module)main().catch(e=>{
  process.stderr.write('4200A read-only identity check failed: '+String(e.message||e)+'\n');
  process.exitCode=1;
});
module.exports={main,parseArgs};
