import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');
const pwaIconsDir = join(__dirname, '..', 'pwa', 'icons');
const sourceIcon = join(__dirname, '..', 'source-icon.png');

// Ensure icons directories exist
mkdirSync(iconsDir, { recursive: true });
mkdirSync(pwaIconsDir, { recursive: true });

// Extension icons
const sizes = [16, 32, 48, 128, 192, 512];
// PWA icons (subset with different naming)
const pwaSizes = [16, 32, 192, 512];

const img = await loadImage(sourceIcon);

// Generate extension icons
for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(iconsDir, `icon${size}.png`), buffer);
  console.log(`Generated icon${size}.png`);
}

// Generate PWA icons (different naming convention)
for (const size of pwaSizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(pwaIconsDir, `icon-${size}.png`), buffer);
  console.log(`Generated pwa/icons/icon-${size}.png`);
}

console.log('Icons generated successfully!');
