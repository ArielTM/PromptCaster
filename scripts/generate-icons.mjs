import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');
const pwaIconsDir = join(__dirname, '..', 'pwa', 'icons');

// Ensure icons directories exist
mkdirSync(iconsDir, { recursive: true });
mkdirSync(pwaIconsDir, { recursive: true });

// Extension icons
const sizes = [16, 32, 48, 128, 192, 512];
// PWA icons (subset with different naming)
const pwaSizes = [16, 32, 192, 512];

function drawIcon(ctx, size) {
  // Outer margin for safe area (prevents edge clipping at small sizes)
  const outerMargin = size * 0.08;
  const innerSize = size - (outerMargin * 2);

  // Background - blue gradient (now with margin)
  const gradient = ctx.createLinearGradient(outerMargin, outerMargin, outerMargin + innerSize, outerMargin + innerSize);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(outerMargin, outerMargin, innerSize, innerSize, innerSize * 0.2);
  ctx.fill();

  // Two vertical chat panels (left and right)
  const padding = innerSize * 0.12;
  const panelWidth = innerSize * 0.22;
  const panelHeight = innerSize * 0.7;
  const panelY = outerMargin + (innerSize - panelHeight) / 2;
  const cornerRadius = innerSize * 0.04;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

  // Left panel
  ctx.beginPath();
  ctx.roundRect(outerMargin + padding, panelY, panelWidth, panelHeight, cornerRadius);
  ctx.fill();

  // Right panel
  ctx.beginPath();
  ctx.roundRect(outerMargin + innerSize - padding - panelWidth, panelY, panelWidth, panelHeight, cornerRadius);
  ctx.fill();

  // Gavel in the center
  const centerX = outerMargin + innerSize / 2;
  const centerY = outerMargin + innerSize / 2;

  // Gavel head (horizontal rectangle)
  const headWidth = innerSize * 0.28;
  const headHeight = innerSize * 0.14;
  ctx.fillStyle = '#fbbf24'; // Amber/gold color
  ctx.beginPath();
  ctx.roundRect(
    centerX - headWidth / 2,
    centerY - headHeight - innerSize * 0.02,
    headWidth,
    headHeight,
    innerSize * 0.03
  );
  ctx.fill();

  // Gavel handle (vertical rectangle)
  const handleWidth = innerSize * 0.08;
  const handleHeight = innerSize * 0.28;
  ctx.beginPath();
  ctx.roundRect(
    centerX - handleWidth / 2,
    centerY - innerSize * 0.04,
    handleWidth,
    handleHeight,
    innerSize * 0.02
  );
  ctx.fill();

  // Add slight shadow/depth to gavel head
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.roundRect(
    centerX - headWidth / 2,
    centerY - headHeight / 3 - innerSize * 0.02,
    headWidth,
    headHeight / 3,
    innerSize * 0.02
  );
  ctx.fill();
}

// Generate extension icons
for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  drawIcon(ctx, size);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(iconsDir, `icon${size}.png`), buffer);
  console.log(`Generated icon${size}.png`);
}

// Generate PWA icons (different naming convention)
for (const size of pwaSizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  drawIcon(ctx, size);

  // Save as PNG with PWA naming convention
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(pwaIconsDir, `icon-${size}.png`), buffer);
  console.log(`Generated pwa/icons/icon-${size}.png`);
}

console.log('Icons generated successfully!');
