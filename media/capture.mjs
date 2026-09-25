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
  optimizeFile,
  writeOptimizedImage,
  writeOptimizedVideo,
} from './optimize.mjs';
import { authProfiles, scenes, siteStyles } from './scenes.mjs';

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
// reference it.
function findMediaReferences(pages = 'docs/**/*.{md,mdx}') {
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
      'used in': usedIn
        ? [...usedIn].map(f => f.replace(/^docs\//, '')).join(', ')
        : 'unused',
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
    const target = scene.target(page);
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error('Target element is not visible');

    const padding = scene.padding ?? 0;
    const viewport = page.viewportSize();
    const x = Math.max(0, box.x - padding);
    const y = Math.max(0, box.y - padding);
    options.clip = {
      x,
      y,
      width: Math.min(viewport.width, box.x + box.width + padding) - x,
      height: Math.min(viewport.height, box.y + box.height + padding) - y,
    };
  }

  if (scene.mask) {
    options.mask = scene.mask(page);
  }

  return page.screenshot(options);
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
function recordingHelpers(page) {
  const viewport = page.viewportSize();
  let position = { x: viewport.width / 2, y: viewport.height / 2 };

  async function moveTo(locator) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    const target = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const distance = Math.hypot(target.x - position.x, target.y - position.y);
    await page.mouse.move(target.x, target.y, {
      steps: Math.max(10, Math.round(distance / 12)),
    });
    position = target;
  }

  return {
    moveTo,
    // Glides the pointer to the element, then clicks it.
    async click(locator) {
      await moveTo(locator);
      await page.waitForTimeout(250);
      await page.mouse.click(position.x, position.y);
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
      await page.waitForTimeout(500);
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
    await page.goto(url, { waitUntil: 'networkidle' });

    if (scene.prepare) await scene.prepare(page);

    const outputPath = path.join(ROOT, scene.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    if (scene.record) {
      return await recordScene(page, scene, outputPath);
    }
    return await writeOptimizedImage(
      outputPath,
      await screenshotScene(page, scene),
    );
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
    } catch (error) {
      console.log('failed');
      console.error(`  ${error.message.split('\n')[0]}`);
      failures.push(scene.id);
    }
  }
  await browser.close();

  if (skipped.length) {
    console.log(`\nSkipped (not logged in): ${skipped.join(', ')}`);
  }
  if (failures.length) {
    console.error(`\nFailed: ${failures.join(', ')}`);
    process.exitCode = 1;
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
