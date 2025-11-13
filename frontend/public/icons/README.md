# PWA Icon Generation Guide

## Current Status
Basic SVG icon created at: `public/icons/icon-512x512.svg`

## Generate PNG Icons (Required)
You need to generate PNG versions of the icon in multiple sizes for PWA support.

### Option 1: Using ImageMagick (Recommended)
```bash
cd frontend/public/icons

# Install ImageMagick (if not already installed)
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Generate all required sizes
convert icon-512x512.svg -resize 72x72 icon-72x72.png
convert icon-512x512.svg -resize 96x96 icon-96x96.png
convert icon-512x512.svg -resize 128x128 icon-128x128.png
convert icon-512x512.svg -resize 144x144 icon-144x144.png
convert icon-512x512.svg -resize 152x152 icon-152x152.png
convert icon-512x512.svg -resize 192x192 icon-192x192.png
convert icon-512x512.svg -resize 384x384 icon-384x384.png
convert icon-512x512.svg -resize 512x512 icon-512x512.png
```

### Option 2: Using Online Tools
1. Go to: https://realfavicongenerator.net/
2. Upload the `icon-512x512.svg` file
3. Download the generated icons
4. Place them in `frontend/public/icons/`

### Option 3: Using Design Tools
- Open `icon-512x512.svg` in Figma/Sketch/Adobe XD
- Export as PNG in required sizes: 72, 96, 128, 144, 152, 192, 384, 512

## Custom Icon Design (Optional)
Replace the basic icon with your custom design:
1. Create a 512x512px design
2. Save as SVG: `icon-512x512.svg`
3. Generate PNG versions using one of the methods above

## Verification
After generating icons, verify in browser DevTools:
1. Open Application tab
2. Check Manifest section
3. Verify all icon sizes are loading correctly

## Notes
- Icons should have transparent background or solid color
- Recommended: 512x512px source for best quality
- PWA requires minimum 192x192px icon
- Apple devices use 180x180px (add if needed)
