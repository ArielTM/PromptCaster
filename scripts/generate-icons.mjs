import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - blue gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Four squares representing LLM panels
  const padding = size * 0.15;
  const gap = size * 0.08;
  const squareSize = (size - padding * 2 - gap) / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

  // Top-left
  ctx.beginPath();
  ctx.roundRect(padding, padding, squareSize, squareSize, size * 0.05);
  ctx.fill();

  // Top-right
  ctx.beginPath();
  ctx.roundRect(padding + squareSize + gap, padding, squareSize, squareSize, size * 0.05);
  ctx.fill();

  // Bottom-left
  ctx.beginPath();
  ctx.roundRect(padding, padding + squareSize + gap, squareSize, squareSize, size * 0.05);
  ctx.fill();

  // Bottom-right
  ctx.beginPath();
  ctx.roundRect(padding + squareSize + gap, padding + squareSize + gap, squareSize, squareSize, size * 0.05);
  ctx.fill();

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(iconsDir, `icon${size}.png`), buffer);
  console.log(`Generated icon${size}.png`);
}

console.log('Icons generated successfully!');
