// Shrinks images before they're committed, without visibly lowering quality.

import fs from 'node:fs';
import sharp from 'sharp';

// The docs content column is at most ~958 CSS px wide, so anything wider than
// 2x that is never shown to anyone.
export const MAX_WIDTH = 1916;

// If reducing to a palette changes the image more than this, keep all colors
// instead. Screenshots of UI usually land well above it (~55 dB); photos and
// gradients are what push it down.
const MIN_PALETTE_PSNR = 45;

function psnr(a, b) {
  let squaredError = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    squaredError += diff * diff;
  }
  if (squaredError === 0) return Infinity;
  return 10 * Math.log10((255 * 255) / (squaredError / a.length));
}

function rawPixels(buffer) {
  return sharp(buffer).ensureAlpha().raw().toBuffer();
}

// Returns a description of what was done, e.g. "412 KB → 194 KB (palette)".
export async function optimizeImage(file) {
  const input = fs.readFileSync(file);
  if (!/\.png$/i.test(file)) {
    throw new Error(`Only .png files can be optimized: ${file}`);
  }

  const { width, isPalette } = await sharp(input).metadata();
  const resized = width > MAX_WIDTH;
  const source = await sharp(input)
    .resize({ width: Math.min(width, MAX_WIDTH), withoutEnlargement: true })
    .png()
    .toBuffer();

  // Setting `palette` (or `effort`) is what makes sharp quantize, so the
  // lossless variant must leave both out.
  const lossless = await sharp(source)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const palette = await sharp(source)
    .png({ palette: true, quality: 100, effort: 10, compressionLevel: 9 })
    .toBuffer();

  // Quantizing an image that already has a palette would lose a little more
  // quality each time the file is optimized.
  const alreadyQuantized = isPalette && !resized;
  const quality = psnr(await rawPixels(source), await rawPixels(palette));
  const usePalette =
    !alreadyQuantized &&
    quality >= MIN_PALETTE_PSNR &&
    palette.length < lossless.length;
  const output = usePalette ? palette : lossless;

  // Don't replace a file that is already smaller, e.g. one that was optimized
  // with a better tool.
  if (!resized && output.length >= input.length) {
    return `${formatBytes(input.length)}, already optimized`;
  }

  fs.writeFileSync(file, output);
  const notes = [usePalette ? 'palette' : 'lossless'];
  if (resized) notes.push(`resized to ${MAX_WIDTH}px wide`);
  return `${formatBytes(input.length)} → ${formatBytes(output.length)} (${notes.join(', ')})`;
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
