#!/usr/bin/env node
// Regenerates the screenshots and videos used in the docs. See media/README.md.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

import {
  checkResult,
  CHECKED,
  emptyMargins,
  optimizeFile,
  writeOptimizedImage,
  writeOptimizedVideo,
} from './optimize.mjs';
import { authProfiles, scenes, SceneSkipped, siteStyles } from './scenes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUTH_DIR = path.join(import.meta.dirname, '.auth');
const MEDIA_EXTENSIONS = /\.(png|jpe?g|gif|webp|mov|mp4|webm)$/i;

// Playwright's browsers are downloaded separately from its npm package.
async function launchBrowser(options) {
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (error.message.includes("Executable doesn't exist")) {
      throw new Error(
        "Playwright's Chromium isn't installed. Run: pnpm exec playwright install chromium",
      );
    }
    throw error;
  }
}

function authStatePath(profile) {
  return path.join(AUTH_DIR, `${profile}.json`);
}

// Returns a map of media path (e.g. static/img/foo.png) to the docs pages that
// reference it. Includes the legacy docs, which share many images with the
// current docs.
function findMediaReferences(pages = '{docs,versioned_docs}/**/*.{md,mdx}') {
  const references = new Map();
  for (const file of fs.globSync(pages, { cwd: ROOT })) {
    const content = fs
      .readFileSync(path.join(ROOT, file), 'utf-8')
      // Code blocks contain example URLs that aren't real media.
      .replace(/```[\s\S]*?```/g, '');
    for (const [, url] of content.matchAll(
      /["(](\/(?:img|video)\/[^")\s]+)/g,
    )) {
      if (!MEDIA_EXTENSIONS.test(url)) continue;
      const mediaPath = `static${url}`;
      if (!references.has(mediaPath)) references.set(mediaPath, new Set());
      references.get(mediaPath).add(file);
    }
  }
  return references;
}

function lastUpdated(file) {
  const date = execFileSync(
    'git',
    ['log', '-1', '--format=%ad', '--date=short', '--', file],
    { cwd: ROOT, encoding: 'utf-8' },
  ).trim();
  return date || 'uncommitted';
}

// A docs page as it's shown in this tool's output, e.g. "debugging.md" or
// "legacy/debugging.md".
function pageName(file) {
  return file.replace(/^docs\//, '').replace(/^versioned_docs\/version-/, '');
}

function sceneKind(scene) {
  if (scene.manual) return 'manual';
  if (scene.record) return 'video';
  return 'screenshot';
}

function status() {
  const references = findMediaReferences();
  const sceneByOutput = new Map(scenes.map(scene => [scene.output, scene]));
  const allPaths = new Set([...references.keys(), ...sceneByOutput.keys()]);

  const rows = [...allPaths].sort().map(mediaPath => {
    const scene = sceneByOutput.get(mediaPath);
    const usedIn = references.get(mediaPath);
    const exists = fs.existsSync(path.join(ROOT, mediaPath));
    return {
      media: mediaPath.replace(/^static\//, ''),
      updated: exists ? lastUpdated(mediaPath) : 'missing',
      size: exists
        ? `${Math.round(fs.statSync(path.join(ROOT, mediaPath)).size / 1024)} KB`
        : '-',
      scene: scene ? `${scene.id} (${sceneKind(scene)})` : '-',
      'used in': usedIn ? [...usedIn].map(pageName).join(', ') : 'unused',
    };
  });
  console.table(rows);

  const missingScenes = rows.filter(row => row.scene === '-').length;
  const unused = rows.filter(row => row['used in'] === 'unused').length;
  if (missingScenes) {
    console.log(`${missingScenes} media file(s) have no scene yet.`);
  }
  if (unused) {
    console.log(
      `${unused} scene output(s) are not referenced by any docs page.`,
    );
  }
}

async function login(profileName) {
  const profile = authProfiles[profileName];
  if (!profile) {
    throw new Error(
      `Unknown auth profile "${profileName}". Available: ${Object.keys(authProfiles).join(', ')}`,
    );
  }

  const browser = await launchBrowser({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(profile.loginUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await rl.question(
    `Log in to ${profile.name} in the browser window, then press Enter here. ` +
      `Use the ${profile.account} account. `,
  );
  rl.close();

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({ path: authStatePath(profileName) });
  await browser.close();
  console.log(`Saved ${profileName} session to ${authStatePath(profileName)}`);
}

// Screenshot of the scene's target element (plus padding), or of the whole
// viewport when the scene has no target. Returned as a buffer, so a failed
// capture never leaves a half-written file behind.
async function screenshotScene(page, scene) {
  const options = { animations: 'disabled', caret: 'hide' };

  if (scene.target) {
    // A target can be one locator or several. The screenshot covers every
    // visible, non-empty element they match.
    const locators = [scene.target(page)].flat();
    await locators[0].first().scrollIntoViewIfNeeded();
    const boxes = [];
    for (const locator of locators) {
      for (const element of await locator.all()) {
        const elementBox = await element.boundingBox();
        const hasContent = await element.evaluate(
          el =>
            el.textContent.trim() !== '' ||
            el.querySelector('img, svg, canvas, video'),
        );
        if (elementBox?.width && elementBox.height && hasContent) {
          boxes.push(elementBox);
        }
      }
    }
    if (!boxes.length) throw new Error('Target element is not visible');
    const left = Math.min(...boxes.map(b => b.x));
    const top = Math.min(...boxes.map(b => b.y));
    const box = {
      x: left,
      y: top,
      width: Math.max(...boxes.map(b => b.x + b.width)) - left,
      height: Math.max(...boxes.map(b => b.y + b.height)) - top,
    };

    // Measured in page coordinates and captured from the full page, so a
    // target taller than the viewport isn't cut off.
    const { scrollX, scrollY, pageWidth, pageHeight } = await page.evaluate(
      () => ({
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
      }),
    );
    const padding =
      typeof scene.padding === 'object'
        ? { top: 0, right: 0, bottom: 0, left: 0, ...scene.padding }
        : {
            top: scene.padding ?? 0,
            right: scene.padding ?? 0,
            bottom: scene.padding ?? 0,
            left: scene.padding ?? 0,
          };
    const x = Math.max(0, box.x + scrollX - padding.left);
    const y = Math.max(0, box.y + scrollY - padding.top);
    options.fullPage = true;
    options.clip = {
      x,
      y,
      width:
        Math.min(pageWidth, box.x + scrollX + box.width + padding.right) - x,
      height:
        Math.min(pageHeight, box.y + scrollY + box.height + padding.bottom) - y,
    };
  }

  if (scene.mask) {
    options.mask = scene.mask(page);
  }

  return page.screenshot(options);
}

// The empty margin, in screenshot pixels, that a scene's padding asks for on
// each side. The page's own spacing inside the target also looks empty, so a
// little more than the padding is allowed.
function allowedMargins(scene, scale) {
  const slack = 24;
  const sides = ['top', 'right', 'bottom', 'left'];
  return Object.fromEntries(
    sides.map(side => {
      const padding =
        typeof scene.padding === 'object'
          ? (scene.padding[side] ?? 0)
          : (scene.padding ?? 0);
      return [side, (padding + slack) * scale];
    }),
  );
}

// Draws a mouse pointer that follows mouse events, since headless browsers
// don't render one. Runs in the page on every navigation.
function installCursor() {
  const cursor = document.createElement('div');
  cursor.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 2l16 11-7 1.2-3.8 6.3z" fill="#000" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  Object.assign(cursor.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transform: 'translate(-100px, -100px)',
  });
  document.addEventListener(
    'mousemove',
    event => {
      cursor.style.transform = `translate(${event.clientX - 4}px, ${event.clientY - 2}px)`;
    },
    true,
  );
  document.addEventListener('DOMContentLoaded', () =>
    document.body.append(cursor),
  );
}

// Helpers passed to a scene's record() function.
//
// Videos are paced for someone seeing the UI for the first time: the pointer
// eases between elements at about the speed a person moves a mouse, rests on
// each element before clicking it, and gives the page a moment to react
// afterwards.
function recordingHelpers(page) {
  const viewport = page.viewportSize();
  let position = { x: viewport.width / 2, y: viewport.height / 2 };

  async function moveTo(locator) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    // The pointer is drawn below and to the right of where it points, so
    // pointing at the middle of an element covers its label. Point just past
    // the right end of the label instead (still inside the element), which
    // works for left-aligned menu items and centered button labels alike.
    // Elements without text, like icon buttons, get the middle.
    const textRight = await locator.evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      return element.textContent.trim() && rect.width ? rect.right : null;
    });
    const target = {
      x: textRight
        ? Math.min(textRight + 10, box.x + box.width - 6)
        : box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
    const distance = Math.hypot(target.x - position.x, target.y - position.y);
    // One mouse event per frame, eased in and out. mouse.move()'s own `steps`
    // fire without any delay, so the pointer would jump.
    const duration = Math.min(1000, Math.max(400, distance * 1.5));
    const frames = Math.round(duration / 16);
    const start = position;
    for (let frame = 1; frame <= frames; frame++) {
      const t = frame / frames;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      await page.mouse.move(
        start.x + (target.x - start.x) * eased,
        start.y + (target.y - start.y) * eased,
      );
      await page.waitForTimeout(16);
    }
    position = target;
  }

  return {
    moveTo,
    // Glides the pointer to the element and rests there, e.g. to point out a
    // menu item without choosing it.
    async hover(locator, ms = 1500) {
      await moveTo(locator);
      await page.waitForTimeout(ms);
    },
    // Glides the pointer to the element, rests so viewers can see what's about
    // to be clicked, clicks, then gives the page a moment to respond.
    async click(locator, { before = 700, after = 800 } = {}) {
      await moveTo(locator);
      await page.waitForTimeout(before);
      await page.mouse.click(position.x, position.y);
      await page.waitForTimeout(after);
    },
    pause: (ms = 1000) => page.waitForTimeout(ms),
  };
}

// Records the scene to a temporary file, then writes an optimized copy to
// `outputPath`. Playwright's recordings are several times larger than they
// need to be.
async function recordScene(page, scene, outputPath) {
  const viewport = page.viewportSize();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-media-'));
  const recordingPath = path.join(dir, 'recording.webm');
  try {
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.screencast.start({ path: recordingPath, size: viewport });
    try {
      // Let viewers take in the page before anything moves.
      await page.waitForTimeout(1200);
      await scene.record(page, recordingHelpers(page));
      // Hold the final frame for a moment so the loop doesn't jump straight
      // back to the start.
      await page.waitForTimeout(scene.holdLastFrame ?? 1500);
    } finally {
      await page.screencast.stop();
    }
    return await writeOptimizedVideo(outputPath, recordingPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function captureScene(browser, scene, { headed }) {
  const contextOptions = {
    viewport: scene.viewport ?? { width: 1400, height: 900 },
    // Capture at 2x so screenshots stay sharp on high-DPI screens.
    deviceScaleFactor: scene.record ? 1 : 2,
    colorScheme: scene.colorScheme ?? 'light',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    reducedMotion: scene.record ? 'no-preference' : 'reduce',
  };

  if (scene.auth) {
    const statePath = authStatePath(scene.auth);
    if (!fs.existsSync(statePath)) {
      throw new Error(
        `Needs a logged-in ${scene.auth} session. Run: pnpm media login ${scene.auth}`,
      );
    }
    contextOptions.storageState = statePath;
  }

  const context = await browser.newContext(contextOptions);

  // Added as an init script, rather than once, so it survives navigations
  // during a video.
  await context.addInitScript(
    ({ siteStyles, sceneCss }) => {
      const css = [siteStyles[location.hostname], sceneCss].filter(Boolean);
      if (!css.length) return;
      const style = document.createElement('style');
      style.textContent = css.join('\n');
      document.addEventListener('DOMContentLoaded', () =>
        document.head.append(style),
      );
    },
    { siteStyles, sceneCss: scene.css },
  );
  if (scene.record) await context.addInitScript(installCursor);

  const page = await context.newPage();
  if (headed) page.setDefaultTimeout(0);

  try {
    // A scene's url can be a function, for pages that have to be looked up
    // when the scene runs.
    const url = typeof scene.url === 'function' ? await scene.url() : scene.url;
    if (scene.setup) await scene.setup(page);
    // Some sites (e.g. GitHub) keep connections open for live updates, so
    // they never go network-idle. Those scenes wait for `load` instead.
    await page.goto(url, { waitUntil: scene.waitUntil ?? 'networkidle' });

    if (scene.prepare) await scene.prepare(page);

    const outputPath = path.join(ROOT, scene.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    if (scene.record) {
      return await recordScene(page, scene, outputPath);
    }
    const screenshot = await screenshotScene(page, scene);
    const result = await writeOptimizedImage(outputPath, screenshot);
    const margins = await emptyMargins(
      screenshot,
      allowedMargins(scene, contextOptions.deviceScaleFactor),
    );
    if (margins) {
      return (
        `${result}\n  warning: ${margins}. Give the scene a tighter \`target\` ` +
        '(see media/README.md).'
      );
    }
    return result;
  } finally {
    await context.close();
  }
}

async function capture(ids, { all, headed }) {
  let selected;
  if (all) {
    selected = scenes.filter(scene => !scene.manual);
  } else {
    const unknown = ids.filter(id => !scenes.some(scene => scene.id === id));
    if (unknown.length) {
      throw new Error(`Unknown scene(s): ${unknown.join(', ')}`);
    }
    selected = scenes.filter(scene => ids.includes(scene.id));
  }

  if (!selected.length) {
    console.log('Nothing to capture. Pass scene ids or --all.');
    return;
  }

  const browser = await launchBrowser({ headless: !headed });
  const failures = [];
  const skipped = [];
  const captured = [];
  for (const scene of selected) {
    if (scene.manual) {
      console.log(`- ${scene.id}: manual scene, skipping.\n  ${scene.manual}`);
      continue;
    }

    if (scene.auth && !fs.existsSync(authStatePath(scene.auth))) {
      console.log(
        `- ${scene.id}: skipping, needs a ${scene.auth} login. Run: pnpm media login ${scene.auth}`,
      );
      skipped.push(scene.id);
      continue;
    }

    process.stdout.write(`- ${scene.id} → ${scene.output} ... `);
    try {
      const result = await captureScene(browser, scene, { headed });
      console.log(result);
      captured.push(scene.output);
    } catch (error) {
      // A scene throws SceneSkipped when something it needs doesn't exist,
      // e.g. data that has to be set up by hand first.
      if (error instanceof SceneSkipped) {
        console.log(`skipping\n  ${error.message}`);
        skipped.push(scene.id);
        continue;
      }
      console.log('failed');
      console.error(`  ${error.message.split('\n')[0]}`);
      failures.push(scene.id);
    }
  }
  await browser.close();

  if (captured.length) printOlderMediaNearby(captured);
  if (skipped.length) {
    console.log(`\nSkipped: ${skipped.join(', ')}`);
  }
  if (failures.length) {
    console.error(`\nFailed: ${failures.join(', ')}`);
    process.exitCode = 1;
  }
}

// Media older than this on the same page as something just captured gets
// pointed out, since the page will look inconsistent.
const OLD_MEDIA_DAYS = 365;

// Lists older images and videos on the docs pages (current and legacy) that use
// the media that was just captured, e.g. an old GIF right above a new
// screenshot.
function printOlderMediaNearby(captured) {
  const references = findMediaReferences();
  const pagesToMedia = new Map();
  for (const [media, pages] of references) {
    for (const page of pages) {
      if (!pagesToMedia.has(page)) pagesToMedia.set(page, []);
      pagesToMedia.get(page).push(media);
    }
  }

  const cutoff = Date.now() - OLD_MEDIA_DAYS * 24 * 60 * 60 * 1000;
  const lines = [];
  for (const page of new Set(
    captured.flatMap(c => [...(references.get(c) ?? [])]),
  )) {
    const older = pagesToMedia
      .get(page)
      .filter(media => !captured.includes(media))
      .map(media => ({ media, updated: lastUpdated(media) }))
      .filter(({ updated }) => Date.parse(updated) < cutoff);
    for (const { media, updated } of older) {
      lines.push(`  ${pageName(page)}: ${media} (last updated ${updated})`);
    }
  }
  if (lines.length) {
    console.log(
      '\nThese pages also show media that is more than a year old. ' +
        'Consider updating them too:\n' +
        lines.join('\n'),
    );
  }
}

// Prints the docs pages that still use a GIF or video that was converted to
// .webm. They need a <video> tag pointing at the new file.
function printConvertedReferences(converted) {
  const references = findMediaReferences('{docs,versioned_docs}/**/*.{md,mdx}');
  for (const { file, outputFile } of converted) {
    const pages = references.get(path.relative(ROOT, path.resolve(file)));
    console.log(`\n${file} was converted to ${outputFile}.`);
    if (pages) {
      console.log(
        `Update these pages to show it with a <video> tag (see media/README.md):\n` +
          [...pages].map(page => `  ${page}`).join('\n'),
      );
    }
    console.log(`Then delete ${file}.`);
  }
}

// Quotes a file name for a command that can be copied into a shell.
function shellQuote(file) {
  return /^[\w@%+=:,./-]+$/.test(file)
    ? file
    : `'${file.replaceAll("'", `'\\''`)}'`;
}

// Prints a message GitHub Actions shows on the file in the PR.
function annotate(level, file, message) {
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::${level} file=${file}::${message}`);
  }
}

async function optimize(files, { check, 'drop-audio': dropAudio }) {
  if (!files.length) {
    console.log('Pass the image or video files to optimize.');
    return;
  }

  const failed = [];
  const needsDropAudio = [];
  const converted = [];
  for (const file of files) {
    if (check && !CHECKED.test(file)) {
      console.log(`- ${file}: not checked`);
      continue;
    }
    // The same work is done either way. --check only skips writing. It
    // measures videos with sound as they'd be without it, then reports the
    // sound as a problem.
    let result;
    try {
      result = await optimizeFile(file, {
        write: !check,
        dropAudio: check || dropAudio,
      });
    } catch (error) {
      console.error(`- ${file}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`- ${file}: ${result.description}`);

    if (check) {
      const problem = checkResult(result);
      if (!problem) continue;
      console.log(`  ${problem.level}: ${problem.message}`);
      annotate(problem.level, file, problem.message);
      if (problem.level === 'error') {
        (problem.dropAudio ? needsDropAudio : failed).push(file);
      }
    } else if (result.outputFile !== file) {
      converted.push(result);
    }
  }

  if (converted.length) printConvertedReferences(converted);
  if (failed.length || needsDropAudio.length) {
    const commands = [
      failed.length &&
        `pnpm media optimize ${failed.map(shellQuote).join(' ')}`,
      needsDropAudio.length &&
        `pnpm media optimize --drop-audio ${needsDropAudio.map(shellQuote).join(' ')}`,
    ].filter(Boolean);
    console.error(
      `\n${failed.length + needsDropAudio.length} file(s) should be optimized ` +
        `before they're committed. Run this, then commit the result:\n\n` +
        commands.map(command => `  ${command}\n`).join(''),
    );
    process.exitCode = 1;
  }
}

const USAGE = `Usage:
  pnpm media status                 List docs media, their scenes, and when they were last updated
  pnpm media capture <id...>        Capture specific scenes
  pnpm media capture --all          Capture every automated scene
  pnpm media optimize <file...>     Shrink PNGs and videos made by hand before committing them (a GIF is converted to .webm)
  pnpm media optimize --check <file...>
                                    Report what optimizing would save, without changing files. Fails if a file isn't optimized
  pnpm media login <profile>        Save a logged-in session for scenes that need one (${Object.keys(authProfiles).join(', ')})

Options:
  --drop-audio                      Remove the sound from videos when optimizing them (docs videos play muted)
  --headed                          Show the browser while capturing (handy when writing a scene)`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    'drop-audio': { type: 'boolean', default: false },
    headed: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

const [command, ...rest] = positionals;

if (values.help || !command) {
  console.log(USAGE);
} else if (command === 'status') {
  status();
} else if (command === 'capture') {
  await capture(rest, values);
} else if (command === 'optimize') {
  await optimize(rest, values);
} else if (command === 'login') {
  await login(rest[0]);
} else {
  console.error(`Unknown command "${command}"\n\n${USAGE}`);
  process.exitCode = 1;
}
