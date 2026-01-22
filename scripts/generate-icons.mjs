import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true });

// Extension icons + PWA icons
const sizes = [16, 32, 48, 128, 192, 512];

function drawIcon(ctx, size) {
  // Background - blue gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Two vertical chat panels (left and right)
  const padding = size * 0.12;
  const panelWidth = size * 0.22;
  const panelHeight = size * 0.7;
  const panelY = (size - panelHeight) / 2;
  const cornerRadius = size * 0.04;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

  // Left panel
  ctx.beginPath();
  ctx.roundRect(padding, panelY, panelWidth, panelHeight, cornerRadius);
  ctx.fill();

  // Right panel
  ctx.beginPath();
  ctx.roundRect(size - padding - panelWidth, panelY, panelWidth, panelHeight, cornerRadius);
  ctx.fill();

  // Gavel in the center
  const centerX = size / 2;
  const centerY = size / 2;

  // Gavel head (horizontal rectangle)
  const headWidth = size * 0.28;
  const headHeight = size * 0.14;
  ctx.fillStyle = '#fbbf24'; // Amber/gold color
  ctx.beginPath();
  ctx.roundRect(
    centerX - headWidth / 2,
    centerY - headHeight - size * 0.02,
    headWidth,
    headHeight,
    size * 0.03
  );
  ctx.fill();

  // Gavel handle (vertical rectangle)
  const handleWidth = size * 0.08;
  const handleHeight = size * 0.28;
  ctx.beginPath();
  ctx.roundRect(
    centerX - handleWidth / 2,
    centerY - size * 0.04,
    handleWidth,
    handleHeight,
    size * 0.02
  );
  ctx.fill();

  // Add slight shadow/depth to gavel head
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.roundRect(
    centerX - headWidth / 2,
    centerY - headHeight / 3 - size * 0.02,
    headWidth,
    headHeight / 3,
    size * 0.02
  );
  ctx.fill();
}

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  drawIcon(ctx, size);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(iconsDir, `icon${size}.png`), buffer);
  console.log(`Generated icon${size}.png`);
}

console.log('Icons generated successfully!');
