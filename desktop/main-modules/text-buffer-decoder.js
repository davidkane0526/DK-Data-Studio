'use strict';
function detectBomEncoding(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return 'utf-8';
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return 'utf-16le';
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) return 'utf-16be';
  return null;
}

function decodeTextBuffer(buffer, requestedEncoding = 'auto') {
  const req = String(requestedEncoding || 'auto').toLowerCase();
  const aliases = {
    auto: 'auto', utf8: 'utf-8', 'utf-8-bom': 'utf-8', gbk: 'gb18030',
    gb2312: 'gb18030', sjis: 'shift_jis', 'shift-jis': 'shift_jis',
    latin1: 'windows-1252', 'iso-8859-1': 'windows-1252'
  };
  let enc = aliases[req] || req;
  if (enc === 'auto') {
    enc = detectBomEncoding(buffer) || 'utf-8';
    if (enc === 'utf-8') {
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        return { text: text.replace(/^\uFEFF/, ''), encoding: 'utf-8' };
      } catch {
        enc = 'gb18030';
      }
    }
  }
  try {
    let text = new TextDecoder(enc, { fatal: false }).decode(buffer);
    text = text.replace(/^\uFEFF/, '');
    return { text, encoding: enc };
  } catch {
    return { text: buffer.toString('utf8').replace(/^\uFEFF/, ''), encoding: 'utf-8' };
  }
}
module.exports={decodeTextBuffer,detectBomEncoding};
