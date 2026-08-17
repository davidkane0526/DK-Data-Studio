const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');

const COLORS = {
  bg: [17, 24, 39, 255],
  border: [240, 245, 255, 255],
  blue: [91, 154, 255, 255],
  mint: [99, 237, 212, 255],
  node: [255, 255, 255, 255]
};

let crcTable = null;
function crc32(buffer) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const out = Buffer.allocUnsafe(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuffer.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return out;
}

function setPixel(buffer, size, x, y, rgba) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buffer[i] = rgba[0];
  buffer[i + 1] = rgba[1];
  buffer[i + 2] = rgba[2];
  buffer[i + 3] = rgba[3];
}

function fillCircle(buffer, size, cx, cy, radius, color) {
  const r2 = radius * radius;
  const minX = Math.floor(cx - radius - 1), maxX = Math.ceil(cx + radius + 1);
  const minY = Math.floor(cy - radius - 1), maxY = Math.ceil(cy + radius + 1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(buffer, size, x, y, color);
    }
  }
}

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x >= left + radius && x <= right - radius && y >= top && y <= bottom) return true;
  if (y >= top + radius && y <= bottom - radius && x >= left && x <= right) return true;
  const cx = x < left + radius ? left + radius : right - radius;
  const cy = y < top + radius ? top + radius : bottom - radius;
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function fillRoundedRect(buffer, size, left, top, right, bottom, radius, color) {
  for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
    for (let x = Math.floor(left); x <= Math.ceil(right); x++) {
      if (insideRoundedRect(x + 0.5, y + 0.5, left, top, right, bottom, radius)) setPixel(buffer, size, x, y, color);
    }
  }
}

function strokeRoundedRect(buffer, size, left, top, right, bottom, radius, thickness, color) {
  const inner = { left:left + thickness, top:top + thickness, right:right - thickness, bottom:bottom - thickness, radius:Math.max(0, radius - thickness) };
  for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
    for (let x = Math.floor(left); x <= Math.ceil(right); x++) {
      const px = x + 0.5, py = y + 0.5;
      if (insideRoundedRect(px, py, left, top, right, bottom, radius)
        && !insideRoundedRect(px, py, inner.left, inner.top, inner.right, inner.bottom, inner.radius)) {
        setPixel(buffer, size, x, y, color);
      }
    }
  }
}

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
    y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
  };
}

function strokeBezier(buffer, size, points, radius, color) {
  const steps = Math.max(160, Math.round(size * 0.8));
  for (let i = 0; i <= steps; i++) {
    const p = cubicPoint(points[0], points[1], points[2], points[3], i / steps);
    fillCircle(buffer, size, p.x, p.y, radius, color);
  }
}

function renderIcon(size) {
  const s = size / 512;
  const q = n => n * s;
  const pixels = Buffer.alloc(size * size * 4, 0);

  fillRoundedRect(pixels, size, q(22), q(22), q(490), q(490), q(96), COLORS.bg);
  strokeRoundedRect(pixels, size, q(46), q(46), q(466), q(466), q(72), Math.max(1, q(2)), COLORS.border);

  strokeBezier(pixels, size, [
    {x:q(132),y:q(201)}, {x:q(208),y:q(176)}, {x:q(303),y:q(186)}, {x:q(379),y:q(259)}
  ], q(10), COLORS.blue);

  strokeBezier(pixels, size, [
    {x:q(107),y:q(348)}, {x:q(176),y:q(302)}, {x:q(260),y:q(293)}, {x:q(405),y:q(164)}
  ], q(13), COLORS.mint);

  for (const [x,y,r] of [
    [132,201,14], [379,259,14], [107,348,18], [260,281,16], [405,164,19]
  ]) fillCircle(pixels, size, q(x), q(y), q(r), COLORS.node);

  return pixels;
}

function encodePng(size, pixels) {
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    const dst = y * (rowBytes + 1);
    raw[dst] = 0;
    pixels.copy(raw, dst + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function encodeIco(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 0;
  header[7] = 0;
  header[8] = 0;
  header[9] = 0;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

function writeIfChanged(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    const current = fs.readFileSync(filePath);
    if (current.equals(data)) return false;
  } catch {}
  fs.writeFileSync(filePath, data);
  return true;
}

const png512 = encodePng(512, renderIcon(512));
const png256 = encodePng(256, renderIcon(256));
const ico = encodeIco(png256);

const outputs = [
  [path.join(root, 'assets', 'dkds-icon.png'), png512],
  [path.join(root, 'assets', 'dkds-icon.ico'), ico],
  [path.join(root, 'mobile', 'assets', 'icon.png'), png512],
  [path.join(root, 'mobile', 'assets', 'adaptive-icon.png'), png512]
];

let changed = 0;
for (const [file, data] of outputs) if (writeIfChanged(file, data)) changed++;
console.log(`Brand assets ready (${changed} file${changed === 1 ? '' : 's'} updated).`);
