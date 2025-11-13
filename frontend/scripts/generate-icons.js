#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generates placeholder PNG icons from SVG for development
 * For production, use proper image generation tools
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple colored square PNG as placeholder
function createPlaceholderIcon(size) {
  // This creates a base64 encoded PNG
  // In production, you should use proper SVG to PNG conversion
  const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.125}" fill="#3b82f6"/>
      <rect x="${size * 0.25}" y="${size * 0.1875}" width="${size * 0.5}" height="${size * 0.5625}" rx="${size * 0.03125}" fill="white"/>
      <rect x="${size * 0.25}" y="${size * 0.1875}" width="${size * 0.5}" height="${size * 0.125}" rx="${size * 0.03125}" fill="#1e40af"/>
      <rect x="${size * 0.25}" y="${size * 0.28125}" width="${size * 0.5}" height="${size * 0.03125}" fill="#1e40af"/>
      <circle cx="${size * 0.375}" cy="${size * 0.4375}" r="${size * 0.015625}" fill="#3b82f6"/>
      <circle cx="${size * 0.5}" cy="${size * 0.4375}" r="${size * 0.015625}" fill="#3b82f6"/>
      <circle cx="${size * 0.625}" cy="${size * 0.4375}" r="${size * 0.015625}" fill="#3b82f6"/>
      <circle cx="${size * 0.375}" cy="${size * 0.53125}" r="${size * 0.015625}" fill="#3b82f6"/>
      <circle cx="${size * 0.5}" cy="${size * 0.53125}" r="${size * 0.0234375}" fill="#ef4444"/>
      <circle cx="${size * 0.625}" cy="${size * 0.53125}" r="${size * 0.015625}" fill="#3b82f6"/>
      <circle cx="${size * 0.78125}" cy="${size * 0.25}" r="${size * 0.0625}" fill="#fbbf24" opacity="0.8"/>
    </svg>
  `;
  
  return canvas;
}

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

console.log('📱 Generating PWA icons...\n');

SIZES.forEach(size => {
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(ICONS_DIR, filename);
  const svg = createPlaceholderIcon(size);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Created: ${filename}`);
});

console.log('\n✨ Icon generation complete!');
console.log('\n⚠️  NOTE: These are SVG placeholders.');
console.log('For production, convert to PNG using:');
console.log('  - ImageMagick: convert icon-512x512.svg icon-512x512.png');
console.log('  - Online tool: https://realfavicongenerator.net/');
console.log('  - Design tool: Export from Figma/Sketch/Adobe XD\n');
