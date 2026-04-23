import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';

const BASE_BRANCH = process.env.HAPPO_BASE_BRANCH || 'origin/main';

function getChangedFiles() {
  try {
    const out = execSync(`git diff --name-only ${BASE_BRANCH}...HEAD`, {
      encoding: 'utf-8',
    });
    return out
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn(
      `Unable to compute changed files against ${BASE_BRANCH}: ${error.message}`,
    );
    return null;
  }
}

function fileToComponent(file) {
  if (/(?:^|\/)_partials\//.test(file)) {
    return 'unknown';
  }

  const docsMatch = file.match(/^docs\/(.+)\.mdx?$/);
  if (docsMatch) {
    return `docs/${docsMatch[1]}`;
  }

  const versionedMatch = file.match(
    /^versioned_docs\/version-([^/]+)\/(.+)\.mdx?$/,
  );
  if (versionedMatch) {
    return `docs/${versionedMatch[1]}/${versionedMatch[2]}`;
  }

  return 'unknown';
}

async function enumerateSourceComponents() {
  const components = [];

  for await (const file of fs.promises.glob('docs/**/*.{md,mdx}')) {
    if (/(?:^|\/)_partials\//.test(file)) continue;
    const match = file.match(/^docs\/(.+)\.mdx?$/);
    if (match) components.push(`docs/${match[1]}`);
  }

  for await (const file of fs.promises.glob(
    'versioned_docs/version-*/**/*.{md,mdx}',
  )) {
    if (/(?:^|\/)_partials\//.test(file)) continue;
    const match = file.match(
      /^versioned_docs\/version-([^/]+)\/(.+)\.mdx?$/,
    );
    if (match) components.push(`docs/${match[1]}/${match[2]}`);
  }

  return components;
}

async function computeSkipList() {
  const changed = getChangedFiles();

  if (changed === null) {
    console.log('Could not determine changed files; running all components.');
    return null;
  }

  if (changed.length === 0) {
    console.log(
      `No files changed against ${BASE_BRANCH}; running all components.`,
    );
    return null;
  }

  const touched = new Set();
  for (const file of changed) {
    const component = fileToComponent(file);
    if (component === 'unknown') {
      console.log(
        `Non-doc change detected (${file}); running all components.`,
      );
      return null;
    }
    touched.add(component);
  }

  const allComponents = await enumerateSourceComponents();
  const toSkip = [];
  for (const component of allComponents) {
    if (touched.has(component)) continue;
    toSkip.push({ component, variant: 'default' });
    toSkip.push({ component, variant: 'dark' });
  }

  console.log(
    `Touched ${touched.size} doc component(s); skipping ${toSkip.length / 2}.`,
  );

  return toSkip.length > 0 ? toSkip : null;
}

async function main() {
  const passthroughArgs = process.argv.slice(2);
  const skipList = await computeSkipList();

  const happoArgs = [...passthroughArgs];
  if (skipList) {
    happoArgs.push('--skip', JSON.stringify(skipList));
  }

  const child = spawn('pnpm', ['exec', 'happo', ...happoArgs], {
    stdio: 'inherit',
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 1);
    }
  });
}

main();
