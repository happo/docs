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

// Every docs video is a pair in static/video/: an AV1 .webm, the smallest by
// far, and an H.264 .mp4 for browsers that can't play AV1 (Safari on devices
// without an AV1 decoder, for one). src/components/Video.js offers both, and
// src/data/videos.json records each pair's size and codecs for it.
export const VIDEO_DIR = 'static/video';
const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'src/data/videos.json');

// Constant quality, lower is better (0-63 for AV1, 0-51 for H.264). Measured
// on Playwright recordings and on GIFs: AV1 at 58 is ~47 dB PSNR, like the VP9
// at CRF 36 it replaced, at half the size or less. H.264 at 33 is as sharp as
// the source in small UI text at 2x zoom (36 starts to smudge it);
// tune=stillimage keeps text crisp at some cost to PSNR, so PSNR undersells it.
const AV1_CRF = 58;
const H264_CRF = 33;
// SVT-AV1's speed (0-13, lower is slower and smaller). 4 takes seconds for a
// docs video with a current ffmpeg.
const AV1_PRESET = 4;
// A keyframe every 20 s at 30 fps. Docs videos barely change from frame to
// frame, and ffmpeg's defaults spend a lot of bytes on keyframes.
const KEYFRAME_INTERVAL = 600;

// Playwright records at 25 fps. Screen recordings made by hand are often 60
// fps, which is more than a docs video needs.
const MAX_FPS = 30;

// `pnpm media optimize --check` fails for PNGs that optimizing would shrink by
// more than both of these.
const CHECK_MIN_SAVINGS_RATIO = 0.1;
const CHECK_MIN_SAVINGS_BYTES = 10 * 1024;

const PNG = /\.png$/i;
const GIF = /\.gif$/i;
// A GIF, or a .mov or .mp4 from a screen recorder, becomes a pair.
export const OPTIMIZABLE = /\.(png|webm|gif|mov|mp4)$/i;
// What `pnpm media optimize --check` looks at.
export const CHECKED = /\.(png|webm|mp4|gif)$/i;

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

const run = promisify(execFile);

// Playwright's own ffmpeg can't encode AV1 or H.264. The ffmpeg-static package
// downloads one that can when `pnpm install` runs, but it's old, and on Apple
// silicon its AV1 encoder is many times slower than a current one. So an
// ffmpeg on the PATH with both encoders (`brew install ffmpeg`) comes first.
// Set FFMPEG_BIN to use a different one.
const ENCODERS = ['libsvtav1', 'libx264'];

async function hasEncoders(ffmpeg) {
  try {
    const { stdout } = await run(ffmpeg, ['-hide_banner', '-encoders']);
    return ENCODERS.every((encoder) => stdout.includes(` ${encoder} `));
  } catch {
    return false;
  }
}

let foundFfmpeg;
async function findFfmpeg() {
  foundFfmpeg ??= (async () => {
    if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
    if (await hasEncoders('ffmpeg')) return 'ffmpeg';
    try {
      const bundled = (await import('ffmpeg-static')).default;
      if (bundled && fs.existsSync(bundled)) return bundled;
    } catch {
      // Not installed. It's an optional dependency.
    }
    throw new Error(
      'Optimizing videos needs an ffmpeg with libsvtav1 and libx264. Install ' +
        'one (`brew install ffmpeg`), run `pnpm install` again (look for ' +
        'errors from ffmpeg-static), or set FFMPEG_BIN to one.',
    );
  })();
  return foundFfmpeg;
}

// The codec, width, frame rate and whether a video has sound. ffmpeg prints
// these when given only an input, and then exits with an error because there's
// no output.
async function probeVideo(ffmpeg, file) {
  const { stderr } = await run(ffmpeg, ['-hide_banner', '-i', file]).catch(
    (error) => error,
  );
  const video = stderr?.match(/Stream #.*?: Video: (\w+).*/);
  const size = video?.[0].match(/, (\d+)x(\d+)/);
  if (!size) throw new Error(`Couldn't read ${file} as a video`);
  // Some formats (e.g. GIF) only report "tbr", ffmpeg's best guess at the rate.
  const fps = video[0].match(/([\d.]+) fps/) ?? video[0].match(/([\d.]+) tbr/);
  return {
    codec: video[1],
    width: Number(size[1]),
    height: Number(size[2]),
    fps: fps ? Number(fps[1]) : 0,
    hasAudio: /Stream #.*?: Audio:/.test(stderr),
  };
}

// Caps the frame rate and width (which has to be even for yuv420p), and
// converts to the BT.709 colors browsers assume for web video. Left to its
// defaults, ffmpeg converts a GIF's RGB with the wrong matrix, and its colors
// come out shifted.
const VIDEO_FILTER =
  `fps='min(source_fps,${MAX_FPS})',` +
  `scale=w='2*trunc(min(iw,${MAX_WIDTH})/2)':h=-2:out_color_matrix=bt709:out_range=tv,` +
  'format=yuv420p';
const BT709 = [
  ...['-colorspace', 'bt709', '-color_primaries', 'bt709'],
  ...['-color_trc', 'bt709', '-color_range', 'tv'],
];
const CODEC_ARGS = {
  webm: [
    ...['-c:v', 'libsvtav1', '-preset', String(AV1_PRESET)],
    ...['-crf', String(AV1_CRF)],
  ],
  mp4: [
    ...['-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'stillimage'],
    ...['-crf', String(H264_CRF), '-profile:v', 'high'],
    // Lets a browser start playing before the whole file has loaded.
    ...['-movflags', '+faststart'],
  ],
};
const CODEC = { webm: 'av1', mp4: 'h264' };
const FORMATS = ['webm', 'mp4'];

// H.264 level 4.0 is what older phones promise to play, and fits any frame up
// to 8192 macroblocks (1920x1088) at 30 fps. Asking for it makes x264 use
// fewer reference frames; left alone, veryslow marks even small videos 5.1.
const H264_LEVEL_4_MACROBLOCKS = 8192;

async function encode(
  ffmpeg,
  inputFile,
  format,
  outputFile,
  { width, height },
) {
  const scale = Math.min(1, MAX_WIDTH / width);
  const macroblocks =
    Math.ceil((width * scale) / 16) * Math.ceil((height * scale) / 16);
  const level =
    format === 'mp4' && macroblocks <= H264_LEVEL_4_MACROBLOCKS
      ? ['-level:v', '4.0']
      : [];
  try {
    await run(ffmpeg, [
      ...['-hide_banner', '-loglevel', 'error', '-y', '-i', inputFile],
      ...['-vf', VIDEO_FILTER, ...CODEC_ARGS[format], ...level],
      ...['-g', String(KEYFRAME_INTERVAL), ...BT709],
      ...['-an', '-map_metadata', '-1', outputFile],
    ]);
  } catch (error) {
    throw new Error(`ffmpeg failed: ${error.stderr?.trim() || error.message}`);
  }
}

// The codecs parameter of a video's type (av01.0.04M.08, avc1.640028), which
// is how a browser knows it can't play the AV1 file without downloading it,
// and falls back to the .mp4. Read from the headers of the video stream.
async function codecString(ffmpeg, file, format) {
  const { stderr } = await run(
    ffmpeg,
    [
      ...['-hide_banner', '-i', file, '-map', '0:v:0', '-c', 'copy'],
      ...['-bsf:v', 'trace_headers', '-frames:v', '1', '-f', 'null', '-'],
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const field = (name) => {
    const match = stderr.match(
      new RegExp(`\\s${RegExp.escape(name)}\\s+[01]+ = (\\d+)`),
    );
    return match ? Number(match[1]) : undefined;
  };
  const hex = (value) => value.toString(16).padStart(2, '0');
  if (format === 'webm') {
    const level = field('seq_level_idx[0]');
    if (level === undefined) {
      throw new Error(`Couldn't read the AV1 headers of ${file}`);
    }
    const tier = field('seq_tier[0]') ? 'H' : 'M';
    const depth = field('high_bitdepth') ? '10' : '08';
    return `av01.${field('seq_profile')}.${String(level).padStart(2, '0')}${tier}.${depth}`;
  }
  const profile = field('profile_idc');
  if (profile === undefined) {
    throw new Error(`Couldn't read the H.264 headers of ${file}`);
  }
  const constraints = [0, 1, 2, 3, 4, 5].reduce(
    (byte, n) => byte | (field(`constraint_set${n}_flag`) << (7 - n)),
    0,
  );
  return `avc1.${hex(profile)}${hex(constraints)}${hex(field('level_idc'))}`;
}

export function readManifest() {
  return fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
    : {};
}

function writeManifest(manifest) {
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
}

// A docs video's name: static/video/happo-view-source.webm and a GIF it was
// made from are both happo-view-source.
export function videoName(file) {
  return path.basename(file).replace(/\.[^.]+$/, '');
}

export function videoPaths(name) {
  return Object.fromEntries(
    FORMATS.map((format) => [
      format,
      path.join(ROOT, VIDEO_DIR, `${name}.${format}`),
    ]),
  );
}

// What's wrong with a video's pair: each file's problems (missing, the wrong
// codec, too wide or fast, sound), the pair's (files of different sizes), and
// the manifest's (an entry that doesn't match). Also returns the manifest
// entry the pair should have, when it can be worked out. `paths` checks other
// files as the pair, such as new encodes before they replace it; the
// manifest is only compared for the pair itself.
async function inspectPair(ffmpeg, name, paths = videoPaths(name)) {
  const isPair = sameFiles(paths, name);
  const problems = { webm: [], mp4: [], pair: [], manifest: [] };
  const probes = {};
  for (const format of FORMATS) {
    if (!fs.existsSync(paths[format])) {
      problems[format].push(`${VIDEO_DIR}/${name}.${format} is missing`);
      continue;
    }
    const probe = await probeVideo(ffmpeg, paths[format]);
    probes[format] = probe;
    const wrong = problems[format];
    if (probe.codec !== CODEC[format]) {
      wrong.push(`is ${probe.codec}, not ${CODEC[format]}`);
    }
    if (probe.width > MAX_WIDTH) {
      wrong.push(`is ${probe.width}px wide, wider than the docs ever show`);
    }
    // Allow for rates like 30.01 that ffmpeg reports for some recordings.
    if (probe.fps > MAX_FPS + 0.5) {
      wrong.push(`is ${Math.round(probe.fps)} fps, more than ${MAX_FPS}`);
    }
    if (probe.hasAudio) wrong.push('has sound, which docs videos never play');
  }

  let entry;
  if (!problems.webm.length && !problems.mp4.length) {
    const { webm, mp4 } = probes;
    if (webm.width !== mp4.width || webm.height !== mp4.height) {
      // Neither file says which size is right, so both are made again from
      // one source (see optimizeVideo).
      problems.pair.push(
        `the .webm is ${webm.width}x${webm.height} but the .mp4 is ` +
          `${mp4.width}x${mp4.height}; make both again from the original ` +
          'recording with `pnpm media optimize <recording>`',
      );
    } else {
      entry = {
        width: webm.width,
        height: webm.height,
        webm: await codecString(ffmpeg, paths.webm, 'webm'),
        mp4: await codecString(ffmpeg, paths.mp4, 'mp4'),
      };
      const recorded = readManifest()[name];
      if (isPair && JSON.stringify(recorded) !== JSON.stringify(entry)) {
        problems.manifest.push(
          recorded
            ? 'src/data/videos.json has an out-of-date entry for it'
            : 'src/data/videos.json has no entry for it',
        );
      }
    }
  }
  return { paths, problems, probes, entry };
}

function sameFiles(paths, name) {
  const pair = videoPaths(name);
  return FORMATS.every((format) => paths[format] === pair[format]);
}

// What's wrong with src/data/videos.json as a whole, without looking inside
// any file: an entry whose files are gone, or a file in static/video/ with no
// entry. Catches a deleted video that `--check` on changed files never sees.
export function manifestProblems() {
  const manifest = readManifest();
  const problems = [];
  for (const name of Object.keys(manifest)) {
    for (const [format, file] of Object.entries(videoPaths(name))) {
      if (!fs.existsSync(file)) {
        problems.push(
          `src/data/videos.json lists ${name}, but ${VIDEO_DIR}/${name}.${format} ` +
            "doesn't exist. Remove its entry, or make the pair again.",
        );
      }
    }
  }
  const dir = path.join(ROOT, VIDEO_DIR);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  for (const file of files.filter((file) => /\.(webm|mp4)$/i.test(file))) {
    if (!manifest[videoName(file)]) {
      problems.push(
        `${VIDEO_DIR}/${file} isn't in src/data/videos.json. Run ` +
          `\`pnpm media optimize ${VIDEO_DIR}/${file}\`, or delete it.`,
      );
    }
  }
  return problems;
}

// Encodes `inputFile` as the formats in `formats`, into static/video/ under
// `name`, and records the pair in src/data/videos.json. The new files are
// checked, with whichever file of the pair is kept, before anything is
// replaced, so a failed repair leaves the pair as it was. Returns the bytes
// of each file written.
async function writePair(ffmpeg, inputFile, name, formats) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-media-'));
  try {
    const paths = videoPaths(name);
    const written = {};
    // Encoded to temporary files first, since the input can be one of the
    // files being replaced.
    const input = await probeVideo(ffmpeg, inputFile);
    for (const format of formats) {
      await encode(
        ffmpeg,
        inputFile,
        format,
        path.join(dir, `out.${format}`),
        input,
      );
    }
    const candidate = Object.fromEntries(
      FORMATS.map((format) => [
        format,
        formats.includes(format)
          ? path.join(dir, `out.${format}`)
          : paths[format],
      ]),
    );
    const { problems, entry } = await inspectPair(ffmpeg, name, candidate);
    const left = [...problems.webm, ...problems.mp4, ...problems.pair];
    if (left.length) {
      throw new Error(
        `${name} wouldn't be right, so nothing was changed: ${left.join('; ')}`,
      );
    }
    fs.mkdirSync(path.dirname(paths.webm), { recursive: true });
    for (const format of formats) {
      fs.copyFileSync(candidate[format], paths[format]);
      written[format] = fs.statSync(paths[format]).size;
    }
    writeManifest({ ...readManifest(), [name]: entry });
    return written;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Makes the pair for a video: from a GIF or a screen recording (a .mov or
// .mp4 anywhere), or from either file of a pair that isn't right yet, such as
// an old VP9 .webm. A file of the pair that's already right is left alone,
// since re-encoding it would lose a little quality each time. Docs videos
// play muted, so sound is removed, but only when `dropAudio` says that's
// intended. With `write` false, only says what's wrong.
async function optimizeVideo(file, { write = true, dropAudio = false } = {}) {
  const ffmpeg = await findFfmpeg();
  const name = videoName(file);
  const inspected = await inspectPair(ffmpeg, name);
  const inPair = Object.values(inspected.paths).includes(path.resolve(file));
  // A new docs video, which needs a <Video> on a page: from a GIF or a .mov,
  // or a screen recorder's .mp4 saved where the pair's goes.
  const isNew = !inPair || !readManifest()[name];
  const result = {
    kind: 'video',
    name,
    converted: isNew,
    inputBytes: fs.statSync(file).size,
    problems: inPair
      ? Object.values(inspected.problems).flat()
      : [`${file} isn't a docs video yet`],
  };
  if (!result.problems.length) {
    return { ...result, description: describeVideo(result) };
  }
  if (!write) {
    const input = await probeVideo(ffmpeg, file);
    return {
      ...result,
      needsDropAudio: input.hasAudio,
      description: describeVideo(result),
    };
  }

  const input = await probeVideo(ffmpeg, file);
  if (input.hasAudio && !dropAudio) {
    throw new Error(
      `${file} has an audio track. Docs videos play muted, so it would never ` +
        'be heard. Run again with --drop-audio to remove it.',
    );
  }
  // A new video gets both files, even if it's already an H.264 .mp4, since
  // it wasn't encoded for the docs. So does a pair whose files disagree about
  // its size, both from the file given. Otherwise only what isn't right is
  // re-encoded.
  const formats =
    isNew || inspected.problems.pair.length
      ? FORMATS
      : FORMATS.filter((format) => inspected.problems[format].length);
  const written = await writePair(ffmpeg, file, name, formats);
  const notes = [];
  if (input.width > MAX_WIDTH) notes.push(`resized to ${MAX_WIDTH}px wide`);
  if (input.fps > MAX_FPS + 0.5) notes.push(`capped at ${MAX_FPS} fps`);
  if (input.hasAudio) notes.push('audio removed');
  const done = { ...result, written, notes, problems: [] };
  return { ...done, description: describeVideo(done) };
}

function describeVideo({ name, inputBytes, problems, written, notes = [] }) {
  if (written) {
    const files = FORMATS.filter((format) => written[format])
      .map((format) => `${name}.${format} ${formatBytes(written[format])}`)
      .join(' + ');
    return (
      `${formatBytes(inputBytes)} → ${files || 'src/data/videos.json updated'}` +
      (notes.length ? ` (${notes.join(', ')})` : '')
    );
  }
  if (!problems.length) return `${formatBytes(inputBytes)}, already optimized`;
  return problems.join('; ');
}

function describe(input, { output, keepInput, width, notes }) {
  if (keepInput) return `${formatBytes(input.length)}, already optimized`;
  const allNotes = [...notes];
  if (width > MAX_WIDTH) allNotes.push(`resized to ${MAX_WIDTH}px wide`);
  return `${formatBytes(input.length)} → ${formatBytes(output.length)} (${allNotes.join(', ')})`;
}

// Works out what optimizing `file` would do, and unless `write` is false, does
// it. A PNG is replaced with a smaller version. A video becomes (or is made
// right as) a pair in static/video/, recorded in src/data/videos.json. Returns
// what was (or would be) done, e.g.
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
  if (!PNG.test(file)) {
    return { file, ...(await optimizeVideo(file, { write, dropAudio })) };
  }
  const input = fs.readFileSync(file);
  const result = await optimizePng(input);
  if (write && !result.keepInput) fs.writeFileSync(file, result.output);
  return {
    file,
    kind: 'image',
    description: describe(input, result),
    width: result.width,
    inputBytes: input.length,
    outputBytes: result.keepInput ? input.length : result.output.length,
    savedBytes: result.keepInput ? 0 : input.length - result.output.length,
  };
}

// What `pnpm media optimize --check` says about a file, given the result of
// optimizeFile(file, { write: false }). Returns undefined when it's fine.
export function checkResult(result) {
  const { file } = result;
  if (result.kind === 'video') {
    if (GIF.test(file)) {
      return {
        level: 'warning',
        message:
          'Consider a video instead of a GIF: `pnpm media optimize ' +
          `${file}\` makes one to show with <Video> (see media/README.md).`,
      };
    }
    if (!result.problems.length) return undefined;
    return {
      level: 'error',
      message: result.problems.join('; '),
      dropAudio: result.needsDropAudio,
    };
  }
  const { width, inputBytes, outputBytes } = result;
  if (width > MAX_WIDTH) {
    return {
      level: 'error',
      message: `${width}px wide, which is wider than the docs ever show (${MAX_WIDTH}px).`,
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
  const emptyColumn = (x) =>
    [...Array(height).keys()].every((y) => isBackground(x, y));
  const emptyRow = (y) =>
    [...Array(width).keys()].every((x) => isBackground(x, y));
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

// Writes the pair for a scene's video (`file` is its .webm), re-encoded from
// the recording at `recordingFile`, and records it in src/data/videos.json.
export async function writeOptimizedVideo(file, recordingFile) {
  const ffmpeg = await findFfmpeg();
  const inputBytes = fs.statSync(recordingFile).size;
  const name = videoName(file);
  const written = await writePair(ffmpeg, recordingFile, name, FORMATS);
  return describeVideo({ name, inputBytes, written, problems: [] });
}

export function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
