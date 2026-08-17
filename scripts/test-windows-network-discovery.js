const assert = require('assert');
const {
  normalizeDeviceId,
  extractMessageId,
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

const probe = buildProbeMatches({
  deviceId,
  xaddr,
  relatesTo,
  instanceId:1,
  sequenceId:'urn:uuid:bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
  messageNumber:2
});
assert.match(probe, /ProbeMatches/);
assert.match(probe, /wsdp:Device/);
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
assert.match(metadata, /<wsdp:PresentationURL>http:\/\/192\.168\.1\.23:45910\/<\/wsdp:PresentationURL>/);
assert.doesNotMatch(metadata, /<wsdp:PresentationUrl>/);
assert.match(metadata, /DK Data Studio · TEST-PC/);
assert.ok(metadata.includes(relatesTo));

console.log('Windows network discovery metadata checks passed.');
