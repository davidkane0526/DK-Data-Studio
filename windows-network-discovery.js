const dgram = require('dgram');
const os = require('os');
const crypto = require('crypto');

const WSD_MULTICAST_ADDRESS = '239.255.255.250';
const WSD_PORT = 3702;
const DISCOVERY_TO = 'urn:schemas-xmlsoap-org:ws:2005:04:discovery';
const ANONYMOUS_TO = 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous';
const ACTION_PROBE = 'http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe';
const ACTION_PROBE_MATCHES = 'http://schemas.xmlsoap.org/ws/2005/04/discovery/ProbeMatches';
const ACTION_RESOLVE = 'http://schemas.xmlsoap.org/ws/2005/04/discovery/Resolve';
const ACTION_RESOLVE_MATCHES = 'http://schemas.xmlsoap.org/ws/2005/04/discovery/ResolveMatches';
const ACTION_HELLO = 'http://schemas.xmlsoap.org/ws/2005/04/discovery/Hello';
const ACTION_BYE = 'http://schemas.xmlsoap.org/ws/2005/04/discovery/Bye';
const ACTION_GET_RESPONSE = 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse';
const PNPX_NS = 'http://schemas.microsoft.com/windows/pnpx/2005/10';
const PUBLICATION_NS = 'http://schemas.microsoft.com/windows/pub/2005/07';
const DISCOVERY_TYPES = 'wsdp:Device pub:Computer';

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeDeviceId(value) {
  const text = String(value || '').trim().replace(/^urn:uuid:/i, '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text.toLowerCase()
    : '';
}

function endpointUrn(deviceId) {
  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) throw new Error('Invalid WSD device UUID.');
  return `urn:uuid:${normalized}`;
}

function messageUuid() {
  return `urn:uuid:${crypto.randomUUID()}`;
}

function extractElementText(xml, localName) {
  const name = String(localName).replace(/[^A-Za-z0-9_.-]/g, '');
  const re = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${name}\\s*>`, 'i');
  const match = String(xml || '').match(re);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

function extractMessageId(xml) {
  return extractElementText(xml, 'MessageID');
}

function ipv4ToInt(address) {
  const parts = String(address || '').split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function lanIPv4Interfaces() {
  const rows = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const item of entries || []) {
      if (item.family !== 'IPv4' || item.internal) continue;
      rows.push({ name, address:item.address, netmask:item.netmask || '255.255.255.0' });
    }
  }
  return rows;
}

function bestLocalIPv4(remoteAddress) {
  const rows = lanIPv4Interfaces();
  if (!rows.length) return '';
  const remote = ipv4ToInt(String(remoteAddress || '').replace(/^::ffff:/, ''));
  if (remote === null) return rows[0].address;
  for (const row of rows) {
    const local = ipv4ToInt(row.address);
    const mask = ipv4ToInt(row.netmask);
    if (local === null || mask === null) continue;
    if ((local & mask) === (remote & mask)) return row.address;
  }
  return rows[0].address;
}

function soapEnvelope(header, body, extraNamespaces = '') {
  return `<?xml version="1.0" encoding="utf-8"?>\n<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:wsdp="http://schemas.xmlsoap.org/ws/2006/02/devprof" xmlns:pnpx="${PNPX_NS}" xmlns:pub="${PUBLICATION_NS}" ${extraNamespaces}>\n  <soap:Header>${header}</soap:Header>\n  <soap:Body>${body}</soap:Body>\n</soap:Envelope>`;
}

function appSequence(instanceId, sequenceId, messageNumber) {
  return `<wsd:AppSequence InstanceId="${instanceId}" SequenceId="${xmlEscape(sequenceId)}" MessageNumber="${messageNumber}"/>`;
}

function discoveryHeader({ action, to, relatesTo = '', instanceId, sequenceId, messageNumber }) {
  return `\n    <wsa:To>${xmlEscape(to)}</wsa:To>\n    <wsa:Action>${xmlEscape(action)}</wsa:Action>\n    <wsa:MessageID>${messageUuid()}</wsa:MessageID>${relatesTo ? `\n    <wsa:RelatesTo>${xmlEscape(relatesTo)}</wsa:RelatesTo>` : ''}\n    ${appSequence(instanceId, sequenceId, messageNumber)}\n  `;
}

function endpointReference(deviceUrn) {
  return `<wsa:EndpointReference><wsa:Address>${xmlEscape(deviceUrn)}</wsa:Address></wsa:EndpointReference>`;
}

function discoveryTypeElement() {
  return `<wsd:Types>${DISCOVERY_TYPES}</wsd:Types>`;
}

function probeTypesSupported(types) {
  const requested = String(types || '').trim();
  if (!requested) return true;
  return requested.split(/\s+/).some(type => /(?:^|:)Device$/i.test(type) || /(?:^|:)Computer$/i.test(type));
}

function buildProbeMatches({ deviceId, xaddr, relatesTo, instanceId = 1, sequenceId = messageUuid(), messageNumber = 1 }) {
  const deviceUrn = endpointUrn(deviceId);
  const header = discoveryHeader({ action:ACTION_PROBE_MATCHES, to:ANONYMOUS_TO, relatesTo, instanceId, sequenceId, messageNumber });
  const body = `<wsd:ProbeMatches><wsd:ProbeMatch>${endpointReference(deviceUrn)}${discoveryTypeElement()}<wsd:XAddrs>${xmlEscape(xaddr)}</wsd:XAddrs><wsd:MetadataVersion>1</wsd:MetadataVersion></wsd:ProbeMatch></wsd:ProbeMatches>`;
  return soapEnvelope(header, body);
}

function buildResolveMatches({ deviceId, xaddr, relatesTo, instanceId = 1, sequenceId = messageUuid(), messageNumber = 1 }) {
  const deviceUrn = endpointUrn(deviceId);
  const header = discoveryHeader({ action:ACTION_RESOLVE_MATCHES, to:ANONYMOUS_TO, relatesTo, instanceId, sequenceId, messageNumber });
  const body = `<wsd:ResolveMatches><wsd:ResolveMatch>${endpointReference(deviceUrn)}${discoveryTypeElement()}<wsd:XAddrs>${xmlEscape(xaddr)}</wsd:XAddrs><wsd:MetadataVersion>1</wsd:MetadataVersion></wsd:ResolveMatch></wsd:ResolveMatches>`;
  return soapEnvelope(header, body);
}

function buildHello({ deviceId, xaddr = '', instanceId = 1, sequenceId = messageUuid(), messageNumber = 1 }) {
  const deviceUrn = endpointUrn(deviceId);
  const header = discoveryHeader({ action:ACTION_HELLO, to:DISCOVERY_TO, instanceId, sequenceId, messageNumber });
  const body = `<wsd:Hello>${endpointReference(deviceUrn)}${discoveryTypeElement()}${xaddr ? `<wsd:XAddrs>${xmlEscape(xaddr)}</wsd:XAddrs>` : ''}<wsd:MetadataVersion>1</wsd:MetadataVersion></wsd:Hello>`;
  return soapEnvelope(header, body);
}

function buildBye({ deviceId, instanceId = 1, sequenceId = messageUuid(), messageNumber = 1 }) {
  const deviceUrn = endpointUrn(deviceId);
  const header = discoveryHeader({ action:ACTION_BYE, to:DISCOVERY_TO, instanceId, sequenceId, messageNumber });
  const body = `<wsd:Bye>${endpointReference(deviceUrn)}</wsd:Bye>`;
  return soapEnvelope(header, body);
}

function computerPublicationIdentity() {
  const host = String(os.hostname() || 'DK-DATA-STUDIO').replace(/[\\/]/g, '-').slice(0, 63) || 'DK-DATA-STUDIO';
  const userDomain = String(process.env.USERDOMAIN || '').trim();
  const dnsDomain = String(process.env.USERDNSDOMAIN || '').trim();
  const group = userDomain && userDomain.toLowerCase() !== host.toLowerCase() ? userDomain : (dnsDomain || 'WORKGROUP');
  const qualifier = (userDomain && userDomain.toLowerCase() !== host.toLowerCase()) || dnsDomain ? 'Domain' : 'Workgroup';
  return `${host}/${qualifier}:${group}`;
}

function buildMetadataResponse({ deviceId, version, presentationUrl, requestMessageId = '', friendlyName = 'DK Data Studio' }) {
  const deviceUrn = endpointUrn(deviceId);
  const safeVersion = String(version || '0.0.0');
  const serial = normalizeDeviceId(deviceId).slice(0, 8);
  const computer = computerPublicationIdentity();
  const header = `\n    <wsa:To>${ANONYMOUS_TO}</wsa:To>\n    <wsa:Action>${ACTION_GET_RESPONSE}</wsa:Action>\n    <wsa:MessageID>${messageUuid()}</wsa:MessageID>${requestMessageId ? `\n    <wsa:RelatesTo>${xmlEscape(requestMessageId)}</wsa:RelatesTo>` : ''}\n  `;
  const body = `<wsx:Metadata>\n      <wsx:MetadataSection Dialect="http://schemas.xmlsoap.org/ws/2006/02/devprof/ThisDevice">\n        <wsdp:ThisDevice><wsdp:FriendlyName>${xmlEscape(friendlyName)}</wsdp:FriendlyName><wsdp:FirmwareVersion>${xmlEscape(safeVersion)}</wsdp:FirmwareVersion><wsdp:SerialNumber>${xmlEscape(serial)}</wsdp:SerialNumber></wsdp:ThisDevice>\n      </wsx:MetadataSection>\n      <wsx:MetadataSection Dialect="http://schemas.xmlsoap.org/ws/2006/02/devprof/ThisModel">\n        <wsdp:ThisModel><wsdp:Manufacturer>DK Data Studio</wsdp:Manufacturer><wsdp:ModelName>DK Data Studio LAN Workspace</wsdp:ModelName><wsdp:ModelNumber>${xmlEscape(safeVersion)}</wsdp:ModelNumber><wsdp:PresentationURL>${xmlEscape(presentationUrl)}</wsdp:PresentationURL><pnpx:DeviceCategory>Computers</pnpx:DeviceCategory></wsdp:ThisModel>\n      </wsx:MetadataSection>\n      <wsx:MetadataSection Dialect="http://schemas.xmlsoap.org/ws/2006/02/devprof/Relationship">\n        <wsdp:Relationship Type="http://schemas.xmlsoap.org/ws/2006/02/devprof/host"><wsdp:Host>${endpointReference(deviceUrn)}<wsdp:Types>pub:Computer</wsdp:Types><wsdp:ServiceId>${xmlEscape(deviceUrn)}</wsdp:ServiceId><pub:Computer>${xmlEscape(computer)}</pub:Computer></wsdp:Host></wsdp:Relationship>\n      </wsx:MetadataSection>\n    </wsx:Metadata>`;
  return soapEnvelope(header, body, 'xmlns:wsx="http://schemas.xmlsoap.org/ws/2004/09/mex"');
}

class WindowsNetworkDiscovery {
  constructor({ deviceId, getHttpPort, deviceName = 'DK Data Studio' } = {}) {
    this.deviceId = normalizeDeviceId(deviceId) || crypto.randomUUID();
    this.getHttpPort = typeof getHttpPort === 'function' ? getHttpPort : () => Number(getHttpPort) || 45910;
    this.deviceName = deviceName;
    this.socket = null;
    this.lastError = '';
    this.instanceId = Math.max(1, Math.floor(Date.now() / 1000));
    this.sequenceId = messageUuid();
    this.messageNumber = 0;
    this.memberships = [];
  }

  nextSequence() {
    this.messageNumber += 1;
    return { instanceId:this.instanceId, sequenceId:this.sequenceId, messageNumber:this.messageNumber };
  }

  getStatus() {
    return {
      running: !!this.socket,
      protocol: 'WS-Discovery / Windows Publication Services',
      deviceCategory: 'Computers',
      deviceName: this.deviceName,
      deviceId: this.deviceId,
      port: WSD_PORT,
      error: this.lastError
    };
  }

  send(xml, port, address) {
    if (!this.socket) return;
    const payload = Buffer.from(xml, 'utf8');
    this.socket.send(payload, 0, payload.length, port, address, err => {
      if (err) this.lastError = err.message;
    });
  }

  xaddrFor(remoteAddress) {
    const ip = bestLocalIPv4(remoteAddress);
    if (!ip) return '';
    return `http://${ip}:${Number(this.getHttpPort()) || 45910}/wsd`;
  }

  handleMessage(buffer, rinfo) {
    const xml = buffer.toString('utf8');
    const action = extractElementText(xml, 'Action');
    const messageId = extractMessageId(xml);
    if (!action || !messageId) return;

    if (action === ACTION_PROBE) {
      const types = extractElementText(xml, 'Types');
      if (!probeTypesSupported(types)) return;
      const xaddr = this.xaddrFor(rinfo.address);
      if (!xaddr) return;
      this.send(buildProbeMatches({ deviceId:this.deviceId, xaddr, relatesTo:messageId, ...this.nextSequence() }), rinfo.port, rinfo.address);
      return;
    }

    if (action === ACTION_RESOLVE) {
      const requested = extractElementText(xml, 'Address');
      if (requested && requested.toLowerCase() !== endpointUrn(this.deviceId).toLowerCase()) return;
      const xaddr = this.xaddrFor(rinfo.address);
      if (!xaddr) return;
      this.send(buildResolveMatches({ deviceId:this.deviceId, xaddr, relatesTo:messageId, ...this.nextSequence() }), rinfo.port, rinfo.address);
    }
  }

  async start() {
    if (this.socket) return this.getStatus();
    this.lastError = '';
    const socket = dgram.createSocket({ type:'udp4', reuseAddr:true });

    await new Promise((resolve, reject) => {
      const fail = err => {
        socket.removeListener('listening', ready);
        try { socket.close(); } catch {}
        reject(err);
      };
      const ready = () => {
        socket.removeListener('error', fail);
        resolve();
      };
      socket.once('error', fail);
      socket.once('listening', ready);
      socket.bind({ port:WSD_PORT, address:'0.0.0.0', exclusive:false });
    }).catch(err => {
      this.lastError = err.message;
      throw err;
    });

    this.socket = socket;
    socket.on('message', (msg, rinfo) => {
      try { this.handleMessage(msg, rinfo); } catch (err) { this.lastError = err.message; }
    });
    socket.on('error', err => { this.lastError = err.message; });

    this.memberships = [];
    for (const row of lanIPv4Interfaces()) {
      try {
        socket.addMembership(WSD_MULTICAST_ADDRESS, row.address);
        this.memberships.push(row.address);
      } catch {}
    }

    if (!this.memberships.length) {
      try {
        socket.addMembership(WSD_MULTICAST_ADDRESS);
        this.memberships.push('default');
      } catch (err) {
        this.lastError = err.message;
      }
    }

    try { socket.setMulticastTTL(2); } catch {}
    try { socket.setMulticastLoopback(false); } catch {}

    // Announce a Windows Publication Services computer endpoint. Network
    // Explorer also actively probes UDP/3702; those probes are answered above
    // for both generic Device and pub:Computer QName filters.
    const announced = new Set();
    for (const row of lanIPv4Interfaces()) {
      const xaddr = `http://${row.address}:${Number(this.getHttpPort()) || 45910}/wsd`;
      if (announced.has(xaddr)) continue;
      announced.add(xaddr);
      this.send(buildHello({ deviceId:this.deviceId, xaddr, ...this.nextSequence() }), WSD_PORT, WSD_MULTICAST_ADDRESS);
    }
    if (!announced.size) this.send(buildHello({ deviceId:this.deviceId, ...this.nextSequence() }), WSD_PORT, WSD_MULTICAST_ADDRESS);
    return this.getStatus();
  }

  async stop() {
    const socket = this.socket;
    if (!socket) return this.getStatus();
    try {
      this.send(buildBye({ deviceId:this.deviceId, ...this.nextSequence() }), WSD_PORT, WSD_MULTICAST_ADDRESS);
      await new Promise(resolve => setTimeout(resolve, 40));
    } catch {}
    this.socket = null;
    await new Promise(resolve => {
      try { socket.close(() => resolve()); } catch { resolve(); }
    });
    return this.getStatus();
  }
}

module.exports = {
  WSD_MULTICAST_ADDRESS,
  WSD_PORT,
  WindowsNetworkDiscovery,
  normalizeDeviceId,
  extractElementText,
  extractMessageId,
  bestLocalIPv4,
  probeTypesSupported,
  buildProbeMatches,
  buildResolveMatches,
  buildHello,
  buildBye,
  buildMetadataResponse
};
