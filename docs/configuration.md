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

```js
import { defineConfig } from 'happo';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,
});
```

## `targets`

Specify the browsers you want to include in your happo run. For example:

```js
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    // The first part ('firefox-desktop' in this case) is a name you give
    // to the specific browser target. You'll see this name in the reports
    // generated during a happo run.
    'firefox-desktop': {
      browserType: 'firefox',
      viewport: '1024x768',
    },
    'firefox-mobile': {
      browserType: 'firefox',
      viewport: '320x640',
    },
    chrome: {
      browserType: 'chrome',
      viewport: '800x600',
    },
    edge: {
      browserType: 'edge',
      viewport: '800x600',
    },
  },
});
```

Viewport sizes can range from `300x300` to `2000x2000` for Chrome and Firefox.
Edge and Safari must be between `400x400` and `1200x1200`. The `ios-safari`
target runs on an iPhone with a fixed viewport of `375x667`. The `ipad-safari`
target is always `1080x810`.

Supported browser targets:

- `firefox`
- `chrome`
- `edge`
- `safari`
- `ios-safari` (runs on iPhone 7)
- `ipad-safari` (runs on iPad)

### Target `freezeAnimations`

By default, Happo freezes CSS animations on the last frame. To freeze animations
on the first frame instead (legacy behavior), use the `freezeAnimations` option:

```js
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    ie: {
      browserType: 'edge',
      viewport: '1024x768',
      freezeAnimations: 'first-frame',
    },
  },
});
```

### Target `chunks`

Targets run in parallel by default. To split a specific target into multiple
chunks (running in parallel), use the `chunks` option:

```js
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      browserType: 'chrome',
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

```js
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      browserType: 'chrome',
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

```js
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      browserType: 'chrome',
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

```js
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    safari: {
      browserType: 'safari',
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

```js
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      browserType: 'chrome',
      viewport: '1024x768',
      useFullPageFallbackForTallScreenshots: false,
    },
    firefox: {
      browserType: 'firefox',
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

```js
// happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      browserType: 'chrome',
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

Set `prefersReducedMotion: true` to make the browser prefer reduced motion when
rendering the UI. **Note:** This option has no effect in iOS Safari.

```js
// happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      browserType: 'chrome',
      viewport: '1024x768',
      prefersReducedMotion: true,
    },
  },
});
```

When enabled, media queries that use `prefers-reduced-motion: reduce` will be
activated:

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

```js
// happo.config.ts
import { defineConfig } from 'happo';

export default defineConfig({
  targets: {
    chrome: {
      browserType: 'chrome',
      viewport: '1024x768',
      allowPointerEvents: true,
    },
  },
});
```

If you're interested in testing hover, focus, and active states with Happo, you
may also want to use the
[`applyPseudoClasses` option](#target-applypseudoclasses).

## `project`

If you have multiple projects configured for your happo.io account, specify the
name of the project you want to associate with. If left empty, the default
project will be used.

## `githubApiUrl`

Used when you have the CI script configured to
[post Happo statuses as comments](continuous-integration#posting-statuses-without-installing-the-happo-github-app).
The default is `https://api.github.com`. If you're using GitHub Enterprise,
enter the URL to your local GitHub API here, such as
`https://ghe.mycompany.zone/api/v3` (the default for GHE installation is for the
API to be located at `/api/v3`).
