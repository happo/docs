---
id: plugins
title: Plugins
---

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

The Happo "scrape" plugin will make it possible to grab Happo examples from an
existing website. See https://github.com/happo/happo-plugin-scrape. Make sure
to also check out the built-in [full-page support](#full-page-support).

## Storybook

The Happo plugin for [Storybook](https://storybook.js.org/) will automatically
turn your stories into Happo examples. See https://github.com/happo/happo-plugin-storybook.

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

## Gatsby

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

## Puppeteer

If you have Happo examples that rely on measuring the DOM, the default
pre-renderer (JSDOM) might not produce the results you need. By using a real
browser (Chrome) to pre-render examples, measurements are available on render
time. See https://github.com/happo/happo-plugin-puppeteer.

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

