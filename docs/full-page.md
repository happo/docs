---
id: full-page
title: Full-page
---

The full-page integration helps you get screenshots of an existing website.

## Installation

No other libraries than `happo` need to be installed for a full-page
integration:

```sh
npm install --save-dev happo
```

## Configuration

Use the `pages` integration in your `happo.config.ts` config file:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,

  integration: {
    type: 'pages',
    pages: [
      { url: 'https://www.google.com/', title: 'Google' },
      { url: 'https://www.airbnb.com/', title: 'Airbnb' },
    ],
  },

  // ... other configuration
});
```

> The urls to the website need to be publicly available, otherwise Happo workers
> won't be able to access the pages

## Running

Invoke `npx happo` to execute the `pages` test suite. To run in CI, follow
[the Continuous Integration guide](continuous-integration.md).

## Options

Each item in the `pages` array can have the following optional attributes in
addition to `url` and `title`:

### `waitForContent`

If present, Happo will wait for content to appear on the page before taking the
screenshot. Fox example:

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,

  integration: {
    type: 'pages',
    pages: [
      {
        url: 'https://supporters.eff.org',
        title: 'EFF Donation'
        waitForContent: 'Donation',
      },
    ],
  },

  // ... other configuration
});
```

Happo will wait at most 10 seconds for the content to appear before it takes the
screenshot.
