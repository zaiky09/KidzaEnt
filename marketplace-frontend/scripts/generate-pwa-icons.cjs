// Generates PWA icon assets from src/assets/Kidza.png.
// Run with `npm run icons` (defined in package.json).
//
// Outputs (in marketplace-frontend/public/):
//   - icon-192.png        Android home-screen
//   - icon-512.png        Android splash
//   - icon-512-maskable.png  Android adaptive (safe-zone padded)
//   - apple-touch-icon.png   iOS Add-to-Home-Screen (180x180)
//
// The source logo isn't square, so we pad to a square canvas with the brand
// black before resizing. Re-run any time the logo changes.

const path = require('node:path');
const sharp = require('sharp');

const SRC = path.resolve(__dirname, '../src/assets/Kidza.png');
const OUT = path.resolve(__dirname, '../public');
const BRAND_BG = { r: 0, g: 0, b: 0, alpha: 1 };

async function squarePad(srcBuffer, size, padRatio = 1.0) {
  const innerSize = Math.round(size * padRatio);
  const resized = await sharp(srcBuffer)
    .resize({ width: innerSize, height: innerSize, fit: 'contain', background: BRAND_BG })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG }
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function write(name, buffer) {
  const target = path.join(OUT, name);
  await sharp(buffer).toFile(target);
  console.log('  →', name);
}

(async () => {
  console.log('Generating PWA icons from', SRC);
  const src = await sharp(SRC).toBuffer();

  // Standard square icons fill the whole canvas.
  await write('icon-192.png', await squarePad(src, 192, 0.9));
  await write('icon-512.png', await squarePad(src, 512, 0.9));

  // Maskable icons must keep important content inside the inner 80% safe zone
  // because Android crops the corners for adaptive shapes.
  await write('icon-512-maskable.png', await squarePad(src, 512, 0.7));

  // iOS apple-touch-icon: 180x180, no transparency.
  await write('apple-touch-icon.png', await squarePad(src, 180, 0.9));

  console.log('Done.');
})().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
