const dgram = require('dgram');
const os = require('os');
const { EventEmitter } = require('events');

const SSDP_GROUP = '239.255.255.250';
const SSDP_PORT = 1900;
const MDNS_GROUP = '224.0.0.251';
const MDNS_PORT = 5353;
const BASIC_DEVICE = 'urn:schemas-upnp-org:device:Basic:1';

function isPrivateIPv4(address) {
  const p = String(address || '').split('.').map(Number);
  if (p.length !== 4 || p.some(v => !Number.isInteger(v) || v < 0 || v > 255)) return false;
  return p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
}

function lanInterfaces() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const [name, list] of Object.entries(nets)) {
    for (const info of list || []) {
      if (info.family !== 'IPv4' || info.internal || !isPrivateIPv4(info.address)) continue;
      out.push({ name, address:info.address, netmask:info.netmask || '255.255.255.0' });
    }
  }
  const seen = new Set();
  return out.filter(row => !seen.has(row.address) && seen.add(row.address));
}

function ipv4Int(value) {
  const p=String(value||'').split('.').map(Number);
  if(p.length!==4||p.some(v=>!Number.isInteger(v)||v<0||v>255))return null;
  return (((p[0]<<24)>>>0)|((p[1]<<16)>>>0)|((p[2]<<8)>>>0)|p[3])>>>0;
}

function sameSubnet(a,b,mask) {
  const aa=ipv4Int(a),bb=ipv4Int(b),mm=ipv4Int(mask);
  return aa!==null&&bb!==null&&mm!==null&&((aa&mm)>>>0)===((bb&mm)>>>0);
}

function sanitizeHostname(value) {
  const text=String(value||'dk-data-studio').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55);
  return text || 'dk-data-studio';
}

function parseSsdpHeaders(text) {
  const lines=String(text||'').split(/\r?\n/);
  const first=String(lines.shift()||'').trim();
  const headers={};
  for(const line of lines){
    const i=line.indexOf(':');
    if(i<=0)continue;
    headers[line.slice(0,i).trim().toLowerCase()]=line.slice(i+1).trim();
  }
  return { first, headers };
}

function encodeName(name) {
  const chunks=[];
  for(const label of String(name||'').replace(/\.$/,'').split('.').filter(Boolean)){
    const b=Buffer.from(label,'utf8');
    if(b.length>63)throw new Error(`mDNS label too long: ${label}`);
    chunks.push(Buffer.from([b.length]),b);
  }
  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
}

function decodeName(buf, offset, depth=0) {
  if(depth>8)return {name:'',next:offset};
  const labels=[];
  let pos=offset;
  let next=null;
  while(pos<buf.length){
    const len=buf[pos];
    if((len&0xc0)===0xc0){
      if(pos+1>=buf.length)break;
      const ptr=((len&0x3f)<<8)|buf[pos+1];
      const inner=decodeName(buf,ptr,depth+1);
      if(inner.name)labels.push(inner.name);
      pos+=2;
      if(next===null)next=pos;
      break;
    }
    if(len===0){pos+=1;if(next===null)next=pos;break;}
    pos+=1;
    if(pos+len>buf.length)break;
    labels.push(buf.subarray(pos,pos+len).toString('utf8'));
    pos+=len;
  }
  return {name:labels.join('.').toLowerCase(),next:next===null?pos:next};
}

function parseDnsQuestions(buf) {
  if(!Buffer.isBuffer(buf)||buf.length<12)return [];
  const count=buf.readUInt16BE(4);
  let pos=12;
  const out=[];
  for(let i=0;i<count&&pos<buf.length;i++){
    const decoded=decodeName(buf,pos);
    pos=decoded.next;
    if(pos+4>buf.length)break;
    const type=buf.readUInt16BE(pos);pos+=2;
    const klass=buf.readUInt16BE(pos);pos+=2;
    out.push({name:decoded.name,type,klass});
  }
  return out;
}

function dnsRecord(name,type,ttl,rdata,{flush=true}={}) {
  const head=Buffer.alloc(10);
  head.writeUInt16BE(type,0);
  head.writeUInt16BE((flush?0x8000:0)|1,2);
  head.writeUInt32BE(ttl>>>0,4);
  head.writeUInt16BE(rdata.length,8);
  return Buffer.concat([encodeName(name),head,rdata]);
}

function ipv4Buffer(ip) {
  return Buffer.from(String(ip).split('.').map(Number));
}

function buildMdnsPacket(config) {
  const hostname=String(config.hostname).replace(/\.$/,'');
  const instance=String(config.instance).replace(/\.$/,'');
  const service='_http._tcp.local';
  const ttl=Number(config.ttl)||120;
  const records=[];
  records.push(dnsRecord(service,12,ttl,encodeName(instance),{flush:false}));
  const srvHead=Buffer.alloc(6);
  srvHead.writeUInt16BE(0,0);srvHead.writeUInt16BE(0,2);srvHead.writeUInt16BE(Number(config.port)||0,4);
  records.push(dnsRecord(instance,33,ttl,Buffer.concat([srvHead,encodeName(hostname)])));
  const txt=Buffer.from('path=/','utf8');
  records.push(dnsRecord(instance,16,ttl,Buffer.concat([Buffer.from([txt.length]),txt])));
  for(const ip of config.addresses||[])records.push(dnsRecord(hostname,1,ttl,ipv4Buffer(ip)));
  const header=Buffer.alloc(12);
  header.writeUInt16BE(0,0);
  header.writeUInt16BE(0x8400,2);
  header.writeUInt16BE(0,4);
  header.writeUInt16BE(records.length,6);
  header.writeUInt16BE(0,8);
  header.writeUInt16BE(0,10);
  return Buffer.concat([header,...records]);
}

class LanDiscoveryService extends EventEmitter {
  constructor({deviceId,getHttpPort,deviceName='DK Data Studio',hostnamePrefix='dk-data-studio'}) {
    super();
    this.deviceId=String(deviceId||'').trim().replace(/^uuid:/i,'').replace(/^urn:uuid:/i,'').toLowerCase();
    this.getHttpPort=getHttpPort;
    this.deviceName=deviceName;
    this.hostnamePrefix=hostnamePrefix;
    this.interfaces=[];
    this.ssdpSocket=null;
    this.mdnsSocket=null;
    this.announceTimer=null;
    this.mdnsTimer=null;
    this.networkTimer=null;
    this.running=false;
    this.restarting=false;
    this.status={running:false,ssdp:false,mdns:false,interfaces:[],hostname:'',friendlyName:'',errors:[]};
  }

  friendlyName(){return `${this.deviceName} - ${os.hostname()}`;}
  hostname(){return `${sanitizeHostname(`${this.hostnamePrefix}-${os.hostname()}`)}.local`;}
  port(){return Number(this.getHttpPort?.())||45910;}
  uuid(){return `uuid:${this.deviceId}`;}
  interfaceFingerprint(rows=this.interfaces){return rows.map(r=>`${r.name}|${r.address}|${r.netmask}`).sort().join(';');}

  getStatus(){return {...this.status,interfaces:this.status.interfaces.map(x=>({...x})),errors:[...this.status.errors]};}
  emitStatus(){this.emit('status',this.getStatus());}
  addError(kind,err){
    const message=`${kind}: ${err?.message||String(err)}`;
    if(!this.status.errors.includes(message))this.status.errors.push(message);
    console.warn(`[LAN discovery] ${message}`);
    this.emitStatus();
  }

  chooseInterface(remoteAddress) {
    const remote=String(remoteAddress||'').replace(/^::ffff:/,'');
    return this.interfaces.find(row=>sameSubnet(row.address,remote,row.netmask))||this.interfaces[0]||null;
  }

  locationFor(ip){return `http://${ip}:${this.port()}/upnp/device.xml`;}
  presentationFor(ip){return `http://${ip}:${this.port()}/`;}

  ssdpTargets(){return ['upnp:rootdevice',this.uuid(),BASIC_DEVICE];}
  usnFor(target){return target===this.uuid()?this.uuid():`${this.uuid()}::${target}`;}

  ssdpNotify(target,nts,ip) {
    const lines=[
      'NOTIFY * HTTP/1.1',
      `HOST: ${SSDP_GROUP}:${SSDP_PORT}`,
      ...(nts==='ssdp:alive'?[`CACHE-CONTROL: max-age=1800`,`LOCATION: ${this.locationFor(ip)}`]:[]),
      `NT: ${target}`,
      `NTS: ${nts}`,
      `SERVER: ${process.platform}/1.0 UPnP/1.0 DK-Data-Studio/${process.versions.node}`,
      `USN: ${this.usnFor(target)}`,
      'BOOTID.UPNP.ORG: 1',
      'CONFIGID.UPNP.ORG: 1',
      '', ''
    ];
    return Buffer.from(lines.join('\r\n'),'utf8');
  }

  ssdpResponse(target,ip) {
    const lines=[
      'HTTP/1.1 200 OK',
      'CACHE-CONTROL: max-age=1800',
      'EXT:',
      `LOCATION: ${this.locationFor(ip)}`,
      `SERVER: ${process.platform}/1.0 UPnP/1.0 DK-Data-Studio/${process.versions.node}`,
      `ST: ${target}`,
      `USN: ${this.usnFor(target)}`,
      'BOOTID.UPNP.ORG: 1',
      'CONFIGID.UPNP.ORG: 1',
      '', ''
    ];
    return Buffer.from(lines.join('\r\n'),'utf8');
  }

  async start(){
    if(this.running)return this.getStatus();
    this.running=true;
    this.interfaces=lanInterfaces();
    this.status={running:true,ssdp:false,mdns:false,interfaces:this.interfaces,friendlyName:this.friendlyName(),hostname:this.hostname(),errors:[]};
    await Promise.allSettled([this.startSsdp(),this.startMdns()]);
    this.startTimers();
    this.emitStatus();
    return this.getStatus();
  }

  startTimers(){
    if(this.announceTimer)clearInterval(this.announceTimer);
    if(this.mdnsTimer)clearInterval(this.mdnsTimer);
    if(this.networkTimer)clearInterval(this.networkTimer);
    this.announceTimer=setInterval(()=>this.announceAlive(),300000);this.announceTimer.unref?.();
    this.mdnsTimer=setInterval(()=>this.announceMdns(),120000);this.mdnsTimer.unref?.();
    this.networkTimer=setInterval(()=>this.checkNetworkChange(),5000);this.networkTimer.unref?.();
  }

  async checkNetworkChange(){
    if(!this.running||this.restarting)return;
    const next=lanInterfaces();
    if(this.interfaceFingerprint(next)===this.interfaceFingerprint(this.interfaces))return;
    this.restarting=true;
    try{
      await this.stopTransports(true);
      this.interfaces=next;
      this.status.interfaces=next;
      this.status.errors=[];
      await Promise.allSettled([this.startSsdp(),this.startMdns()]);
      this.emitStatus();
    }finally{this.restarting=false;}
  }

  async bindSocket(socket,port){
    await new Promise((resolve,reject)=>{
      const onError=err=>{socket.removeListener('listening',onListening);reject(err);};
      const onListening=()=>{socket.removeListener('error',onError);resolve();};
      socket.once('error',onError);socket.once('listening',onListening);socket.bind(port,'0.0.0.0');
    });
  }

  async startSsdp(){
    try{
      const socket=dgram.createSocket({type:'udp4',reuseAddr:true});
      this.ssdpSocket=socket;
      socket.on('error',err=>this.addError('SSDP',err));
      socket.on('message',(msg,rinfo)=>this.onSsdpMessage(msg,rinfo));
      await this.bindSocket(socket,SSDP_PORT);
      for(const row of this.interfaces){try{socket.addMembership(SSDP_GROUP,row.address);}catch(err){this.addError(`SSDP join ${row.address}`,err);}}
      try{socket.setMulticastTTL(2);socket.setMulticastLoopback(true);}catch{}
      this.status.ssdp=true;
      this.announceAlive();
    }catch(err){this.status.ssdp=false;this.addError('SSDP start',err);try{this.ssdpSocket?.close();}catch{}this.ssdpSocket=null;}
  }

  announceAlive(){
    const socket=this.ssdpSocket;if(!socket)return;
    for(const row of this.interfaces){
      try{socket.setMulticastInterface(row.address);}catch{}
      for(const target of this.ssdpTargets()){
        const body=this.ssdpNotify(target,'ssdp:alive',row.address);
        try{socket.send(body,SSDP_PORT,SSDP_GROUP);}catch(err){this.addError('SSDP alive',err);}
      }
    }
  }

  announceByebye(){
    const socket=this.ssdpSocket;if(!socket)return;
    for(const row of this.interfaces){
      try{socket.setMulticastInterface(row.address);}catch{}
      for(const target of this.ssdpTargets()){
        const body=this.ssdpNotify(target,'ssdp:byebye',row.address);
        try{socket.send(body,SSDP_PORT,SSDP_GROUP);}catch{}
      }
    }
  }

  onSsdpMessage(msg,rinfo){
    const {first,headers}=parseSsdpHeaders(msg.toString('utf8'));
    if(!/^M-SEARCH\s+\*\s+HTTP\/1\.1$/i.test(first))return;
    const st=String(headers.st||'').trim();
    const allowed=this.ssdpTargets();
    const targets=st.toLowerCase()==='ssdp:all'?allowed:allowed.filter(x=>x.toLowerCase()===st.toLowerCase());
    if(!targets.length)return;
    const row=this.chooseInterface(rinfo.address);if(!row)return;
    targets.forEach((target,index)=>{
      const delay=10+Math.floor(Math.random()*70)+index*5;
      setTimeout(()=>{
        if(!this.ssdpSocket)return;
        const body=this.ssdpResponse(target,row.address);
        try{this.ssdpSocket.send(body,rinfo.port,rinfo.address);}catch(err){this.addError('SSDP response',err);}
      },delay).unref?.();
    });
  }

  mdnsPacket(){
    const hostname=this.hostname();
    const instance=`${this.friendlyName()}._http._tcp.local`;
    return buildMdnsPacket({hostname,instance,port:this.port(),addresses:this.interfaces.map(x=>x.address),ttl:120});
  }

  async startMdns(){
    try{
      const socket=dgram.createSocket({type:'udp4',reuseAddr:true});
      this.mdnsSocket=socket;
      socket.on('error',err=>this.addError('mDNS',err));
      socket.on('message',(msg,rinfo)=>this.onMdnsMessage(msg,rinfo));
      await this.bindSocket(socket,MDNS_PORT);
      for(const row of this.interfaces){try{socket.addMembership(MDNS_GROUP,row.address);}catch(err){this.addError(`mDNS join ${row.address}`,err);}}
      try{socket.setMulticastTTL(255);socket.setMulticastLoopback(true);}catch{}
      this.status.mdns=true;
      this.announceMdns();
    }catch(err){this.status.mdns=false;this.addError('mDNS start',err);try{this.mdnsSocket?.close();}catch{}this.mdnsSocket=null;}
  }

  announceMdns(){
    const socket=this.mdnsSocket;if(!socket||!this.interfaces.length)return;
    const packet=this.mdnsPacket();
    for(const row of this.interfaces){
      try{socket.setMulticastInterface(row.address);}catch{}
      try{socket.send(packet,MDNS_PORT,MDNS_GROUP);}catch(err){this.addError('mDNS announce',err);}
    }
  }

  onMdnsMessage(msg){
    const questions=parseDnsQuestions(msg);
    if(!questions.length)return;
    const hostname=this.hostname().toLowerCase();
    const instance=`${this.friendlyName()}._http._tcp.local`.toLowerCase();
    const relevant=questions.some(q=>{
      const n=q.name.replace(/\.$/,'');
      return n===hostname||n===instance||n==='_http._tcp.local'||n==='_services._dns-sd._udp.local';
    });
    if(relevant)this.announceMdns();
  }

  async stopTransports(sendGoodbye=false){
    if(sendGoodbye)this.announceByebye();
    const ssdp=this.ssdpSocket,mdns=this.mdnsSocket;
    this.ssdpSocket=null;this.mdnsSocket=null;
    if(ssdp)try{ssdp.close();}catch{}
    if(mdns)try{mdns.close();}catch{}
    this.status.ssdp=false;this.status.mdns=false;
  }

  async stop(){
    if(!this.running)return this.getStatus();
    this.running=false;
    if(this.announceTimer)clearInterval(this.announceTimer);
    if(this.mdnsTimer)clearInterval(this.mdnsTimer);
    if(this.networkTimer)clearInterval(this.networkTimer);
    this.announceTimer=this.mdnsTimer=this.networkTimer=null;
    await this.stopTransports(true);
    this.status.running=false;
    this.emitStatus();
    return this.getStatus();
  }
}

module.exports={
  LanDiscoveryService,
  SSDP_GROUP,SSDP_PORT,MDNS_GROUP,MDNS_PORT,BASIC_DEVICE,
  isPrivateIPv4,lanInterfaces,sanitizeHostname,parseSsdpHeaders,parseDnsQuestions,buildMdnsPacket
};
