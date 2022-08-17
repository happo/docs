---
id: full-page
title: Full-page
---

The full-page integration helps you get screenshots of an existing website.

## Installation

No other libraries than `happo.io` need to be installed for a full-page
integration:

```sh
npm install --save-dev happo.io
```

## Configuration

Add a `pages` option to your `.happo.js` config file:

```js
// .happo.js
module.exports = {
  // other config...
  pages: [
    { url: 'https://www.google.com/', title: 'Google' },
    { url: 'https://www.airbnb.com/', title: 'Airbnb' },
  ],
};
```

> The urls to the website need to be publicly available, otherwise Happo workers
> won't be able to access the pages

Add a `happo` script to your `package.json` file:

```json
{
  "scripts": {
    "happo": "happo"
  }
}
```

## Running

Invoke `npm run happo run` to execute the `pages` test suite. To run in CI,
follow [the Continuous Integration guide](continuous-integration.md).

## Options

Each item in the `pages` array can the following optional attributes in addition
to `url` and `title`:

### `waitForContent`

If present, Happo will wait for content to appear on the page before taking the
screenshot. E.g.

```js
module.exports = {
  pages: [
    {
      url: 'https://twitter.com/',
      title: 'Twitter',
      waitForContent: 'Sign up with phone',
    },
  ],
};
```

Happo will wait at most 10 seconds for the content to appear before it takes the
screenshot.

