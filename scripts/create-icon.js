const fs = require('fs');
const path = require('path');

// Create a simple 256x256 ICO file with a hospital cross icon
// ICO format: header + directory entries + image data (BMP format)

function createICO() {
  const sizes = [256, 48, 32, 16];
  const images = sizes.map(size => createBMPImage(size));
  
  // ICO Header: 6 bytes
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  
  let offset = headerSize + dirSize;
  const parts = [];
  
  // Header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4);  // Count
  parts.push(header);
  
  // Directory entries
  const offsets = [];
  for (let i = 0; i < images.length; i++) {
    offsets.push(offset);
    offset += images[i].length;
    
    const entry = Buffer.alloc(16);
    const s = sizes[i];
    entry.writeUInt8(s === 256 ? 0 : s, 0);   // Width (0 = 256)
    entry.writeUInt8(s === 256 ? 0 : s, 1);   // Height (0 = 256)
    entry.writeUInt8(0, 2);                     // Color palette
    entry.writeUInt8(0, 3);                     // Reserved
    entry.writeUInt16LE(1, 4);                  // Color planes
    entry.writeUInt16LE(32, 6);                 // Bits per pixel
    entry.writeUInt32LE(images[i].length, 8);   // Size
    entry.writeUInt32LE(offsets[i], 12);         // Offset
    parts.push(entry);
  }
  
  // Image data
  for (const img of images) {
    parts.push(img);
  }
  
  return Buffer.concat(parts);
}

function createBMPImage(size) {
  // Create a 32-bit BGRA BMP (no file header, just BITMAPINFOHEADER + pixel data)
  const headerSize = 40;
  const pixelDataSize = size * size * 4;
  const maskSize = Math.ceil(size / 32) * 4 * size; // AND mask
  
  const buf = Buffer.alloc(headerSize + pixelDataSize + maskSize);
  
  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 0);           // Header size
  buf.writeInt32LE(size, 4);          // Width
  buf.writeInt32LE(size * 2, 8);      // Height (doubled for ICO)
  buf.writeUInt16LE(1, 12);           // Planes
  buf.writeUInt16LE(32, 14);          // Bits per pixel
  buf.writeUInt32LE(0, 16);           // Compression (none)
  buf.writeUInt32LE(pixelDataSize + maskSize, 20);  // Image size
  buf.writeInt32LE(0, 24);            // X pixels per meter
  buf.writeInt32LE(0, 28);            // Y pixels per meter
  buf.writeUInt32LE(0, 32);           // Colors used
  buf.writeUInt32LE(0, 36);           // Important colors
  
  // Draw the icon (bottom-up BMP format)
  const cx = size / 2;
  const cy = size / 2;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = headerSize + ((size - 1 - y) * size + x) * 4;
      const pixel = getPixelColor(x, y, size, cx, cy);
      buf.writeUInt8(pixel.b, idx);     // Blue
      buf.writeUInt8(pixel.g, idx + 1); // Green
      buf.writeUInt8(pixel.r, idx + 2); // Red
      buf.writeUInt8(pixel.a, idx + 3); // Alpha
    }
  }
  
  // AND mask (all zeros = fully opaque, alpha channel handles transparency)
  // Already zeroed from Buffer.alloc
  
  return buf;
}

function getPixelColor(x, y, size, cx, cy) {
  const margin = size * 0.08;
  const cornerRadius = size * 0.18;
  
  // Check if we're in the rounded rectangle
  if (!isInRoundedRect(x, y, margin, margin, size - margin, size - margin, cornerRadius)) {
    return { r: 0, g: 0, b: 0, a: 0 }; // Transparent
  }
  
  // Background gradient: deep navy (#0B1D3A) to teal (#0F4C5C)
  const gradientT = y / size;
  const bgR = Math.round(11 + (15 - 11) * gradientT);
  const bgG = Math.round(29 + (76 - 29) * gradientT);
  const bgB = Math.round(58 + (92 - 58) * gradientT);
  
  // Medical cross
  const crossWidth = size * 0.22;
  const crossHeight = size * 0.50;
  const crossLeft = cx - crossWidth / 2;
  const crossRight = cx + crossWidth / 2;
  const crossTop = cy - crossHeight / 2;
  const crossBottom = cy + crossHeight / 2;
  
  const inVertical = x >= crossLeft && x <= crossRight && y >= crossTop && y <= crossBottom;
  const inHorizontal = y >= (cy - crossWidth / 2) && y <= (cy + crossWidth / 2) && x >= (cx - crossHeight / 2) && x <= (cx + crossHeight / 2);
  
  // Cross with slight rounding
  const crossR = size * 0.04;
  const inCross = inVertical || inHorizontal;
  
  if (inCross) {
    // White cross with slight blue tint
    return { r: 235, g: 245, b: 255, a: 255 };
  }
  
  // Subtle circle glow behind the cross
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const glowRadius = size * 0.35;
  if (dist < glowRadius) {
    const glowIntensity = 1 - (dist / glowRadius);
    const glow = Math.round(glowIntensity * 20);
    return { 
      r: Math.min(255, bgR + glow), 
      g: Math.min(255, bgG + glow + 5), 
      b: Math.min(255, bgB + glow + 8), 
      a: 255 
    };
  }
  
  return { r: bgR, g: bgG, b: bgB, a: 255 };
}

function isInRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  
  // Check corners
  const corners = [
    { cx: left + radius, cy: top + radius },     // top-left
    { cx: right - radius, cy: top + radius },    // top-right
    { cx: left + radius, cy: bottom - radius },  // bottom-left
    { cx: right - radius, cy: bottom - radius }, // bottom-right
  ];
  
  for (const corner of corners) {
    const inCornerRegion = (
      (x < left + radius && y < top + radius && corner === corners[0]) ||
      (x > right - radius && y < top + radius && corner === corners[1]) ||
      (x < left + radius && y > bottom - radius && corner === corners[2]) ||
      (x > right - radius && y > bottom - radius && corner === corners[3])
    );
    
    if (inCornerRegion) {
      const dist = Math.sqrt((x - corner.cx) ** 2 + (y - corner.cy) ** 2);
      if (dist > radius) return false;
    }
  }
  
  return true;
}

// Generate and save
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const icoBuffer = createICO();
const outputPath = path.join(buildDir, 'icon.ico');
fs.writeFileSync(outputPath, icoBuffer);

// Also copy the PNG as icon.png for other platforms
const pngSource = path.resolve(__dirname, '..', '..', '..', '..', 
  'Users', 'K_Pc', '.gemini', 'antigravity-ide', 'brain',
  'deda3c38-520b-42e2-8581-c39de47cf25d', 'app_icon_1787147255385.png');

if (fs.existsSync(pngSource)) {
  fs.copyFileSync(pngSource, path.join(buildDir, 'icon.png'));
  console.log('✓ Copied icon.png to build/');
}

console.log(`✓ Generated icon.ico (${icoBuffer.length} bytes) at ${outputPath}`);
console.log(`  Contains sizes: 256x256, 48x48, 32x32, 16x16`);
