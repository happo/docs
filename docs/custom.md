---
id: custom
title: Custom Integration
---

By providing your own JavaScript bundle you can create a custom Happo
integration that you have full control over.

## Installation

First, install the `happo` npm library.

```sh
npm install --save-dev happo
```

## Configuration

Then, create or modify `happo.config.ts` and add an `integration` field. Point
it to the root of a custom built package folder. In our example, we're using
`./tmp/happo-custom`.

```js title="happo.config.ts"
import { defineConfig } from 'happo';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,

  integration: {
    type: 'custom',
    build: async () => ({
      rootDir: './tmp/happo-custom',
      entryPoint: 'bundle.js',
    }),
  },
});
```

The configuration above assumes a pre-built folder. You can also generate the
package on the fly here, something like:

```js title="happo.config.ts"
import { defineConfig } from 'happo';
import buildCustomPackage from './buildCustomPackage';

export default defineConfig({
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,

  integration: {
    type: 'custom',
    build: async () => {
      await buildCustomPackage();

      return {
        rootDir: './tmp/happo-custom',
        entryPoint: 'bundle.js',
      };
    },
  },
});
```

## Prepare JavaScript bundle

The `happo/custom` library has two methods you should use when creating your
JavaScript bundle:

### `happoCustom.init()`

Call this method once in your bundle. This will prep the bundle for usage on
Happo workers. It doesn't matter when you call `init` (can be first, last or in
between).

### `happoCustom.registerExample()`

Call this method to register your Happo examples. Takes an object with the
following structure:

- `component` - (string) name of the component
- `variant` - (string) name of the component variant
- `render` - (async function) render things into the document here
- `waitForContent` - (string, optional) wait for content to be present

Here's a full example:

```js title="main.js"
import happoCustom from 'happo/custom';

happoCustom.init();

happoCustom.registerExample({
  component: 'Hello',
  variant: 'red',
  render: () => {
    document.body.innerHTML = '<div style="background-color:red">Hello</div>';
  },
});

happoCustom.registerExample({
  component: 'Hello',
  variant: 'blue',
  render: () => {
    document.body.innerHTML = '<div style="background-color:blue">Hello</div>';
  },
});
```

#### Waiting for content

In some cases, examples might not be ready by the time Happo takes the
screenshot. Although adding a delay could help, it will only work well if the
asynchronous event is consistently timed. In these cases the `waitForContent`
parameter might help.

Let's assume that we have an example that needs to fetch some external data. In
order to wait for the data to finish loading, we can add a `waitForContent`
parameter with some unique string from the loaded state:

```js title="main.js"
happoCustom.registerExample({
  component: 'Description',
  variant: 'loaded',
  render: async () => {
    document.body.innerHTML = '<div id="description">Loading...</div>';
    const data = await fetch('http://example.com/api/data');
    document.querySelector('#description').innerHTML =
      `<p>Description: ${data.description}</p>`;
  },
  waitForContent: 'Description:',
});
```

## Optional: Create an HTML document

By default, Happo will create an HTML document that it will render your custom
examples into. This document includes basic defaults such as setting `lang="en"`
on the `<html>` element, setting the charset to `utf-8`, adding a `dir="ltr"`
attribute, and a meta viewport tag.

If you want to use a custom HTML document to render your examples into, you can
create a file named `iframe.html` in the root of your built custom package
directory. This document must include a `script` tag that loads the built entry
point to your custom bundle. For example:

```html title="tmp/happo-custom/iframe.html"
<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <title>Happo</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="/bundle.js"></script>
  </head>
  <body></body>
</html>
```

`/bundle.js` is the path to your JavaScript bundle. You can assume that the
custom package folder is the root, so in our case, `/bundle.js` would refer to
`./tmp/happo-custom/bundle.js`.

## Running happo

Once you have everything set up, you can invoke the `happo` command via the
command line.

```sh
npx happo
```

## Testing locally

If you serve the custom folder (`./tmp/happo-custom` in our case) through an
HTTP server, you can open up `iframe.html` and test the integration straight in
your browser. You can use the
[`http-server` package](https://www.npmjs.com/package/http-server) for that:

```sh
npx http-server ./tmp/happo-custom
```

Once the server is up and running, open `http://localhost:8080/iframe.html` in a
browser window. Then, in the JavaScript console of the page (e.g. through Chrome
DevTools), call the following function:

```js
window.happo.nextExample();
```

This should render the first example. Repeat calling this method until you've
rendered all your examples.

## Continuous integration

To integrate a Custom bundle integration with CI, follow the instructions on the
[Continuous Integration page](continuous-integration.md).
