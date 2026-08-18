const assert = require('assert');
const {
  normalizeDeviceId,
  extractMessageId,
  probeTypesSupported,
  buildProbeMatches,
  buildResolveMatches,
  buildHello,
  buildMetadataResponse
} = require('../windows-network-discovery');

const deviceId = '123e4567-e89b-42d3-a456-426614174000';
const relatesTo = 'urn:uuid:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const xaddr = 'http://192.168.1.23:45910/wsd';

assert.strictEqual(normalizeDeviceId(`urn:uuid:${deviceId}`), deviceId);
assert.strictEqual(normalizeDeviceId('not-a-uuid'), '');
assert.strictEqual(probeTypesSupported(''), true);
assert.strictEqual(probeTypesSupported('wsdp:Device'), true);
assert.strictEqual(probeTypesSupported('pub:Computer'), true);
assert.strictEqual(probeTypesSupported('dn:NetworkVideoTransmitter'), false);

const probe = buildProbeMatches({
  deviceId,
  xaddr,
  relatesTo,
  instanceId:1,
  sequenceId:'urn:uuid:bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
  messageNumber:2
});
assert.match(probe, /ProbeMatches/);
assert.match(probe, /wsdp:Device pub:Computer/);
assert.match(probe, /xmlns:pub="http:\/\/schemas\.microsoft\.com\/windows\/pub\/2005\/07"/);
assert.ok(probe.includes(xaddr));
assert.ok(probe.includes(relatesTo));

const resolve = buildResolveMatches({
  deviceId,
  xaddr,
  relatesTo,
  instanceId:1,
  sequenceId:'urn:uuid:bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
  messageNumber:3
});
assert.match(resolve, /ResolveMatches/);
assert.match(resolve, /pub:Computer/);
assert.ok(resolve.includes(`urn:uuid:${deviceId}`));
assert.ok(resolve.includes(xaddr));

const hello = buildHello({
  deviceId,
  xaddr,
  instanceId:1,
  sequenceId:'urn:uuid:bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
  messageNumber:4
});
assert.match(hello, /<wsd:Hello>/);
assert.match(hello, /<wsd:Types>wsdp:Device pub:Computer<\/wsd:Types>/);
assert.match(hello, /<wsd:XAddrs>http:\/\/192\.168\.1\.23:45910\/wsd<\/wsd:XAddrs>/);
assert.match(hello, /<wsd:MetadataVersion>1<\/wsd:MetadataVersion>/);

const requestXml = `<?xml version="1.0"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"><s:Header><a:MessageID>${relatesTo}</a:MessageID></s:Header><s:Body/></s:Envelope>`;
assert.strictEqual(extractMessageId(requestXml), relatesTo);

const metadata = buildMetadataResponse({
  deviceId,
  version:'3.22.0',
  presentationUrl:'http://192.168.1.23:45910/',
  requestMessageId:relatesTo,
  friendlyName:'DK Data Studio · TEST-PC'
});
assert.match(metadata, /ThisDevice/);
assert.match(metadata, /ThisModel/);
assert.match(metadata, /<pnpx:DeviceCategory>Computers<\/pnpx:DeviceCategory>/);
assert.match(metadata, /<wsdp:Types>pub:Computer<\/wsdp:Types>/);
assert.match(metadata, /<pub:Computer>[^<]+(?:\/Domain:[^<]+|\\Workgroup:[^<]+)<\/pub:Computer>/);
assert.match(metadata, /<wsdp:PresentationURL>http:\/\/192\.168\.1\.23:45910\/<\/wsdp:PresentationURL>/);
assert.doesNotMatch(metadata, /<wsdp:PresentationUrl>/);
assert.match(metadata, /DK Data Studio · TEST-PC/);
assert.ok(metadata.includes(relatesTo));

console.log('Windows network discovery metadata checks passed.');

// The production LAN-web path now uses the independently validated
// SSDP/UPnP + mDNS/DNS-SD discovery stack. WSD remains covered above as a
// compatibility implementation but is no longer the only discovery protocol.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  LanDiscoveryService,
  BASIC_DEVICE,
  SSDP_GROUP,
  SSDP_PORT,
  MDNS_GROUP,
  MDNS_PORT,
  isPrivateIPv4,
  sanitizeHostname,
  buildMdnsPacket
} = require('../lan-discovery-service');
const { LanWebServer } = require('../lan-web-server');

assert.strictEqual(isPrivateIPv4('192.168.1.20'), true);
assert.strictEqual(isPrivateIPv4('10.4.3.2'), true);
assert.strictEqual(isPrivateIPv4('172.31.9.2'), true);
assert.strictEqual(isPrivateIPv4('172.32.9.2'), false);
assert.strictEqual(isPrivateIPv4('169.254.1.2'), false);
assert.strictEqual(SSDP_GROUP, '239.255.255.250');
assert.strictEqual(SSDP_PORT, 1900);
assert.strictEqual(MDNS_GROUP, '224.0.0.251');
assert.strictEqual(MDNS_PORT, 5353);
assert.strictEqual(BASIC_DEVICE, 'urn:schemas-upnp-org:device:Basic:1');
assert.ok(!sanitizeHostname('DK Data Studio TEST PC').includes(' '));

const lanDiscovery = new LanDiscoveryService({
  deviceId,
  getHttpPort:()=>45910,
  deviceName:'DK Data Studio'
});
const alive=lanDiscovery.ssdpNotify('upnp:rootdevice','ssdp:alive','192.168.1.23').toString('utf8');
assert.match(alive,/NOTIFY \* HTTP\/1\.1\r\n/);
assert.ok(alive.includes(`HOST: ${SSDP_GROUP}:${SSDP_PORT}\r\n`));
assert.ok(alive.includes('LOCATION: http://192.168.1.23:45910/upnp/device.xml\r\n'));
assert.ok(alive.includes(`USN: uuid:${deviceId}::upnp:rootdevice\r\n`));
assert.ok(alive.endsWith('\r\n\r\n'),'SSDP messages must use CRLF framing.');
const ssdpResponse=lanDiscovery.ssdpResponse(BASIC_DEVICE,'192.168.1.23').toString('utf8');
assert.match(ssdpResponse,/HTTP\/1\.1 200 OK\r\n/);
assert.ok(ssdpResponse.includes(`ST: ${BASIC_DEVICE}\r\n`));

const mdns=buildMdnsPacket({
  hostname:'dk-data-studio-test.local',
  instance:'DK Data Studio - TEST._http._tcp.local',
  port:45910,
  addresses:['192.168.1.23']
});
assert.strictEqual(mdns.readUInt16BE(2),0x8400);
assert.ok(mdns.readUInt16BE(6)>=4,'mDNS announcement must carry PTR/SRV/TXT/A records.');
assert.ok(mdns.includes(Buffer.from('path=/')),'mDNS TXT record must advertise path=/.');

const tempUser=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-lan-web-test-'));
try{
  const fakeApp={getAppPath:()=>path.resolve(__dirname,'..'),getPath:()=>tempUser,getVersion:()=> '3.26.0'};
  const fakeWindows={getAllWindows:()=>[]};
  const lanWeb=new LanWebServer({app:fakeApp,BrowserWindow:fakeWindows});
  const upnp=lanWeb.upnpDeviceXml('192.168.1.23');
  assert.match(upnp,new RegExp(`<deviceType>${BASIC_DEVICE.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</deviceType>`));
  assert.ok(upnp.includes(`<UDN>uuid:${lanWeb.settings.deviceId}</UDN>`));
  assert.ok(upnp.includes('<presentationURL>http://192.168.1.23:45910/</presentationURL>'));
  const saved=JSON.parse(fs.readFileSync(path.join(tempUser,'lan-web-settings.json'),'utf8'));
  assert.strictEqual(saved.deviceId,lanWeb.settings.deviceId,'LAN discovery UUID must persist across restarts.');
} finally { fs.rmSync(tempUser,{recursive:true,force:true}); }

console.log('SSDP/UPnP/mDNS LAN discovery checks passed.');
