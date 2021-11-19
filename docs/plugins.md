---
id: plugins
title: Plugins
---

Plugins are configured through [the `plugins` configuration option](configuration.md#plugins). The following is a list of officially supported plugins.

## Storybook

The Happo plugin for [Storybook](https://storybook.js.org/) will automatically
turn your stories into Happo examples. See the [Storybook integration
page](storybook.md) for a full introduction.

```bash
npm install --save-dev happo-plugin-storybook
```

```js
const happoPluginStorybook = require('happo-plugin-storybook');

// .happo.js
module.exports {
  // ...
  plugins: [
    happoPluginStorybook(),
  ],
};
```

## Puppeteer

> The puppeteer plugin is deprecated. Use [`prerender: false`](configuration.md#prerender) in your config instead.

If you have Happo examples that rely on measuring the DOM, the default
pre-renderer (JSDOM) might not produce the results you need. By using a real
browser (Chrome) to pre-render examples, measurements are available on render
time.

```bash
npm install --save-dev happo-plugin-puppeteer
```

```js
const happoPluginPuppeteer = require('happo-plugin-puppeteer');

// .happo.js
module.exports {
  // ...
  plugins: [
    happoPluginPuppeteer(),
  ],
};
```

## TypeScript

The Happo plugin for TypeScript will inject the necessary webpack configuration
to make Happo process TypeScript files correctly. See
https://github.com/happo/happo-plugin-typescript.

```bash
npm install --save-dev happo-plugin-typescript
```

```js
const happoPluginTypescript = require('happo-plugin-typescript');

// .happo.js
module.exports {
  // ...
  plugins: [
    happoPluginTypescript(),
  ],
};
```

## Scraping

> The scrape plugin is deprecated. Use [the Cypress integration](cypress.md) instead.

The Happo "scrape" plugin will make it possible to grab Happo examples from an
existing website. See https://github.com/happo/happo-plugin-scrape. Make sure
to also check out the built-in [full-page support](#full-page-support).

## Gatsby

> The Gatsby plugin is not under active development. Try using [the Cypress
> integration](cypress.md) instead.

The Happo plugin for [Gatsby](https://www.gatsbyjs.org/) turns all your
static pages into Happo tests. See https://github.com/happo/happo-plugin-gatsby.

```bash
npm install --save-dev happo-plugin-gatsby
```

```js
const happoPluginGatsby = require('happo-plugin-gatsby');

// .happo.js
module.exports {
  // ...
  plugins: [
    happoPluginGatsby(),
  ],
  type: 'plain',
};
```
