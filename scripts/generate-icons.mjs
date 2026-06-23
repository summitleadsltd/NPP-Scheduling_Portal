import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Simple "S" logo on purple background
function createSvg(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const innerSize = size - padding * 2;
  const fontSize = Math.round(innerSize * 0.55);
  const cx = size / 2;
  const cy = size / 2;
  const r = innerSize / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#7c3aed" rx="${maskable ? 0 : Math.round(size * 0.15)}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#7c3aed"/>
    <text x="${cx}" y="${cy}" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="central">S</text>
  </svg>`;
}

async function generate() {
  for (const size of sizes) {
    const svg = Buffer.from(createSvg(size));
    await sharp(svg).resize(size, size).png().toFile(`public/icons/icon-${size}x${size}.png`);
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Maskable icon (with safe zone padding)
  const maskSvg = Buffer.from(createSvg(512, true));
  await sharp(maskSvg).resize(512, 512).png().toFile('public/icons/icon-maskable-512x512.png');
  console.log('Generated icon-maskable-512x512.png');

  // Apple touch icon
  const appleSvg = Buffer.from(createSvg(180));
  await sharp(appleSvg).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  console.log('Generated apple-touch-icon.png');

  // Favicon 32x32
  const fav32 = Buffer.from(createSvg(32));
  await sharp(fav32).resize(32, 32).png().toFile('public/favicon-32x32.png');
  console.log('Generated favicon-32x32.png');

  // Favicon 16x16
  const fav16 = Buffer.from(createSvg(16));
  await sharp(fav16).resize(16, 16).png().toFile('public/favicon-16x16.png');
  console.log('Generated favicon-16x16.png');

  console.log('All icons generated!');
}

generate().catch(console.error);
