// Einmaliges Build-Hilfsskript: erzeugt PWA-Icons (PNG) ohne externe
// Bildbibliotheken (kein sharp/canvas verfügbar). Zeichnet einen einfachen
// Sparkle/Stern auf brand-grünem Hintergrund direkt als Pixelbuffer und
// kodiert ihn manuell als PNG (zlib deflate + Chunk-Aufbau von Hand).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BRAND_GREEN = [22, 163, 74]; // #16a34a
const WHITE = [255, 255, 255];

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Vierzackiger Sparkle (zwei gekreuzte Rauten), zentriert, skaliert auf die Bildgröße.
function isSparklePixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = (x - cx) / (size * 0.42);
  const dy = (y - cy) / (size * 0.42);
  const a = Math.abs(dx) + Math.abs(dy);
  const longArm = a < 1.0 && (Math.abs(dx) < 0.09 || Math.abs(dy) < 0.09);
  return longArm;
}

function buildPng(size, { maskable }) {
  const pixels = Buffer.alloc(size * size * 4);
  const bgRadius = maskable ? size * 0.5 : size * 0.46;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      let color;
      let alpha = 255;
      if (maskable) {
        color = BRAND_GREEN;
      } else if (dist <= bgRadius) {
        color = BRAND_GREEN;
      } else {
        color = [0, 0, 0];
        alpha = 0;
      }
      if (isSparklePixel(x, y, size)) {
        color = WHITE;
      }
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = alpha;
    }
  }

  // Scanlines mit Filter-Byte 0 (none) für die IDAT-Rohdaten.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  const idatData = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "maskable-192.png", size: 192, maskable: true },
  { name: "maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
];

for (const t of targets) {
  const png = buildPng(t.size, { maskable: t.maskable });
  fs.writeFileSync(path.join(outDir, t.name), png);
  console.log(`Erzeugt: ${t.name} (${png.length} bytes)`);
}
