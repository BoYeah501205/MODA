/**
 * Generate placeholder PWA icons for MODA
 * Creates minimal PNG files with dark slate background
 * 
 * Usage: node scripts/generate-icons.cjs
 * 
 * TODO: Replace these placeholder icons with real branded icons
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Minimal PNG generator - creates a solid color PNG with no dependencies
function createPNG(width, height, r, g, b) {
    // PNG file structure
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = createChunk('IHDR', ihdrData);
    
    // IDAT chunk - raw image data with zlib
    // Each row: filter byte (0 = none) + RGB pixels
    const rawRowSize = 1 + width * 3;
    const rawData = Buffer.alloc(rawRowSize * height);
    
    for (let y = 0; y < height; y++) {
        const rowOffset = y * rawRowSize;
        rawData[rowOffset] = 0; // filter: none
        for (let x = 0; x < width; x++) {
            const pixelOffset = rowOffset + 1 + x * 3;
            // Draw "M" letter in center area for branding hint
            const cx = width / 2;
            const cy = height / 2;
            const letterSize = width * 0.3;
            const inCenter = Math.abs(x - cx) < letterSize && Math.abs(y - cy) < letterSize;
            
            if (inCenter) {
                // Slightly lighter area in center
                rawData[pixelOffset] = Math.min(255, r + 20);
                rawData[pixelOffset + 1] = Math.min(255, g + 30);
                rawData[pixelOffset + 2] = Math.min(255, b + 40);
            } else {
                rawData[pixelOffset] = r;
                rawData[pixelOffset + 1] = g;
                rawData[pixelOffset + 2] = b;
            }
        }
    }
    
    // Compress with zlib (deflate)
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(rawData, { level: 9 });
    const idat = createChunk('IDAT', compressed);
    
    // IEND chunk
    const iend = createChunk('IEND', Buffer.alloc(0));
    
    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    
    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);
    
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    
    return Buffer.concat([length, typeBuffer, data, crc]);
}

// CRC32 implementation for PNG chunks
function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ 0xEDB88320;
            } else {
                crc = crc >>> 1;
            }
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Dark slate color: #0f172a = rgb(15, 23, 42)
const BG_R = 15, BG_G = 23, BG_B = 42;

const sizes = [
    { name: 'icon-16.png', size: 16 },
    { name: 'icon-32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-maskable-512.png', size: 512 },
];

console.log('Generating placeholder PWA icons...');

for (const { name, size } of sizes) {
    const png = createPNG(size, size, BG_R, BG_G, BG_B);
    const filePath = path.join(ICONS_DIR, name);
    fs.writeFileSync(filePath, png);
    console.log(`  Created: icons/${name} (${size}x${size}, ${png.length} bytes)`);
}

console.log('\nDone! Replace these placeholders with real branded icons.');
console.log('Requirements:');
console.log('  - apple-touch-icon.png: 180x180, NO transparency');
console.log('  - icon-maskable-512.png: logo in central 80% safe zone');
