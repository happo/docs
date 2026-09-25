// Shrinks images and videos before they're committed, without visibly lowering
// quality.

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

// The docs content column is at most ~958 CSS px wide, so anything wider than
// 2x that is never shown to anyone.
export const MAX_WIDTH = 1916;

// If reducing to a palette changes the image more than this, keep all colors
// instead. Screenshots of UI usually land well above it (~55 dB); photos and
// gradients are what push it down.
const MIN_PALETTE_PSNR = 45;

// VP9 constant quality (0-63, lower is better). Compared with Playwright's
// recordings, 36 is about a third of the size and still ~47 dB PSNR, with no
// visible difference in UI text. Going much higher starts to smudge small
// text.
const VIDEO_CRF = 36;

// Playwright records at 25 fps. Screen recordings made by hand are often 60
// fps, which is more than a docs video needs.
const MAX_FPS = 30;

// `pnpm media optimize --check` fails for files that optimizing would shrink
// by more than both of these.
const CHECK_MIN_SAVINGS_RATIO = 0.1;
const CHECK_MIN_SAVINGS_BYTES = 10 * 1024;

const PNG = /\.png$/i;
const GIF = /\.gif$/i;
// Converted to .webm, the format the docs use for videos. .mov and .mp4 are
// what screen recorders usually save.
const CONVERTED = /\.(gif|mov|mp4)$/i;
export const OPTIMIZABLE = /\.(png|webm|gif|mov|mp4)$/i;
// What `pnpm media optimize --check` looks at.
export const CHECKED = /\.(png|webm|gif)$/i;

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

  return {
    output,
    // A file that doesn't need resizing and is already smaller is best left
    // as it is, e.g. one that was optimized with a better tool.
    keepInput: !resized && output.length >= input.length,
    width,
    notes: [usePalette ? 'palette' : 'lossless'],
  };
}

// Playwright's own ffmpeg can't encode VP9, so ffmpeg comes from the
// ffmpeg-static package, which downloads it when `pnpm install` runs. Set
// FFMPEG_BIN to use a different one.
async function findFfmpeg() {
  let ffmpeg = process.env.FFMPEG_BIN;
  if (!ffmpeg) {
    try {
      ffmpeg = (await import('ffmpeg-static')).default;
    } catch {
      // Not installed. It's an optional dependency.
    }
  }
  if (!ffmpeg || !fs.existsSync(ffmpeg)) {
    throw new Error(
      'Optimizing videos needs ffmpeg, which `pnpm install` normally ' +
        'downloads. Run `pnpm install` again (look for errors from ' +
        'ffmpeg-static), or set FFMPEG_BIN to an ffmpeg built with libvpx-vp9.',
    );
  }
  return ffmpeg;
}

const run = promisify(execFile);

// The codec, width, frame rate and whether a video has sound. ffmpeg prints
// these when given only an input, and then exits with an error because there's
// no output.
async function probeVideo(ffmpeg, file) {
  const { stderr } = await run(ffmpeg, ['-hide_banner', '-i', file]).catch(
    error => error,
  );
  const video = stderr?.match(/Stream #.*?: Video: (\w+).*/);
  const size = video?.[0].match(/, (\d+)x\d+/);
  if (!size) throw new Error(`Couldn't read ${file} as a video`);
  // Some formats (e.g. GIF) only report "tbr", ffmpeg's best guess at the rate.
  const fps = video[0].match(/([\d.]+) fps/) ?? video[0].match(/([\d.]+) tbr/);
  return {
    codec: video[1],
    width: Number(size[1]),
    fps: fps ? Number(fps[1]) : 0,
    hasAudio: /Stream #.*?: Audio:/.test(stderr),
  };
}

// Two-pass constant-quality VP9. The second pass uses what the first learned
// about the whole video, which gives smaller files at the same quality.
async function encodeVp9(ffmpeg, inputFile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-media-'));
  const outputFile = path.join(dir, 'output.webm');
  const args = [
    ...['-hide_banner', '-loglevel', 'error', '-y', '-i', inputFile],
    // Cap the frame rate and width. The width has to be even for yuv420p.
    '-vf',
    `fps='min(source_fps,${MAX_FPS})',scale=w='2*trunc(min(iw,${MAX_WIDTH})/2)':h=-2`,
    ...['-c:v', 'libvpx-vp9', '-crf', String(VIDEO_CRF), '-b:v', '0'],
    ...['-deadline', 'good', '-cpu-used', '1', '-row-mt', '1'],
    // ffmpeg's default of a keyframe every 12 frames wastes a lot of bytes on
    // videos that barely change from frame to frame. This is one every ~10s.
    ...['-g', '250'],
    // GIFs decode to RGB, which browsers don't all support in VP9.
    ...['-pix_fmt', 'yuv420p'],
    ...['-an', '-map_metadata', '-1'],
    ...['-passlogfile', path.join(dir, 'pass')],
  ];
  try {
    await run(ffmpeg, [...args, '-pass', '1', '-f', 'null', os.devNull]);
    await run(ffmpeg, [...args, '-pass', '2', outputFile]);
    return fs.readFileSync(outputFile);
  } catch (error) {
    throw new Error(`ffmpeg failed: ${error.stderr?.trim() || error.message}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Re-encodes a video or GIF as a VP9 .webm. Docs videos autoplay muted, so
// any audio is removed, but only when `dropAudio` says that's intended.
async function optimizeVideo(file, input, { dropAudio = false } = {}) {
  const ffmpeg = await findFfmpeg();
  const { codec, width, fps, hasAudio } = await probeVideo(ffmpeg, file);
  const resized = width > MAX_WIDTH;
  // Allow for rates like 30.01 that ffmpeg reports for some recordings.
  const tooFast = fps > MAX_FPS + 0.5;
  const converted = CONVERTED.test(file);
  const video = { width, fps, hasAudio };

  // Like quantizing a PNG twice, re-encoding a video that's already been
  // compressed this well would lose a little quality each time.
  if (
    !converted &&
    !resized &&
    !tooFast &&
    !hasAudio &&
    ['vp9', 'av1'].includes(codec)
  ) {
    return { output: input, keepInput: true, ...video, notes: [] };
  }

  if (hasAudio && !dropAudio) {
    throw new Error(
      `${file} has an audio track. Docs videos play muted, so it would never ` +
        'be heard. Run again with --drop-audio to remove it.',
    );
  }

  const output = await encodeVp9(ffmpeg, file);
  const notes = [converted ? 'converted to VP9 .webm' : 'VP9'];
  if (tooFast) notes.push(`capped at ${MAX_FPS} fps`);
  if (hasAudio) notes.push('audio removed');
  return {
    output,
    // Always convert other formats, since the result is a different file.
    keepInput:
      !converted &&
      !resized &&
      !tooFast &&
      !hasAudio &&
      output.length >= input.length,
    ...video,
    notes,
  };
}

// The file an optimized version of `file` is written to. GIFs and other videos
// become .webm files.
export function optimizedPath(file) {
  return file.replace(CONVERTED, '.webm');
}

function describe(input, { output, keepInput, width, notes }) {
  if (keepInput) return `${formatBytes(input.length)}, already optimized`;
  const allNotes = [...notes];
  if (width > MAX_WIDTH) allNotes.push(`resized to ${MAX_WIDTH}px wide`);
  return `${formatBytes(input.length)} → ${formatBytes(output.length)} (${allNotes.join(', ')})`;
}

// Works out what optimizing `file` would do, and unless `write` is false, does
// it: replaces the file with a smaller version, or writes a .webm next to a
// GIF, .mov or .mp4. Returns what was (or would be) done, e.g.
// { description: "412 KB → 194 KB (palette)", savedBytes: 223000, ... }.
//
// A video with sound is only re-encoded (which removes the sound) when
// `dropAudio` is true.
export async function optimizeFile(
  file,
  { write = true, dropAudio = false } = {},
) {
  if (!OPTIMIZABLE.test(file)) {
    throw new Error(
      `Only .png, .webm, .gif, .mov and .mp4 files can be optimized: ${file}`,
    );
  }
  const input = fs.readFileSync(file);
  const result = PNG.test(file)
    ? await optimizePng(input)
    : await optimizeVideo(file, input, { dropAudio });
  const outputFile = optimizedPath(file);
  if (write && !result.keepInput) fs.writeFileSync(outputFile, result.output);
  return {
    file,
    outputFile,
    description: describe(input, result),
    width: result.width,
    fps: result.fps,
    hasAudio: result.hasAudio,
    inputBytes: input.length,
    outputBytes: result.keepInput ? input.length : result.output.length,
    savedBytes: result.keepInput ? 0 : input.length - result.output.length,
  };
}

// What `pnpm media optimize --check` says about a file, given the result of
// optimizeFile(file, { write: false }). Returns undefined when it's fine.
export function checkResult({
  file,
  width,
  fps,
  hasAudio,
  inputBytes,
  outputBytes,
}) {
  if (GIF.test(file)) {
    return {
      level: 'warning',
      message:
        `Consider a .webm video instead of a GIF. ` +
        `\`pnpm media optimize ${file}\` converts it ` +
        `(${formatBytes(outputBytes)} instead of ${formatBytes(inputBytes)}).`,
    };
  }
  if (width > MAX_WIDTH) {
    return {
      level: 'error',
      message: `${width}px wide, which is wider than the docs ever show (${MAX_WIDTH}px).`,
    };
  }
  if (fps > MAX_FPS + 0.5) {
    return {
      level: 'error',
      message: `${Math.round(fps)} fps, which is more than a docs video needs (${MAX_FPS}).`,
    };
  }
  if (hasAudio) {
    return {
      level: 'error',
      message:
        'Has an audio track, which docs videos never play since they autoplay muted.',
      dropAudio: true,
    };
  }
  const saved = inputBytes - outputBytes;
  if (
    saved > CHECK_MIN_SAVINGS_BYTES &&
    saved > inputBytes * CHECK_MIN_SAVINGS_RATIO
  ) {
    return {
      level: 'error',
      message:
        `Not optimized. It could be ${formatBytes(outputBytes)} instead of ` +
        `${formatBytes(inputBytes)} (${Math.round((saved / inputBytes) * 100)}% smaller).`,
    };
  }
  return undefined;
}

// How much of a screenshot's width or height can be plain background before
// emptyMargins() complains.
const MAX_EMPTY_MARGIN = 0.15;

// Describes the plain, single-color margins of a screenshot when they take up
// too much of it (e.g. "left 21% and right 21% are empty"), or returns
// undefined. Wide margins usually mean a scene captured the whole page when it
// should have targeted the part that matters. `allowed` is how many pixels of
// margin on each side were asked for (a scene's padding), which never count as
// too much.
export async function emptyMargins(
  input,
  allowed = { top: 0, right: 0, bottom: 0, left: 0 },
) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const background = [...data.subarray(0, channels)];
  const isBackground = (x, y) => {
    const i = (y * width + x) * channels;
    return background.every((value, c) => Math.abs(data[i + c] - value) <= 8);
  };
  const emptyColumn = x =>
    [...Array(height).keys()].every(y => isBackground(x, y));
  const emptyRow = y => [...Array(width).keys()].every(x => isBackground(x, y));
  const count = (length, empty, fromEnd) => {
    let n = 0;
    while (n < length && empty(fromEnd ? length - 1 - n : n)) n++;
    return n;
  };

  const margins = {
    left: count(width, emptyColumn, false) / width,
    right: count(width, emptyColumn, true) / width,
    top: count(height, emptyRow, false) / height,
    bottom: count(height, emptyRow, true) / height,
  };
  const size = { left: width, right: width, top: height, bottom: height };
  const wide = Object.entries(margins).filter(
    ([side, fraction]) =>
      fraction > MAX_EMPTY_MARGIN && fraction * size[side] > allowed[side],
  );
  if (!wide.length) return undefined;
  return (
    wide
      .map(([side, fraction]) => `${side} ${Math.round(fraction * 100)}%`)
      .join(' and ') + ' of the screenshot is empty'
  );
}

// Writes a new PNG to `file`, optimized. Unlike optimizeFile, this replaces
// the existing file whatever its size, since it has new content.
export async function writeOptimizedImage(file, input) {
  const result = await optimizePng(input);
  fs.writeFileSync(file, result.keepInput ? input : result.output);
  return describe(input, result);
}

// Writes a new video to `file`, re-encoded from the recording at
// `recordingFile`.
export async function writeOptimizedVideo(file, recordingFile) {
  const input = fs.readFileSync(recordingFile);
  const result = await optimizeVideo(recordingFile, input);
  fs.writeFileSync(file, result.keepInput ? input : result.output);
  return describe(input, result);
}

export function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
