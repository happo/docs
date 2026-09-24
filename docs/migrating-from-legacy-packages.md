---
id: migrating-from-legacy-packages
title: Migrating from Legacy Happo Packages
---

This guide will help you migrate from the legacy Happo packages (`happo.io`,
`happo-cypress`, `happo-playwright`, etc.) to the new unified `happo` package.

## Overview

The new `happo` package is a modern, TypeScript-first rewrite that consolidates
functionality from multiple legacy packages into a single, unified package. This
migration brings several benefits:

- **Unified package**: One package instead of multiple (`happo.io`,
  `happo-cypress`, `happo-playwright`, `happo-plugin-storybook`, `happo-e2e`,
  and `happo-static`)
- **TypeScript support**: Built-in TypeScript support with full type definitions
- **Modern ES modules**: Uses ES modules
- **Improved configuration**: More flexible configuration file formats
- **Simplified target configuration**: Plain object syntax instead of
  class-based targets
- **One CLI for every CI**: A single `happo` command replaces the `happo-ci-*`
  scripts and detects your CI environment automatically
- **Simpler authentication**: `HAPPO_API_KEY` and `HAPPO_API_SECRET` are read
  from the environment automatically, and you can sign in through the browser
  when running locally

## Breaking Changes

### Node.js Version Requirement

The new `happo` package requires **Node.js 22.18.0 or later** (specifically
`^22.18.0 || ^23.6.0 || >=24.0.0`). These versions can load TypeScript
configuration files like `happo.config.ts` natively. Ensure your local
environment and CI meet this requirement before migrating.

### Package Installation

Remove all legacy Happo packages and install the new unified `happo` package:

```bash
npm uninstall happo.io \
  happo-cypress \
  happo-playwright \
  happo-e2e \
  happo-plugin-storybook \
  happo-static
npm install --save-dev happo
```

The new `happo` package replaces all of these legacy packages. All functionality
is now included in the single unified package.

Make sure your `package.json` has a `happo` script, so that `npm run happo`
works:

```json title="package.json"
{
  "scripts": {
    "happo": "happo"
  }
}
```

### Configuration File Format

The legacy `.happo.js` file is no longer read. The new package looks for a
`happo.config.{js,mjs,cjs,ts,mts,cts}` file, and encourages TypeScript/ES
modules:

**Before (legacy):**

```js title=".happo.js"
const { RemoteBrowserTarget } = require('happo.io');

module.exports = {
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,
  targets: {
    'chrome-desktop': new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
    }),
  },
};
```

**After (new):**

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  project: 'default',

  integration: {
    type: 'storybook',
    configDir: '.storybook',
  },

  targets: {
    'chrome-desktop': {
      type: 'chrome',
      viewport: '1024x768',
    },
  },
});
```

The `HAPPO_API_KEY` and `HAPPO_API_SECRET` environment variables are picked up
automatically, so you no longer need to reference them in the config file. You
can still set `apiKey` and `apiSecret` explicitly if you store the credentials
under different names. See [Authentication](cli.mdx#authentication) for more
details.

**Watch out for defaults:** If you leave out `integration`, it defaults to
`{ type: 'storybook' }`. If you leave out `targets`, a single `chrome` target
with a `1024x768` viewport is used. Cypress and Playwright users must set
`integration.type` explicitly.

### Target Configuration

The new package uses plain objects instead of the `RemoteBrowserTarget` class
when configuring `targets`.

**Before (legacy):**

```js title=".happo.js"
const { RemoteBrowserTarget } = require('happo.io');

module.exports = {
  // ... rest of config

  targets: {
    'firefox-desktop': new RemoteBrowserTarget('firefox', {
      viewport: '1024x768',
      chunks: 2,
      freezeAnimations: 'last-frame',
    }),
    'chrome-mobile': new RemoteBrowserTarget('chrome', {
      viewport: '375x667',
    }),
    'ios-safari': new RemoteBrowserTarget('ios-safari', {
      viewport: '375x667',
    }),
  },
};
```

**After (new):**

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  // ... rest of config

  targets: {
    'firefox-desktop': {
      type: 'firefox',
      viewport: '1024x768',
      chunks: 2,
      freezeAnimations: 'last-frame',
    },
    'chrome-mobile': {
      type: 'chrome',
      viewport: '375x667',
    },
    'ios-safari': {
      type: 'ios-safari',
    },
  },
});
```

**Key changes:**

- Remove `new RemoteBrowserTarget()` wrapper
- Use `type` instead of the first constructor argument
- Target options keep their names (viewport, chunks, freezeAnimations, etc.),
  but some defaults have changed. See
  [Changed Target Defaults](#changed-target-defaults).
- Mobile Safari targets (`ios-safari`, `ipad-safari`) don't require a viewport
  (they use a fixed size)

#### Dynamic targets in Cypress/Playwright screenshots

The dynamic target objects you can pass to a `happoScreenshot` call's `targets`
option use the same renamed field — `browser` becomes `type`.

**Before (legacy):**

```js
await happoScreenshot(heroImage, {
  component: 'Footer',
  variant: 'Default',
  targets: [{ name: 'firefox-small', browser: 'firefox', viewport: '400x800' }],
});
```

**After (new):**

```js
await happoScreenshot(heroImage, {
  component: 'Footer',
  variant: 'Default',
  targets: [{ name: 'firefox-small', type: 'firefox', viewport: '400x800' }],
});
```

### Changed Target Defaults

Three target options have new defaults. Expect some diffs on your first run
after migrating if you relied on the old defaults.

| Option                                                                 | Legacy default  | New default    |
| ---------------------------------------------------------------------- | --------------- | -------------- |
| [`freezeAnimations`](configuration.md#target-freezeanimations)         | `'first-frame'` | `'last-frame'` |
| [`prefersReducedMotion`](configuration.md#target-prefersreducedmotion) | `false`         | `true`         |
| [`allowPointerEvents`](configuration.md#target-allowpointerevents)     | `false`         | `true`         |

- **`freezeAnimations`**: Animations are now frozen on their last frame instead
  of their first frame.
- **`prefersReducedMotion`**: The browser now prefers reduced motion, so
  `@media (prefers-reduced-motion: reduce)` rules apply.
- **`allowPointerEvents`**: Happo no longer injects
  `* { pointer-events: none !important; }`. This makes mouse interactions work
  in tests, but hover styles triggered by the system mouse pointer can now show
  up in screenshots.

To get the legacy behavior back, set the old values explicitly:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  // ... rest of config
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      freezeAnimations: 'first-frame',
      prefersReducedMotion: false,
      allowPointerEvents: false,
    },
  },
});
```

### Compare Threshold

The deprecated top-level `compareThreshold` option has been replaced by a
[`deepCompare`](configuration.md#deepcompare) object. `compareThreshold` is
required inside it, and the other settings are optional.

**Before (legacy):**

```js title=".happo.js"
module.exports = {
  compareThreshold: 0.005,

  // ... rest of config
};
```

**After (new):**

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  deepCompare: {
    compareThreshold: 0.005,
  },

  // ... rest of config
});
```

You can also leave `deepCompare` out and configure deep compare in your project
settings instead. See [Compare with a threshold](compare-threshold.md).

### CLI Commands

The CLI is now provided by the `happo` package instead of `happo.io`, and the
default command runs Happo:

**Before (legacy):**

```bash
npx happo run
```

**After (new):**

```bash
npx happo
```

#### Removed subcommands

The new CLI has three commands: the default command, `finalize`, and `flake`.
These legacy subcommands have been removed:

- `happo run [sha]` -- use `happo` instead. To set the SHA, use `--afterSha`.
- `happo has-report <sha>` -- this is no longer needed. The CLI looks up
  baseline reports on its own.
- `happo compare <sha1> <sha2>` -- comparisons are created automatically as part
  of `happo`. Use `--beforeSha` and `--afterSha` to control which commits are
  compared. The `--dry-run` flag is gone as well. Try out threshold values with
  the [`deepCompare`](configuration.md#deepcompare) option instead.
- `happo dev` -- this is no longer supported.

See the [CLI documentation](cli.mdx) for all commands and options.

#### Removed `happo-ci*` scripts

The following scripts have all been replaced by the main `happo` CLI command:

- `happo-ci`
- `happo-ci-github-actions`
- `happo-ci-travis`
- `happo-ci-circleci`
- `happo-ci-azure-pipelines`

The main `happo` CLI command now detects these CI environments automatically.
For example, in a GitHub Actions workflow:

**Before (legacy):**

```yaml title=".github/workflows/happo.yml"
- run: npx --package=happo.io happo-ci-github-actions
  env:
    HAPPO_API_KEY: ${{ secrets.HAPPO_API_KEY }}
    HAPPO_API_SECRET: ${{ secrets.HAPPO_API_SECRET }}
```

**After (new):**

```yaml title=".github/workflows/happo.yml"
- run: npx happo
  env:
    HAPPO_API_KEY: ${{ secrets.HAPPO_API_KEY }}
    HAPPO_API_SECRET: ${{ secrets.HAPPO_API_SECRET }}
```

See [Continuous Integration](continuous-integration.md) for complete examples
for each CI provider.

#### Base branch defaults to `origin/main`

When looking for a baseline, the CLI compares against the merge base with
`origin/main`. If your default branch has another name, such as `master` or
`dev`, pass it with `--baseBranch`:

```bash
npx happo --baseBranch origin/master
```

#### Baselines must come from your default branch

Legacy `happo-ci` scripts had a sync mode (`HAPPO_IS_ASYNC=false`) that checked
out the base commit, installed dependencies (with `INSTALL_CMD`), and built a
baseline report on the fly. The new CLI never checks out other commits. Instead,
it compares against an existing report for the merge base commit, or for one of
the commits before it (see `--fallbackShas` and `--fallbackShasCount`).

This means **you need to run Happo on pushes to your default branch**, not only
on pull requests. Otherwise pull requests will have no baseline to compare
against.

#### Removed `--allow-failures` flag

The `--allow-failures` flag from the `happo-e2e` command was removed. To allow
failures, set `integration.allowFailures: true` in your configuration file
instead.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'cypress',
    allowFailures: true,
  },

  // ... rest of config
});
```

#### Removed `--port` flag

The `happo-e2e --port` flag was removed. The `happo` wrapper now picks a free
port automatically, so you can drop the flag.

### Integration Types

The new package uses an `integration` field in the configuration to specify the
type of integration.

#### Custom Bundle Integration

**Before (legacy):**

```js title=".happo.js"
module.exports = {
  generateStaticPackage: () => ({ path: './static' }),

  // ... rest of config
};
```

**After (new):**

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'custom',
    build: async () => ({
      rootDir: './tmp/happo-custom',
      entryPoint: 'bundle.js',
    }),
  },

  // ... rest of config
});
```

The returned object from `build` has to include a `rootDir` (path to the folder
where files have been built, e.g. `/foo/bar/build`) and `entryPoint` (local file
name of the built JavaScript bundle, e.g. `bundle.js`). It can optionally
include an `estimatedSnapsCount`, which lets Happo split the work across
multiple workers automatically.

**Note:** If you're using the `happo-static` library, replace any `happo-static`
imports with imports for `happo/custom`.

#### Storybook Integration

**Before (legacy):**

```js title=".happo.js"
const happoPluginStorybook = require('happo-plugin-storybook');

module.exports = {
  plugins: [
    happoPluginStorybook({
      configDir: '.storybook',
    }),
  ],

  // ... rest of config
};
```

**After (new):**

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'storybook',
    configDir: '.storybook',
  },

  // ... rest of config
});
```

The `configDir`, `staticDir`, `outputDir`, and `usePrebuiltPackage` options you
passed to `happoPluginStorybook` move to the `integration` object unchanged.

##### Storybook preset

**Before (legacy):**

```js title=".storybook/main.js"
export default {
  addons: ['happo-plugin-storybook/preset'],

  // ... rest of storybook config
};
```

**After (new):**

```js title=".storybook/main.js"
export default {
  addons: ['happo/storybook/preset'],

  // ... rest of storybook config
};
```

##### Storybook register and decorator

**Before (legacy):**

```js title=".storybook/preview.js"
import 'happo-plugin-storybook/register';
import happoDecorator from 'happo-plugin-storybook/decorator';
```

**After (new):**

```js title=".storybook/preview.js"
import happoDecorator from 'happo/storybook/decorator';
```

Since happo v6.19.1, the `happo` CLI adds its client runtime to the Storybook
package it builds, so you can delete the `register` import. Keep it, as
`happo/storybook/register`, only if you use one of its helpers, such as
[`setThemeSwitcher`](storybook.mdx#dark-mode-and-themes) or
[`forceHappoScreenshot`](storybook.mdx#using-forcehapposcreenshot):

```js title=".storybook/preview.js"
import { setThemeSwitcher } from 'happo/storybook/register';
```

The decorator is optional too. Since v6.19.1 it works with every Storybook
renderer, not only `@storybook/react`.

#### Cypress Integration

The configuration changes for Cypress integration:

**Before (legacy):**

```js title=".happo.js"
const { RemoteBrowserTarget } = require('happo.io');

module.exports = {
  targets: {
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
    }),
  },

  // ... rest of config
};
```

**After (new):**

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'cypress',
  },

  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
    },
  },

  // ... rest of config
});
```

In your Cypress test files, update your imports to use the new package:

**Before (legacy):**

```js title="cypress/support/commands.js"
import 'happo-cypress';
```

**After (new):**

```js title="cypress/support/commands.js"
import 'happo/cypress';
```

And in your `cypress.config.js`, update the task import. The `happo` package is
published as an ES module, so use `import`:

**Before (legacy):**

```js title="cypress.config.js"
const happoTask = require('happo-cypress/task');
```

**After (new):**

```js title="cypress.config.js"
import happoTask from 'happo/cypress/task';
```

The `happoTask.register(on)` call inside `setupNodeEvents` stays the same.

The `happo-e2e` wrapper command is replaced by the main `happo` command. Replace
`npx happo-e2e -- npx cypress run` with `npx happo -- cypress run`.

The `HAPPO_ENABLED` environment variable for `cypress open` has been removed.
Happo only runs when Cypress is wrapped by the `happo` command, and is disabled
with `cypress open`. See
[Usage with `cypress open`](cypress.mdx#usage-with-cypress-open).

##### Removed `cy.happoHideDynamicElements`

The `cy.happoHideDynamicElements` function has been removed in the unified
`happo` package.

To achieve the same functionality, transition to using the `data-happo-hide`
attribute on elements you want to hide from screenshots. This can be done
directly in the code that renders the DOM nodes, or dynamically in your Cypress
tests. For example, you might add:

```js
cy.get('#some-dynamic-element').invoke('attr', 'data-happo-hide', 'true');
```

For more details, see [Hiding Content](/hiding-content.md).

#### Playwright Integration

The configuration changes for Playwright integration:

**Before (legacy):**

```js title=".happo.js"
const { RemoteBrowserTarget } = require('happo.io');

module.exports = {
  targets: {
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
    }),
  },
};
```

**After (new):**

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'playwright',
  },

  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
    },
  },
});
```

In your Playwright test files, update your imports to use the new package:

**Before (legacy):**

```js title="tests/test.spec.js"
import { test } from 'happo-playwright';
```

**After (new):**

```js title="tests/test.spec.js"
import { test } from 'happo/playwright';
```

The `happo-e2e` wrapper command is replaced by the main `happo` command. Replace
`npx happo-e2e -- npx playwright test` with `npx happo -- playwright test`.

#### Parallel Cypress and Playwright builds

If you split your Cypress or Playwright suite across multiple machines, the
`HAPPO_NONCE` environment variable and the `happo-e2e finalize` command are
replaced by the `--nonce` flag and the `happo finalize` command. Pass the same
nonce to every parallel run and to the finalize step.

**Before (legacy):**

```bash
# On each parallel machine
HAPPO_NONCE=${CIRCLE_WORKFLOW_ID} npx happo-e2e -- npx cypress run

# After all parallel runs are done
HAPPO_NONCE=${CIRCLE_WORKFLOW_ID} npx happo-e2e finalize
```

**After (new):**

```bash
# On each parallel machine
npx happo --nonce ${CIRCLE_WORKFLOW_ID} -- cypress run

# After all parallel runs are done
npx happo finalize --nonce ${CIRCLE_WORKFLOW_ID}
```

See [Finalize command](cli.mdx#finalize-command) for more details.

#### Pages Integration

The top-level `pages` option has moved into a `pages` integration:

**Before (legacy):**

```js title=".happo.js"
module.exports = {
  pages: [{ url: 'https://example.com/', title: 'Home' }],

  // ... rest of config
};
```

**After (new):**

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'pages',
    pages: [{ url: 'https://example.com/', title: 'Home' }],
  },

  // ... rest of config
});
```

See [`integration.pages`](configuration.md#integrationpages) for the full list
of page options.

#### Happo Examples Integration

The Happo examples integration has been removed in favor of the custom
integration type (originally in the `happo-static` package).

This puts the bundling and rendering of the examples to the DOM completely in
your control. If you are using the legacy Happo examples integration, you will
need to convert these to a Happo custom type. Follow the
[Happo Custom integration documentation](custom.mdx).

### Removed Configuration Options

These options were only used by the Happo Examples integration, and have been
removed:

- `type`
- `include`
- `exclude`
- `stylesheets`
- `publicFolders`
- `setupScript`
- `cleanupScript`
- `customizeWebpackConfig`
- `prerender`
- `renderWrapperModule`
- `rootElementSelector`
- `tmpdir`
- `jsdomOptions`
- `asyncTimeout`

These options have moved:

- `plugins` -- use `integration` instead (see
  [Storybook Integration](#storybook-integration))
- `generateStaticPackage` -- use `integration: { type: 'custom' }` instead (see
  [Custom Bundle Integration](#custom-bundle-integration))
- `pages` -- use `integration: { type: 'pages' }` instead (see
  [Pages Integration](#pages-integration))
- `compareThreshold` -- use `deepCompare.compareThreshold` instead (see
  [Compare Threshold](#compare-threshold))

### Wait Timeouts Now Fail by Default

Starting in happo v6.12.0, a `waitForContent`, `waitForSelector`, or `waitFor`
that times out before the expected content, selector, or condition appears will
fail the snap. In the legacy packages, a timeout only emitted a warning in the
worker logs and the screenshot was taken anyway.

If a run starts failing after migrating because of this, update the offending
`waitForContent` / `waitForSelector` / `waitFor` so it matches what actually
renders — this is almost always the right fix, since it also removes the
multi-second wait that was running on every snap. As a temporary escape hatch,
set [`failOnWaitForTimeout: false`](configuration.md#failonwaitfortimeout) in
your `happo.config.{js,ts,...}` to restore the legacy warn-and-screenshot
behavior while you investigate.

### Environment Variables

The following environment variables have been removed and are no longer
necessary:

- `BASE_BRANCH` and `HAPPO_BASE_BRANCH` -- use `--baseBranch` instead
- `CHANGE_URL` and `HAPPO_CHANGE_URL` -- use `--link` instead
- `CURRENT_SHA` -- use `--afterSha` instead
- `HAPPO_BEFORE_SHA_TAG_MATCHER` -- use `--beforeShaTagMatcher` instead
- `HAPPO_BUILD_STORYBOOK_COMMAND` -- this is no longer used
- `HAPPO_DELETE_OLD_COMMENTS` -- this is now the behavior and the env var is no
  longer used
- `HAPPO_DOWNLOAD_ALL` -- use `integration.downloadAllAssets` in your config
  file instead
- `HAPPO_ENABLED` -- this is no longer used. Happo runs when Cypress is wrapped
  by the `happo` command.
- `HAPPO_FALLBACK_SHAS_COUNT` -- use `--fallbackShasCount` instead
- `HAPPO_FALLBACK_SHAS` -- use `--fallbackShas` instead
- `HAPPO_GITHUB_BASE` and `GITHUB_BASE` -- this is no longer used
- `HAPPO_GITHUB_TOKEN` -- use `--githubToken` instead
- `HAPPO_GITHUB_USER_CREDENTIALS` -- use `--githubToken` instead
- `HAPPO_IS_ASYNC` -- async mode is now the only mode (see
  [Baselines must come from your default branch](#baselines-must-come-from-your-default-branch))
- `HAPPO_MESSAGE` -- use `--message` instead
- `HAPPO_NONCE` -- use `--nonce` instead
- `HAPPO_NOTIFY` -- use `--notify` instead
- `HAPPO_SIGNED_URL` -- we use signed upload URLs by default now
- `INSTALL_CMD` -- this is no longer used, since sync mode has been removed
- `PREVIOUS_SHA` -- use `--beforeSha` instead
- `VERBOSE` -- this is no longer used

These environment variables are still supported:

- `HAPPO_API_KEY` and `HAPPO_API_SECRET` -- used when `apiKey` and `apiSecret`
  are not set in the config file
- `HAPPO_CONFIG_FILE` -- path to your config file (same as `--config`)

## Migration Steps

1. **Update Node.js**: Ensure you're running Node.js 22.18.0 or later, both
   locally and in CI
1. **Remove legacy packages**: Uninstall all legacy Happo packages (`happo.io`,
   `happo-cypress`, `happo-playwright`, `happo-e2e`, `happo-plugin-storybook`,
   `happo-static`)
1. **Install new package**: Install the unified `happo` package and add a
   `"happo": "happo"` script to `package.json`
1. **Update configuration file**: Convert your `.happo.js` to a
   `happo.config.{js,ts,...}` file:
   - Remove `RemoteBrowserTarget` imports/usage
   - Convert targets to plain objects with `type`
   - Decide whether to keep or override the
     [changed target defaults](#changed-target-defaults)
   - Move `compareThreshold` into `deepCompare`
   - Remove [options that no longer exist](#removed-configuration-options)
   - Optionally convert to TypeScript (`happo.config.ts`)
1. **Update integration configs**: Add an `integration` field. This is required
   for Cypress, Playwright, custom, and pages integrations.
1. **Update imports**: Update any imports from legacy packages (e.g.,
   `happo-cypress` → `happo/cypress`, `happo-playwright` → `happo/playwright`,
   `happo-plugin-storybook/*` → `happo/storybook/*`)
1. **Update CLI commands**: Replace `happo run`, `happo-ci*` and `happo-e2e`
   commands with `happo`. Replace `happo-e2e finalize` with `happo finalize`.
1. **Update environment variables**: Replace removed env vars with the
   corresponding CLI flags or config options
1. **Check your CI triggers**: Make sure Happo runs on pushes to your default
   branch, so pull requests have a baseline to compare against
1. **Test your setup**: Run your Happo tests to ensure everything works. Expect
   some diffs on the first run from the changed target defaults.

## Troubleshooting

### "Cannot find module 'happo.io'" or "Cannot find module 'happo-cypress'"

This error occurs if you haven't updated your dependencies. Make sure to:

1. Remove all legacy Happo packages from `package.json` (`happo.io`,
   `happo-cypress`, `happo-playwright`, `happo-e2e`, `happo-plugin-storybook`,
   `happo-static`)
2. Add `happo` to `package.json`
3. Run `npm install` (or `pnpm install` / `yarn install`)
4. Update any imports in your code to use the new package exports (e.g.,
   `happo-cypress` → `happo/cypress`)

### "RemoteBrowserTarget is not defined"

This error occurs if you're still using the old target syntax. Convert all
`new RemoteBrowserTarget(...)` to plain objects with `type`.

### "using an extension that is not supported by this version of Node.js"

Your Node.js version is too old to load a TypeScript config file. Upgrade to
Node.js 22.18.0 or later. You can check your version with:

```bash
node --version
```

### Configuration file not found

The new package no longer reads `.happo.js`. It looks for configuration files
named `happo.config.{ext}` in this order:

1. `.js`
1. `.mjs`
1. `.cjs`
1. `.ts`
1. `.mts`
1. `.cts`

Make sure your configuration file matches one of these names. If your config
file lives somewhere else or has a different name, point to it with the
`--config` flag or the `HAPPO_CONFIG_FILE` environment variable:

```bash
npx happo --config path/to/happo.config.ts
```

### Pull requests have no baseline to compare against

The new CLI doesn't build baselines on the fly. Make sure Happo runs on every
push to your default branch, and that `--baseBranch` points to that branch if it
isn't `origin/main`. See
[Baselines must come from your default branch](#baselines-must-come-from-your-default-branch).

### New diffs after migrating

If screenshots changed even though your UI didn't, check the
[changed target defaults](#changed-target-defaults). Animations, reduced-motion
styles, and hover states are the most common causes.

## New Features Worth Exploring

Once you have migrated, these features are available in the new package:

- [`--skip`](cli.mdx#--skip-json) and [`--only`](cli.mdx#--only-json) for
  partial runs
- [`happo flake`](cli.mdx#flake-command) to list reported flakes
- [`integration.autoApplyPseudoStateAttributes`](configuration.md#integrationautoapplypseudostateattributes)
  to capture hover, active, and focus states from Cypress and Playwright tests
- `estimatedSnapsCount` in the
  [custom integration](configuration.md#integrationbuild) for automatic chunking

## Need Help?

If you encounter issues during migration, please reach out to
[support@happo.io](mailto:support@happo.io)
