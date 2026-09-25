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

async function optimizePng(input) {
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

  const notes = [usePalette ? 'palette' : 'lossless'];
  if (resized) notes.push(`resized to ${MAX_WIDTH}px wide`);
  return {
    output,
    // A file that doesn't need resizing and is already smaller is best left
    // as it is, e.g. one that was optimized with a better tool.
    keepInput: !resized && output.length >= input.length,
    description: `${formatBytes(input.length)} → ${formatBytes(output.length)} (${notes.join(', ')})`,
  };
}

// Optimizes an image file in place, unless it's already smaller than what
// optimizing would produce. Returns a description of what was done, e.g.
// "412 KB → 194 KB (palette)".
export async function optimizeImage(file) {
  if (!/\.png$/i.test(file)) {
    throw new Error(`Only .png files can be optimized: ${file}`);
  }
  const input = fs.readFileSync(file);
  const { output, keepInput, description } = await optimizePng(input);
  if (keepInput) return `${formatBytes(input.length)}, already optimized`;
  fs.writeFileSync(file, output);
  return description;
}

// Writes a new PNG to `file`, optimized. Unlike optimizeImage, this replaces
// the existing file whatever its size, since it has new content.
export async function writeOptimizedImage(file, input) {
  const { output, keepInput, description } = await optimizePng(input);
  fs.writeFileSync(file, keepInput ? input : output);
  return keepInput
    ? `${formatBytes(input.length)}, already optimized`
    : description;
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
