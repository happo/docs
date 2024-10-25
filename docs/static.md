---
id: static
title: Static bundle
---

By providing your own JavaScript bundle you can create a custom Happo
integration that you have full control over.

## Installation

First, install the `happo-static` and `happo.io` npm libraries.

```sh
npm install --save-dev happo-static happo.io
```

## Configuration

Then, create or modify `.happo.js` and add a `generateStaticPackage` property.
Point it to the root of a static folder. In our example, we're using `./static`.

```js
// .happo.js
module.exports = {
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,
  generateStaticPackage: () => ({ path: './static' }),
};
```

The configuration above assumes a pre-built static folder. You can also generate
the package on the fly here, something like

```js
// .happo.js
const makeStaticPackage = require('./makeStaticPackage');

module.exports = {
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,
  generateStaticPackage: async () => {
    const pathToStaticFolder = await makeStaticPackage();
    return { path: pathToStaticFolder };
  },
};
```

## Prepare javascript bundle

The `happo-static` library has two methods you should use when creating your
javascript bundle:

### `happoStatic.init()`

Call this method once in your bundle. This will prep the bundle for usage on
Happo workers. It doesn't matter when you call init (can be first, last or in
between).

### `happoStatic.registerExample()`

Call this method to register your Happo examples. Takes an object with the
following structure:

- `component` - (string) name of the component
- `variant` - (string) name of the component variant
- `render` - (async function) render things into the document here

Here's a full example:

```js
// main.js

const happoStatic = require('happo-static');

happoStatic.init();

happoStatic.registerExample({
  component: 'Hello',
  variant: 'red',
  render: () => {
    document.body.innerHTML = '<div style="background-color:red">Hello</div>';
  },
});

happoStatic.registerExample({
  component: 'Hello',
  variant: 'blue',
  render: () => {
    document.body.innerHTML = '<div style="background-color:blue">Hello</div>';
  },
});
```

## Create an iframe.html file

Once you have your bundle, you need a minimal html file to serve the bundle to
Happo's workers. Save this file as `static/iframe.html` (replace "static" with
the name of your static folder):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="/bundle.js"></script>
  </head>
  <body></body>
</html>
```

`/bundle.js` is the path to your javascript bundle. You can assume that the
static folder is the root, so in our case, `/bundle.js` would refer to
`./static/bundle.js`.

## Running happo

Once you have everything set up, you can invoke the `happo run` command via the
command line.

```sh
npx happo run
```

## Testing locally

If you serve the static folder (`./static` in our case) through an http server,
you can open up iframe.html and test the integration straight in your browser.
You can use http-server for that:

```sh
npx http-server ./static
```

Once the server is up and running, open `http://localhost:8080/iframe.html` in a
browser window. Then, in the javascript console of the page (e.g. through Chrome
DevTools), call the following function:

```js
window.happo.nextExample();
```

This should render the first example. Repeat calling this method until you've
rendered all your examples.

## Continuous integration

To integrate a Static bundle integration with CI, follow the instructions on the
[Continuous Integration page](continuous-integration.md).
