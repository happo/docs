---
id: configuration
title: Configuration
sidebar_label: List of options
---

Happo looks for configuration in a `happo.config.{js,ts,mjs,cjs,mts,cts}` file
in your current working directory. You can override this path using the
`--config` CLI option or the `HAPPO_CONFIG_FILE` environment variable. The
config file can use CommonJS or ES modules syntax. The configuration file can
export either an object containing configuration options or an (async) function
that resolves to configuration options.

## `apiKey` and `apiSecret`

These tokens authenticate you with happo.io. **Never store these tokens in plain
text.** Use environment variables instead.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,
});
```

## `targets`

Specify the browsers you want to include in your happo run. For example:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    // The first part ('firefox-desktop' in this case) is a name you give
    // to the specific browser target. You'll see this name in the reports
    // generated during a happo run.
    'firefox-desktop': {
      type: 'firefox',
      viewport: '1024x768',
    },

    'firefox-mobile': {
      type: 'firefox',
      viewport: '320x640',
    },

    chrome: {
      type: 'chrome',
      viewport: '800x600',
    },

    edge: {
      type: 'edge',
      viewport: '800x600',
    },

    accessibility: {
      type: 'accessibility',
      viewport: '1024x768',
    },
  },
});
```

Viewport sizes can range from `300x300` to `2000x2000`. The `ios-safari` target
type runs on an iPhone with a fixed viewport of `375x667`. The `ipad-safari`
target type is always `1080x810`.

Supported types:

- `firefox`
- `chrome`
- `edge`
- `safari`
- `ios-safari` (runs on iPhone 7)
- `ipad-safari` (runs on iPad)
- `accessibility`

### Target `freezeAnimations`

By default, Happo freezes CSS animations on the last frame. To freeze animations
on the first frame instead (legacy behavior), use the `freezeAnimations` option:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    ie: {
      type: 'edge',
      viewport: '1024x768',
      freezeAnimations: 'first-frame',
    },
  },
});
```

### Target `chunks`

Targets run in parallel by default. To split a specific target into multiple
chunks (running in parallel), use the `chunks` option:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      chunks: 2,
    },
  },
});
```

Happo.io attempts to run chunks in parallel, but there's no guarantee. The
`chunks` option adds some overhead, so if your test suite isn't large, using
more than one chunk might actually slow things down.

### Target `maxHeight`

Use `maxHeight` to override the default maximum height used by Happo workers
(5000 pixels). This is useful when taking screenshots of tall components or
pages. For example:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      maxHeight: 10000,
    },
  },
});
```

**Note:** The maximum width defaults to the maximum height, so if you set
`maxHeight`, you may also want to set `maxWidth` at the same time.

### Target `maxWidth`

Use `maxWidth` to override the default maximum width used by Happo workers
(defaults to `maxHeight`, which defaults to 5000 pixels). This is useful when
taking screenshots of wide components or pages. For example:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      maxWidth: 10000,
    },
  },
});
```

### Target `hideBehavior`

This option controls how Happo handles elements with the `data-happo-hide`
attribute. By default, elements with this attribute are made invisible. Use the
value `ignore` to make the content appear in screenshots but exclude it from
comparison.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    safari: {
      type: 'safari',
      viewport: '1024x768',
      hideBehavior: 'ignore',
    },
  },
});
```

### Target `useFullPageFallbackForTallScreenshots`

This option applies to Chrome and Firefox only.

When Chrome and Firefox workers take screenshots of pages taller than 4000
pixels, they apply a workaround that briefly resizes the viewport so all content
fits inside it. Without this workaround, content below the viewport's bottom
edge can disappear inconsistently. However, this workaround can cause other
issues, especially when using the `vh` CSS unit. A page with an element of
`height: 100vh` will take up the entire screenshot when the viewport-altering
fallback is active. To disable this workaround completely, set
`useFullPageFallbackForTallScreenshots: false`.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      useFullPageFallbackForTallScreenshots: false,
    },
    firefox: {
      type: 'firefox',
      viewport: '1024x768',
      useFullPageFallbackForTallScreenshots: false,
    },
  },
});
```

### Target `applyPseudoClasses`

When set to `true`, this option allows you to add `data-happo-hover`,
`data-happo-focus`, and `data-happo-active` attributes to your DOM elements and
have Happo apply the corresponding `:hover`, `:focus`, or `:active` styles. For
example, if you have this markup:

```html
<button>Hover me</button>
<style>
  button:hover {
    background-color: blue;
  }
</style>
```

To apply the hover style before taking the screenshot (making the button blue),
change the markup to:

```html
<button data-happo-hover>Hover me</button>
<style>
  button:hover {
    background-color: blue;
  }
</style>
```

Similarly, you can add focus to elements using `data-happo-focus`:

```html
<input type="text" data-happo-focus />
```

And add `data-happo-active` to elements to simulate the `:active` state:

```html
<button data-happo-active>Click me</button>
<style>
  button:active {
    background-color: red;
  }
</style>
```

### Target `prefersColorScheme`

Set `prefersColorScheme: 'dark'` or `prefersColorScheme: 'light'` to set the
color scheme preference in the browser.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      prefersColorScheme: 'dark',
    },
  },
});
```

When enabled, styles affected by the color scheme will be activated:

```css
background: white;
color: black;

@media (prefers-color-scheme: dark) {
  background: black;
  color: white;
}
```

### Target `prefersReducedMotion`

By default, Happo is configured to prefer reduced motion. Set this option to
`false` to disable this behavior.

**Note:** This option has no effect in iOS Safari.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      prefersReducedMotion: false,
    },
  },
});
```

When `true` (default behavior), media queries that use
`prefers-reduced-motion: reduce` will be activated:

```css
@media (prefers-reduced-motion: reduce) {
  button {
    animation: none;
  }
}
```

### Target `allowPointerEvents`

By default, Happo injects this CSS to prevent spurious hover effects caused by
the system mouse pointer:

```css
* {
  pointer-events: none !important;
}
```

If you rely on mouse interaction in your tests (e.g., when using
[Storybook interactive stories](storybook.md#overriding-the-default-render-timeout)),
you might see an error like this in your logs:

> Error: Unable to perform pointer interaction as the element has
> `pointer-events: none`

In some cases, this error prevents the variant from being included in the
report.

To resolve this, tell Happo to skip injecting the `pointer-events: none` CSS
block using the `allowPointerEvents` option:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      allowPointerEvents: true,
    },
  },
});
```

If you're interested in testing hover, focus, and active states with Happo, you
may also want to use the
[`applyPseudoClasses` option](#target-applypseudoclasses).

### Target `outgoingRequestHeaders`

Add additional headers to outgoing requests from the browser. This is useful if
you need to tell a CDN or other service that the request originates from a Happo
run, or if you need to pass authentication headers.

**Note:** This option only applies to desktop browsers (Chrome, Firefox, Edge,
Safari, and accessibility).

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      type: 'chrome',
      viewport: '1024x768',
      outgoingRequestHeaders: [
        { name: 'X-Happo-Run', value: 'true' },
        { name: 'Authorization', value: 'Bearer token123' },
      ],
    },
  },
});
```

## `project`

If you have multiple projects configured for your happo.io account, specify the
name of the project you want to associate with. If left empty, the default
project will be used.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  project: 'my-project-name',
  // ... rest of config
});
```

## `integration`

Specify the type of integration you're using with Happo. The integration type
determines how Happo discovers and renders your components.

### `integration.type`

The type of integration. Supported values:

- `'storybook'` - For Storybook integrations
- `'cypress'` - For Cypress E2E test integrations
- `'playwright'` - For Playwright E2E test integrations
- `'custom'` - For custom bundle integrations
- `'pages'` - For full-page screenshot integrations

Each integration has a different set of options that it supports.

### Storybook Integration Options

#### `integration.configDir`

The directory containing your Storybook configuration. Defaults to `.storybook`.

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

#### `integration.staticDir`

The directory containing static files to serve with Storybook. This corresponds
to the `staticDirs` option in your Storybook configuration.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'storybook',
    staticDir: './public',
  },

  // ... rest of config
});
```

#### `integration.outputDir`

The directory to output the static Storybook package to. This is useful when
using `usePrebuiltPackage` to specify where your prebuilt Storybook files are
located.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'storybook',
    outputDir: './storybook-static',
  },

  // ... rest of config
});
```

#### `integration.usePrebuiltPackage`

When set to `true`, Happo will use a prebuilt Storybook package instead of
building one. Make sure that files are built to the `outputDir` directory when
using this option.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'storybook',
    usePrebuiltPackage: true,
    outputDir: './storybook-static',
  },

  // ... rest of config
});
```

#### `integration.skip`

Items to skip when generating snapshots. Can be an async function that resolves
to an array of `{component, variant}`, or an array of `{component, variant}`.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'storybook',
    skip: [
      { component: 'Button', variant: 'disabled' },
      { component: 'Modal', variant: 'large' },
    ],
  },

  // ... rest of config
});
```

Or as an async function:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'storybook',
    skip: async () => {
      // Dynamically determine which items to skip
      return [{ component: 'Button', variant: 'disabled' }];
    },
  },

  // ... rest of config
});
```

### Custom Integration Options

#### `integration.build`

An async function that builds your custom bundle and returns an object with
`rootDir` (path to the folder where files have been built) and `entryPoint`
(local file name of the built JavaScript bundle).

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

### Cypress and Playwright Integration Options

#### `integration.allowFailures`

When set to `true`, allows Happo tests to fail without causing the overall test
run to fail. This is useful when you want to collect visual diffs without
blocking your CI pipeline.

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

### Pages Integration Options

#### `integration.pages`

A list of pages to screenshot. Each page object must include a `url` (the URL of
the page to screenshot) and a `title` (used as the "component" identifier in
Happo reports, so ensure it is unique for each page).

Optionally, you can specify `waitForContent` to wait for specific content to
appear on the page before taking the screenshot, or `waitForSelector` to wait
for a selector to appear in the document before taking the screenshot.

**Note:** The URLs to the website need to be publicly available, otherwise Happo
workers won't be able to access the pages.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  integration: {
    type: 'pages',
    pages: [
      {
        url: 'https://example.com/home',
        title: 'Home Page',
      },
      {
        url: 'https://example.com/about',
        title: 'About Page',
        waitForContent: 'About Us',
      },
      {
        url: 'https://example.com/products',
        title: 'Products Page',
        waitForSelector: '.product-list',
      },
    ],
  },

  // ... rest of config
});
```

## `endpoint`

The endpoint to use for the Happo run (this is used for on-premise Happo).
Defaults to `https://happo.io`.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  endpoint: 'https://happo.my-company.com',
  // ... rest of config
});
```

## `githubApiUrl`

Used when you have the CI script configured to
[post Happo statuses as comments](continuous-integration#posting-statuses-without-installing-the-happo-github-app).
The default is `https://api.github.com`. If you're using GitHub Enterprise,
enter the URL to your local GitHub API here, such as
`https://ghe.mycompany.zone/api/v3` (the default for GHE installation is for the
API to be located at `/api/v3`).
