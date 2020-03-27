---
id: full-page
title: Full-page
---

The full-page integration helps you get screenshots of an existing website.

## Installation

No other libraries than `happo.io` need to be installed for a full-page integration:

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

_Note: The urls to the website need to be publicly available, otherwise Happo
workers won't be able to access the pages_

Add a `happo` script to your `package.json` file:

```json
{
  "scripts": {
    "happo": "happo"
  }
}
```

## Running

Invoke `npm run happo run` to execute the `pages` test suite.
