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

## Breaking Changes

### Node.js Version Requirement

The new `happo` package requires **Node.js >= 22**. Ensure your environment
meets this requirement before migrating.

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

### Configuration File Format

The new package supports multiple configuration file formats and encourages
TypeScript/ES modules:

**Before (legacy):**

```js title=.happo.js
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

```js title=happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY!,
  apiSecret: process.env.HAPPO_API_SECRET!,

	project: 'default',

	integration: {
		type: 'storybook',
		configDir: '.storybook',
	},

  targets: {
    'chrome-desktop': {
      browserType: 'chrome',
      viewport: '1024x768',
    },
  },
});
```

### Target Configuration

One of the most significant changes is how targets are defined. The new package
uses plain objects instead of the `RemoteBrowserTarget` class.

**Before (legacy):**

```js title=.happo.js
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

```js title=happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  // ... rest of config

  targets: {
    'firefox-desktop': {
      browserType: 'firefox',
      viewport: '1024x768',
      chunks: 2,
      freezeAnimations: 'last-frame',
    },
    'chrome-mobile': {
      browserType: 'chrome',
      viewport: '375x667',
    },
    'ios-safari': {
      browserType: 'ios-safari',
    },
  },
});
```

**Key changes:**

- Remove `new RemoteBrowserTarget()` wrapper
- Use `browserType` instead of the first constructor argument
- All target options remain the same (viewport, chunks, freezeAnimations, etc.)
- Mobile Safari targets (`ios-safari`, `ipad-safari`) don't require a viewport
  (they use a fixed size)
- `freezeAnimations` now defaults to `'last-frame'`

### CLI Commands

The CLI command changes as well:

**Before (legacy):**

```bash
npx happo run
# or
npm run happo run
```

**After (new):**

```bash
npx happo
# or
npm run happo
```

The CLI is now provided by the `happo` package instead of `happo.io` and has a
simplified API.

### Integration Types

The new package uses an `integration` field in the configuration to specify the
type of integration.

#### Static Bundle Integration

**Before (legacy):**

```js title=.happo.js
const happoStatic = require('happo-static');

// ... static package generation code

module.exports = {
  generateStaticPackage: () => ({ path: './static' }),

  // ... rest of config
};
```

**After (new):**

```js title=happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'static',
    generateStaticPackage: async () => ({
      rootDir: './static',
      entryPoint: 'bundle.js',
    }),
  },

  // ... rest of config
});
```

**Note:** Remove any `happo-static` imports from your code. The new package
handles static bundle integration directly.

#### Storybook Integration

**Before (legacy):**

```js title=.happo.js
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

```js title=happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'storybook',
    configDir: '.storybook',
  },

  // ... rest of config
});
```

**Note:** Update any `happo-plugin-storybook` imports from your Storybook
configuration to instead import from the `happo` package.

##### Storybook preset

**Before (legacy):**

```js title=.storybook/main.js
export default {
  addons: ['happo-plugin-storybook/preset'],

  // ... rest of storybook config
};
```

**After (new):**

```js title=.storybook/main.js
export default {
  addons: ['happo/storybook/preset'],

  // ... rest of storybook config
};
```

##### Storybook decorator

**Before (legacy):**

```js title=.storybook/preview.js
import 'happo-plugin-storybook/register';
import happoDecorator from 'happo-plugin-storybook/decorator';
```

**After (new):**

```js title=.storybook/preview.js
import 'happo/storybook/register';
import happoDecorator from 'happo/storybook/decorator';
```

#### Cypress Integration

The configuration changes for Cypress integration:

**Before (legacy):**

```js title=.happo.js
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

```js title=happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'cypress',
  },

  targets: {
    chrome: {
      browserType: 'chrome',
      viewport: '1024x768',
    },
  },

  // ... rest of config
});
```

In your Cypress test files, update your imports to use the new package:

**Before (legacy):**

```js title=cypress/support/commands.js
import 'happo-cypress';
```

**After (new):**

```js title=cypress/support/commands.js
import 'happo/cypress';
```

And in your `cypress.config.js`, update the task import:

**Before (legacy):**

```js title=cypress.config.js
const happoTask = require('happo-cypress/task');
```

**After (new):**

```js title=cypress.config.js
const happoTask = require('happo/cypress/task');
```

#### Playwright Integration

The configuration changes for Playwright integration:

**Before (legacy):**

```js title=.happo.js
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

```js title=happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'playwright',
  },

  targets: {
    chrome: {
      browserType: 'chrome',
      viewport: '1024x768',
    },
  },
});
```

In your Playwright test files, update your imports to use the new package:

**Before (legacy):**

```js title=tests/test.spec.js
import { test } from 'happo-playwright';
```

**After (new):**

```js title=tests/test.spec.js
import { test } from 'happo/playwright';
```

#### Happo Examples Integration

The Happo examples integration has been removed in favor of the static
integration (originally in the `happo-static` package).

TODO: Provide migration advice for this

### E2E Command Changes

For Cypress and Playwright integrations, use the new `happo` CLI with the `e2e`
command:

**Before (legacy):**

```bash
npx happo-e2e -- npx cypress run
npx happo-e2e -- npx playwright test
```

**After (new):**

```bash
npx happo -- cypress run
npx happo -- playwright test
```

### Configuration Options

These options are removed:

- `stylesheets` - removed
- `publicFolders` - removed
- `setupScript` - removed
- `cleanupScript` - removed
- `include` - removed
- `exclude` - removed

Some target options changed:

- `freezeAnimations` - now defaults to `'last-frame'`

### Environment Variables

The following environment variables have been removed and are no longer
necessary:

- `HAPPO_IS_ASYNC`
- `HAPPO_SIGNED_URL`

## Migration Steps

1. **Update Node.js**: Ensure you're running Node.js >= 22
1. **Remove legacy packages**: Uninstall all legacy Happo packages (`happo.io`,
   `happo-cypress`, `happo-playwright`, `happo-e2e`, `happo-plugin-storybook`,
   `happo-static`)
1. **Install new package**: Install the unified `happo` package
1. **Update configuration file**: Convert your `.happo.js` to use the new
   format:
   - Remove `RemoteBrowserTarget` imports/usage
   - Convert targets to plain objects with `browserType`
   - Optionally convert to TypeScript (`happo.config.ts`)
1. **Update integration configs**: Add `integration` field
1. **Update imports**: Update any imports from legacy packages (e.g.,
   `happo-cypress` → `happo/cypress`, `happo-playwright` → `happo/playwright`)
1. **Update CLI commands**: Replace `happo-e2e` commands with `happo` for
   Cypress/Playwright integrations
1. **Update environment variables**: Remove unused env vars
1. **Test your setup**: Run your Happo tests to ensure everything works

## Example: Complete Migration

Here's a complete example of migrating a Storybook setup:

**Before (legacy):**

```js title=.happo.js
const path = require('path');
const { RemoteBrowserTarget } = require('happo.io');
const happoPluginStorybook = require('happo-plugin-storybook');

module.exports = {
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,

  project: 'default',

  targets: {
    'chrome-desktop': new RemoteBrowserTarget('chrome', {
      viewport: '1280x720',
      chunks: 2,
    }),
    'firefox-desktop': new RemoteBrowserTarget('firefox', {
      viewport: '1280x720',
    }),
    'ios-safari': new RemoteBrowserTarget('ios-safari', {
      viewport: '375x667',
    }),
  },

  plugins: [
    happoPluginStorybook({
      configDir: '.storybook',
    }),
  ],

  stylesheets: [path.resolve(__dirname, 'styles/global.css')],
};
```

**After (new):**

```ts title=happo.config.ts
import path from 'path';
import { defineConfig } from 'happo';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY!,
  apiSecret: process.env.HAPPO_API_SECRET!,

  project: 'default',

  integration: {
    type: 'storybook',
    configDir: '.storybook',
  },

  targets: {
    'chrome-desktop': {
      browserType: 'chrome',
      viewport: '1280x720',
      chunks: 2,
    },

    'firefox-desktop': {
      browserType: 'firefox',
      viewport: '1280x720',
    },

    'ios-safari': {
      browserType: 'ios-safari',
    },
  },
});
```

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
`new RemoteBrowserTarget(...)` to plain objects with `browserType`.

### "Node.js version mismatch"

Ensure you're running Node.js >= 22. You can check your version with:

```bash
node --version
```

### Configuration file not found

The new package looks for configuration files named `happo.config.{ext}` in this
order:

1. `.js`
1. `.mjs`
1. `.cjs`
1. `.ts`
1. `.mts`
1. `.cts`

Make sure your configuration file matches one of these names.

## Need Help?

If you encounter issues during migration, please reach out to
[support@happo.io](mailto:support@happo.io)
